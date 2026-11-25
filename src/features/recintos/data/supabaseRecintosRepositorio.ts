import type { SupabaseClient } from "@supabase/supabase-js";

import { ejecutarOnlineConTimeout } from "@/core/red/verificarConexionObligatoria";
import type { Database } from "@/core/supabase/database.types";
import type {
  CoordinadorRecinto,
  NuevoRecinto,
  OpcionesRecinto,
  Parroquia,
  Recinto,
} from "../domain/entidades/recinto";
import type { RecintosRepositorio } from "../domain/repositorios/recintosRepositorio";

type FilaRecinto = Database["public"]["Tables"]["recintos"]["Row"];
type FilaMesa = Database["public"]["Tables"]["mesas"]["Row"];
type FilaParroquia = Database["public"]["Tables"]["parroquias"]["Row"];
type FilaCanton = Database["public"]["Tables"]["cantones"]["Row"];
type FilaPerfil = Pick<
  Database["public"]["Tables"]["perfiles"]["Row"],
  "id" | "nombres" | "apellidos" | "cedula" | "correo"
>;
type FilaProgreso = Database["public"]["Views"]["vw_progreso_mesas"]["Row"];

function asegurarResultado<T>(
  data: T | null,
  error: { message: string } | null,
  mensaje: string,
): T {
  if (error) {
    throw new Error(`${mensaje} ${error.message}`);
  }
  if (data === null) {
    throw new Error(mensaje);
  }
  return data;
}

export class SupabaseRecintosRepositorio implements RecintosRepositorio {
  constructor(private readonly cliente: SupabaseClient<Database>) {}

  async listarPorProvincia(provinciaId: string): Promise<Recinto[]> {
    const { data: filasRecintos, error: errorRecintos } = await this.cliente
      .from("recintos")
      .select(
        "id, provincia_id, canton_id, parroquia_id, nombre, latitud, longitud, coordinador_id",
      )
      .eq("provincia_id", provinciaId)
      .order("nombre");
    const recintos = asegurarResultado(
      filasRecintos,
      errorRecintos,
      "No se pudieron cargar los recintos.",
    );

    if (recintos.length === 0) {
      return [];
    }

    const recintoIds = recintos.map((recinto) => recinto.id);
    const parroquiaIds = [...new Set(recintos.map((recinto) => recinto.parroquia_id))];
    const cantonIds = [...new Set(recintos.map((recinto) => recinto.canton_id))];
    const coordinadorIds = [
      ...new Set(
        recintos
          .map((recinto) => recinto.coordinador_id)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [
      { data: filasMesas, error: errorMesas },
      { data: filasParroquias, error: errorParroquias },
      { data: filasCantones, error: errorCantones },
      perfiles,
      { data: progreso, error: errorProgreso },
    ] = await Promise.all([
      this.cliente
        .from("mesas")
        .select("id, recinto_id, numero")
        .in("recinto_id", recintoIds)
        .order("numero"),
      this.cliente
        .from("parroquias")
        .select("id, nombre, canton_id, provincia_id")
        .in("id", parroquiaIds),
      this.cliente
        .from("cantones")
        .select("id, nombre, provincia_id")
        .in("id", cantonIds),
      this.obtenerPerfiles(coordinadorIds),
      this.cliente
        .from("vw_progreso_mesas")
        .select("recinto_id, acta_registrada, pendiente")
        .eq("provincia_id", provinciaId),
    ]);

    const mesas = asegurarResultado(
      filasMesas,
      errorMesas,
      "No se pudieron cargar las mesas.",
    ) as Pick<FilaMesa, "id" | "recinto_id" | "numero">[];
    const parroquias = asegurarResultado(
      filasParroquias,
      errorParroquias,
      "No se pudieron cargar las parroquias.",
    ) as Pick<FilaParroquia, "id" | "nombre" | "canton_id">[];
    const cantones = asegurarResultado(
      filasCantones,
      errorCantones,
      "No se pudieron cargar los cantones.",
    ) as Pick<FilaCanton, "id" | "nombre">[];
    const filasProgreso = asegurarResultado(
      progreso,
      errorProgreso,
      "No se pudo cargar el progreso de las mesas.",
    ) as Pick<FilaProgreso, "recinto_id" | "acta_registrada" | "pendiente">[];

    const mesasPorRecinto = new Map<string, Pick<FilaMesa, "id" | "numero">[]>();
    for (const mesa of mesas) {
      const lista = mesasPorRecinto.get(mesa.recinto_id) ?? [];
      lista.push({ id: mesa.id, numero: mesa.numero });
      mesasPorRecinto.set(mesa.recinto_id, lista);
    }

    const parroquiaPorId = new Map(parroquias.map((fila) => [fila.id, fila]));
    const cantonPorId = new Map(cantones.map((fila) => [fila.id, fila]));
    const coordinadorPorId = new Map(
      perfiles.map((perfil) => [perfil.id, perfil]),
    );
    const progresoPorRecinto = new Map<
      string,
      { actas_recibidas: number; actas_pendientes: number }
    >();

    for (const fila of filasProgreso) {
      if (!fila.recinto_id) {
        continue;
      }

      const actual = progresoPorRecinto.get(fila.recinto_id) ?? {
        actas_recibidas: 0,
        actas_pendientes: 0,
      };
      if (fila.acta_registrada) {
        actual.actas_recibidas += 1;
      }
      if (fila.pendiente) {
        actual.actas_pendientes += 1;
      }
      progresoPorRecinto.set(fila.recinto_id, actual);
    }

    return recintos.map((fila: Pick<FilaRecinto, "id" | "nombre" | "provincia_id" | "canton_id" | "parroquia_id" | "latitud" | "longitud" | "coordinador_id">) => {
      const parroquia = parroquiaPorId.get(fila.parroquia_id);
      const canton = cantonPorId.get(fila.canton_id);
      if (!parroquia || !canton) {
        throw new Error("Un recinto referencia una parroquia o cantón inexistente.");
      }
      const progresoRecinto = progresoPorRecinto.get(fila.id);
      const coordinador = fila.coordinador_id
        ? coordinadorPorId.get(fila.coordinador_id)
        : undefined;

      return {
        id: fila.id,
        nombre: fila.nombre,
        provincia_id: fila.provincia_id,
        canton_id: fila.canton_id,
        canton: canton.nombre,
        parroquia_id: fila.parroquia_id,
        parroquia: parroquia.nombre,
        latitud: fila.latitud,
        longitud: fila.longitud,
        mesas: mesasPorRecinto.get(fila.id) ?? [],
        coordinador: coordinador
          ? {
              id: coordinador.id,
              nombres: coordinador.nombres,
              apellidos: coordinador.apellidos,
            }
          : null,
        actas_recibidas: progresoRecinto?.actas_recibidas ?? 0,
        actas_pendientes: progresoRecinto?.actas_pendientes ?? 0,
      };
    });
  }

  async obtenerOpcionesFormulario(
    provinciaId: string,
  ): Promise<OpcionesRecinto> {
    const [
      { data: filasParroquias, error: errorParroquias },
      { data: filasCantones, error: errorCantones },
      { data: perfiles, error: errorPerfiles },
      { data: filasRecintos, error: errorRecintos },
    ] = await Promise.all([
      this.cliente
        .from("parroquias")
        .select("id, nombre, canton_id, provincia_id")
        .eq("provincia_id", provinciaId)
        .order("nombre"),
      this.cliente
        .from("cantones")
        .select("id, nombre, provincia_id")
        .eq("provincia_id", provinciaId)
        .order("nombre"),
      this.cliente
        .from("perfiles")
        .select("id, nombres, apellidos, cedula, correo")
        .eq("provincia_id", provinciaId)
        .eq("rol", "coordinador_recinto")
        .order("apellidos"),
      this.cliente
        .from("recintos")
        .select("coordinador_id")
        .eq("provincia_id", provinciaId)
        .not("coordinador_id", "is", null),
    ]);

    const parroquias = asegurarResultado(
      filasParroquias,
      errorParroquias,
      "No se pudieron cargar las parroquias.",
    ) as Pick<FilaParroquia, "id" | "nombre" | "canton_id">[];
    const cantones = asegurarResultado(
      filasCantones,
      errorCantones,
      "No se pudieron cargar los cantones.",
    ) as Pick<FilaCanton, "id" | "nombre">[];
    const filasPerfiles = asegurarResultado(
      perfiles,
      errorPerfiles,
      "No se pudieron cargar los coordinadores.",
    ) as FilaPerfil[];
    const asignaciones = asegurarResultado(
      filasRecintos,
      errorRecintos,
      "No se pudieron consultar las asignaciones.",
    ) as Pick<FilaRecinto, "coordinador_id">[];

    const cantonPorId = new Map(cantones.map((canton) => [canton.id, canton]));
    const coordinadoresAsignados = new Set(
      asignaciones
        .map((recinto) => recinto.coordinador_id)
        .filter((id): id is string => id !== null),
    );
    const opcionesParroquias: Parroquia[] = parroquias.map((parroquia) => {
      const canton = cantonPorId.get(parroquia.canton_id);
      if (!canton) {
        throw new Error("Una parroquia referencia un cantón inexistente.");
      }
      return {
        id: parroquia.id,
        nombre: parroquia.nombre,
        canton_id: parroquia.canton_id,
        canton,
      };
    });

    const coordinadores: CoordinadorRecinto[] = filasPerfiles.map(
      (perfil) => ({
        ...perfil,
        asignado: coordinadoresAsignados.has(perfil.id),
      }),
    );

    return {
      parroquias: opcionesParroquias,
      coordinadores,
    };
  }

  async crear(recinto: NuevoRecinto): Promise<string> {
    return ejecutarOnlineConTimeout(
      "No se pudo crear el recinto y sus mesas.",
      async (signal) => {
        const { data: parroquia, error: errorParroquia } = await this.cliente
          .from("parroquias")
          .select("provincia_id, canton_id")
          .eq("id", recinto.parroquia_id)
          .abortSignal(signal)
          .maybeSingle();
        const ubicacion = asegurarResultado(
          parroquia,
          errorParroquia,
          "No se encontró la parroquia seleccionada.",
        );

        const { data, error } = await this.cliente
          .rpc("crear_recinto_con_mesas", {
            p_provincia_id: ubicacion.provincia_id,
            p_canton_id: ubicacion.canton_id,
            p_parroquia_id: recinto.parroquia_id,
            p_nombre: recinto.nombre,
            p_latitud: recinto.latitud,
            p_longitud: recinto.longitud,
            p_cantidad_mesas: recinto.cantidad_mesas,
            p_coordinador_id: recinto.coordinador_id ?? null,
          })
          .abortSignal(signal);
        return asegurarResultado(
          data,
          error,
          "No se pudo crear el recinto y sus mesas.",
        );
      },
    );
  }

  async asignarCoordinador(
    recintoId: string,
    coordinadorId: string,
  ): Promise<void> {
    return ejecutarOnlineConTimeout(
      "No se pudo asignar el coordinador al recinto.",
      async (signal) => {
        const { data, error } = await this.cliente
          .from("recintos")
          .update({ coordinador_id: coordinadorId })
          .eq("id", recintoId)
          .select("id")
          .abortSignal(signal)
          .maybeSingle();
        asegurarResultado(
          data,
          error,
          "No se pudo asignar el coordinador. Verifica que siga disponible.",
        );
      },
    );
  }

  private async obtenerPerfiles(ids: string[]): Promise<FilaPerfil[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.cliente
      .from("perfiles")
      .select("id, nombres, apellidos, correo")
      .in("id", ids);
    return asegurarResultado(
      data,
      error,
      "No se pudieron cargar los coordinadores asignados.",
    ) as FilaPerfil[];
  }
}
