import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";

import { inicializarBaseLocal } from "@/core/offline/sqliteDb";
import { ejecutarOnlineConTimeout } from "@/core/red/verificarConexionObligatoria";
import type { Database } from "@/core/supabase/database.types";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import type {
  EstadoActaMesa,
  MesaAsignable,
  MesaAsignadaVeedor,
  ReemplazoVeedor,
  ResumenMesasRecinto,
} from "../domain/entidades/asignacionVeedor";
import type { AsignacionesRepositorio } from "../domain/repositorios/asignacionesRepositorio";

type FilaRecinto = Database["public"]["Tables"]["recintos"]["Row"];
type FilaMesa = Database["public"]["Tables"]["mesas"]["Row"];
type FilaAsignacion =
  Database["public"]["Tables"]["asignaciones_veedor"]["Row"];
type FilaPerfil = Pick<
  Database["public"]["Tables"]["perfiles"]["Row"],
  "id" | "nombres" | "apellidos" | "correo"
>;
type FilaActaRemota = Pick<
  Database["public"]["Tables"]["actas"]["Row"],
  | "id"
  | "mesa_id"
  | "dignidad"
  | "recibida_en"
  | "estado_revision"
  | "motivo_revision"
>;
type EstadoActasLocales = {
  estados: Record<DignidadActa, EstadoActaMesa>;
  ids: Record<DignidadActa, string | null>;
  motivos: Record<DignidadActa, string | null>;
};
type FilaEstadoCola = {
  mesa_id: string;
  dignidad: string;
  estado: string;
};

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

function esOnline(
  estado: Awaited<ReturnType<typeof NetInfo.fetch>>,
): boolean {
  return estado.isInternetReachable ?? estado.isConnected ?? false;
}

export class SupabaseAsignacionesRepositorio
  implements AsignacionesRepositorio
{
  constructor(private readonly cliente: SupabaseClient<Database>) {}

  async listarMesasRecinto(
    coordinadorId: string,
  ): Promise<ResumenMesasRecinto> {
    const { data: recinto, error: errorRecinto } = await this.cliente
      .from("recintos")
      .select("id, nombre, provincia_id")
      .eq("coordinador_id", coordinadorId)
      .maybeSingle();
    const recintoActual = asegurarResultado(
      recinto,
      errorRecinto,
      "No tienes un recinto asignado para administrar.",
    );

    const [
      { data: filasMesas, error: errorMesas },
      { data: perfiles, error: errorPerfiles },
    ] = await Promise.all([
      this.cliente
        .from("mesas")
        .select("id, recinto_id, numero")
        .eq("recinto_id", recintoActual.id)
        .order("numero"),
      this.cliente
        .from("perfiles")
        .select("id, nombres, apellidos, correo")
        .eq("provincia_id", recintoActual.provincia_id)
        .eq("rol", "veedor")
        .order("apellidos"),
    ]);

    const mesas = asegurarResultado(
      filasMesas,
      errorMesas,
      "No se pudieron cargar las mesas del recinto.",
    ) as Pick<FilaMesa, "id" | "numero" | "recinto_id">[];
    const veedores = asegurarResultado(
      perfiles,
      errorPerfiles,
      "No se pudieron cargar los veedores.",
    ) as FilaPerfil[];

    if (mesas.length === 0) {
      return {
        recinto: { id: recintoActual.id, nombre: recintoActual.nombre },
        mesas: [],
        veedores,
      };
    }

    const { data: asignaciones, error: errorAsignaciones } = await this.cliente
      .from("asignaciones_veedor")
      .select(
        "id, veedor_id, mesa_id, asignado_por, asignado_en, finalizado_en",
      )
      .in(
        "mesa_id",
        mesas.map((mesa) => mesa.id),
      )
      .is("finalizado_en", null);
    const filasAsignaciones = asegurarResultado(
      asignaciones,
      errorAsignaciones,
      "No se pudieron cargar las asignaciones activas.",
    ) as Pick<
      FilaAsignacion,
      | "id"
      | "veedor_id"
      | "mesa_id"
      | "asignado_por"
      | "asignado_en"
      | "finalizado_en"
    >[];
    const veedoresPorId = new Map(veedores.map((veedor) => [veedor.id, veedor]));
    const asignacionPorMesa = new Map(
      filasAsignaciones.map((asignacion) => [
        asignacion.mesa_id,
        asignacion,
      ]),
    );

    const mesasAsignables: MesaAsignable[] = mesas.map((mesa) => {
      const asignacion = asignacionPorMesa.get(mesa.id);
      if (!asignacion) {
        return { id: mesa.id, numero: mesa.numero, asignacion: null };
      }

      const veedor = veedoresPorId.get(asignacion.veedor_id);
      if (!veedor) {
        throw new Error(
          "Una asignación activa no tiene un perfil de veedor visible.",
        );
      }

      return {
        id: mesa.id,
        numero: mesa.numero,
        asignacion: {
          ...asignacion,
          veedor,
        },
      };
    });

    return {
      recinto: { id: recintoActual.id, nombre: recintoActual.nombre },
      mesas: mesasAsignables,
      veedores,
    };
  }

  async asignarVeedorMesa(mesaId: string, veedorId: string): Promise<void> {
    return ejecutarOnlineConTimeout(
      "No se pudo asignar el veedor a la mesa.",
      async (signal) => {
        const { data: sesion, error: errorSesion } =
          await this.cliente.auth.getUser();
        if (errorSesion || !sesion.user) {
          throw new Error("Inicia sesión nuevamente para asignar un veedor.");
        }

        const { error } = await this.cliente
          .from("asignaciones_veedor")
          .insert({
            mesa_id: mesaId,
            veedor_id: veedorId,
            asignado_por: sesion.user.id,
          })
          .abortSignal(signal);
        if (error) {
          throw new Error(
            "No se pudo asignar el veedor. Verifica si otra persona ya ocupó esta mesa.",
          );
        }
      },
    );
  }

  async reemplazarVeedorEnVivo(
    reemplazo: ReemplazoVeedor,
  ): Promise<void> {
    return ejecutarOnlineConTimeout(
      "No se pudo reemplazar al veedor.",
      async (signal) => {
        const { error } = await this.cliente
          .rpc("reemplazar_veedor", {
            p_asignacion_anterior_id: reemplazo.asignacion_anterior_id,
            p_veedor_entrante_id: reemplazo.veedor_entrante_id,
            p_motivo: reemplazo.motivo,
          })
          .abortSignal(signal);
        if (error) {
          throw new Error(
            "No se pudo reemplazar al veedor. Actualiza la pantalla e inténtalo de nuevo.",
          );
        }
      },
    );
  }

  async listarMesasAsignadasVeedor(
    veedorId: string,
  ): Promise<MesaAsignadaVeedor[]> {
    const estado = await NetInfo.fetch();
    if (!esOnline(estado)) {
      return this.listarMesasLocales(veedorId);
    }

    const { data: asignaciones, error: errorAsignaciones } = await this.cliente
      .from("asignaciones_veedor")
      .select(
        "id, veedor_id, mesa_id, asignado_por, asignado_en, finalizado_en",
      )
      .eq("veedor_id", veedorId)
      .is("finalizado_en", null);
    const activas = asegurarResultado(
      asignaciones,
      errorAsignaciones,
      "No se pudieron cargar tus mesas asignadas.",
    ) as Pick<
      FilaAsignacion,
      | "id"
      | "mesa_id"
      | "veedor_id"
      | "asignado_por"
      | "asignado_en"
      | "finalizado_en"
    >[];
    if (activas.length === 0) {
      await this.guardarCacheAsignaciones(veedorId, [], [], []);
      return [];
    }

    const mesaIds = [...new Set(activas.map((asignacion) => asignacion.mesa_id))];
    const { data: filasMesas, error: errorMesas } = await this.cliente
      .from("mesas")
      .select("id, recinto_id, numero")
      .in("id", mesaIds);
    const mesas = asegurarResultado(
      filasMesas,
      errorMesas,
      "No se pudieron cargar los datos de las mesas.",
    ) as Pick<FilaMesa, "id" | "recinto_id" | "numero">[];

    const recintoIds = [...new Set(mesas.map((mesa) => mesa.recinto_id))];
    const { data: filasRecintos, error: errorRecintos } = await this.cliente
      .from("recintos")
      .select(
        "id, provincia_id, canton_id, parroquia_id, nombre, latitud, longitud, coordinador_id, rol_coordinador, creado_en",
      )
      .in("id", recintoIds);
    const recintos = asegurarResultado(
      filasRecintos,
      errorRecintos,
      "No se pudieron cargar los recintos de tus mesas.",
    ) as FilaRecinto[];

    const { data: filasActas, error: errorActas } = await this.cliente
      .from("actas")
      .select(
        "id, mesa_id, dignidad, recibida_en, estado_revision, motivo_revision",
      )
      .in("mesa_id", mesaIds);
    const actasRemotas = asegurarResultado(
      filasActas,
      errorActas,
      "No se pudieron actualizar los estados de tus actas.",
    ) as FilaActaRemota[];

    await this.guardarCacheAsignaciones(veedorId, activas, mesas, recintos);
    await this.guardarCacheActasRemotas(mesaIds, actasRemotas);
    const estadosActas = await this.listarEstadosActaLocales(
      mesaIds,
      actasRemotas,
    );
    return this.mapearMesasAsignadas(
      activas,
      mesas,
      recintos,
      estadosActas,
    );
  }

  listarMesasAsignadasVeedorLocal(
    veedorId: string,
  ): Promise<MesaAsignadaVeedor[]> {
    return this.listarMesasLocales(veedorId);
  }

  private async guardarCacheAsignaciones(
    veedorId: string,
    asignaciones: Pick<
      FilaAsignacion,
      | "id"
      | "veedor_id"
      | "mesa_id"
      | "asignado_por"
      | "asignado_en"
      | "finalizado_en"
    >[],
    mesas: Pick<FilaMesa, "id" | "recinto_id" | "numero">[],
    recintos: FilaRecinto[],
  ): Promise<void> {
    const database = await inicializarBaseLocal();
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        "DELETE FROM asignaciones_veedor WHERE veedor_id = ?",
        veedorId,
      );
      for (const recinto of recintos) {
        await database.runAsync(
          `INSERT OR REPLACE INTO recintos (
            id, provincia_id, canton_id, parroquia_id, nombre, latitud, longitud,
            coordinador_id, rol_coordinador, creado_en
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          recinto.id,
          recinto.provincia_id,
          recinto.canton_id,
          recinto.parroquia_id,
          recinto.nombre,
          recinto.latitud,
          recinto.longitud,
          recinto.coordinador_id,
          recinto.rol_coordinador,
          recinto.creado_en,
        );
      }
      for (const mesa of mesas) {
        await database.runAsync(
          "INSERT OR REPLACE INTO mesas (id, recinto_id, numero) VALUES (?, ?, ?)",
          mesa.id,
          mesa.recinto_id,
          mesa.numero,
        );
      }
      for (const asignacion of asignaciones) {
        await database.runAsync(
          `INSERT OR REPLACE INTO asignaciones_veedor (
            id, veedor_id, rol_veedor, mesa_id, asignado_por, asignado_en,
            finalizado_por, finalizado_en
          ) VALUES (?, ?, 'veedor', ?, ?, ?, NULL, ?)`,
          asignacion.id,
          asignacion.veedor_id,
          asignacion.mesa_id,
          asignacion.asignado_por,
          asignacion.asignado_en,
          asignacion.finalizado_en,
        );
      }
    });
  }

  private async listarMesasLocales(
    veedorId: string,
  ): Promise<MesaAsignadaVeedor[]> {
    const database = await inicializarBaseLocal();
    const asignaciones = await database.getAllAsync<{
      asignacion_id: string;
      mesa_id: string;
      numero: number;
      recinto_id: string;
      recinto: string;
      latitud: number;
      longitud: number;
    }>(
      `SELECT av.id AS asignacion_id,
              m.id AS mesa_id,
              m.numero,
              r.id AS recinto_id,
              r.nombre AS recinto,
              r.latitud,
              r.longitud
       FROM asignaciones_veedor AS av
       JOIN mesas AS m ON m.id = av.mesa_id
       JOIN recintos AS r ON r.id = m.recinto_id
       WHERE av.veedor_id = ? AND av.finalizado_en IS NULL
       ORDER BY r.nombre, m.numero`,
      veedorId,
    );

    const estadosActas = await this.listarEstadosActaLocales(
      [...new Set(asignaciones.map((asignacion) => asignacion.mesa_id))],
    );
    return asignaciones.map((asignacion) => {
      const datosActas =
        estadosActas.get(asignacion.mesa_id) ?? this.actasFaltantes();
      return {
        ...asignacion,
        actas: datosActas.estados,
        acta_ids: datosActas.ids,
        motivos_revision: datosActas.motivos,
      };
    });
  }

  private async guardarCacheActasRemotas(
    mesaIds: string[],
    actas: FilaActaRemota[],
  ): Promise<void> {
    const database = await inicializarBaseLocal();
    await database.withTransactionAsync(async () => {
      for (const mesaId of mesaIds) {
        await database.runAsync(
          "DELETE FROM actas_remotas WHERE mesa_id = ?",
          mesaId,
        );
      }

      for (const acta of actas) {
        if (!this.esDignidad(acta.dignidad)) {
          continue;
        }
        await database.runAsync(
          `INSERT INTO actas_remotas (
            id, mesa_id, dignidad, recibida_en, estado_revision, motivo_revision
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          acta.id,
          acta.mesa_id,
          acta.dignidad,
          acta.recibida_en,
          acta.estado_revision,
          acta.motivo_revision,
        );
      }
    });
  }

  private async listarEstadosActaLocales(
    mesaIds: string[],
    actasRemotas?: FilaActaRemota[],
  ): Promise<Map<string, EstadoActasLocales>> {
    const resultado = new Map<string, EstadoActasLocales>();
    if (mesaIds.length === 0) {
      return resultado;
    }

    const database = await inicializarBaseLocal();
    const parametros = mesaIds.map(() => "?").join(", ");
    const [filasRemotas, filasCola] = await Promise.all([
      actasRemotas
        ? Promise.resolve(actasRemotas)
        : database.getAllAsync<FilaActaRemota>(
            `SELECT id, mesa_id, dignidad, recibida_en, estado_revision, motivo_revision
             FROM actas_remotas
             WHERE mesa_id IN (${parametros})`,
            ...mesaIds,
          ),
      database.getAllAsync<FilaEstadoCola>(
        `SELECT mesa_id, dignidad, estado
         FROM sync_queue
         WHERE mesa_id IN (${parametros})`,
        ...mesaIds,
      ),
    ]);

    for (const mesaId of mesaIds) {
      resultado.set(mesaId, this.actasFaltantes());
    }

    for (const acta of filasRemotas) {
      if (this.esDignidad(acta.dignidad)) {
        const datosActas = resultado.get(acta.mesa_id);
        if (datosActas) {
          datosActas.estados[acta.dignidad] =
            this.mapearEstadoRevision(acta.estado_revision);
          datosActas.ids[acta.dignidad] = acta.id;
          datosActas.motivos[acta.dignidad] = acta.motivo_revision;
        }
      }
    }

    for (const fila of filasCola) {
      if (!this.esDignidad(fila.dignidad)) {
        continue;
      }
      const datosActas = resultado.get(fila.mesa_id);
      if (fila.estado === "enviada" && datosActas?.ids[fila.dignidad]) {
        continue;
      }
      if (datosActas) {
        datosActas.estados[fila.dignidad] = this.mapearEstadoCola(fila.estado);
      }
    }

    return resultado;
  }

  private mapearEstadoCola(estado: string): EstadoActaMesa {
    switch (estado) {
      case "pendiente":
        return "en_cola";
      case "sincronizando":
        return "pendiente_subida";
      case "error":
        return "error";
      case "enviada":
        return "enviada";
      default:
        throw new Error(`Estado de sincronización desconocido: ${estado}.`);
    }
  }

  private mapearEstadoRevision(estado: string): EstadoActaMesa {
    switch (estado) {
      case "pendiente_revision":
      case "validada":
      case "observada":
      case "rechazada":
        return estado;
      default:
        throw new Error(`Estado de revisión desconocido: ${estado}.`);
    }
  }

  private actasFaltantes(): EstadoActasLocales {
    return {
      estados: { alcaldia: "faltante", prefectura: "faltante" },
      ids: { alcaldia: null, prefectura: null },
      motivos: { alcaldia: null, prefectura: null },
    };
  }

  private esDignidad(valor: string): valor is DignidadActa {
    return valor === "alcaldia" || valor === "prefectura";
  }

  private mapearMesasAsignadas(
    asignaciones: Pick<
      FilaAsignacion,
      | "id"
      | "veedor_id"
      | "mesa_id"
      | "asignado_por"
      | "asignado_en"
      | "finalizado_en"
    >[],
    mesas: Pick<FilaMesa, "id" | "recinto_id" | "numero">[],
    recintos: FilaRecinto[],
    estadosActas: Map<string, EstadoActasLocales>,
  ): MesaAsignadaVeedor[] {
    const mesasPorId = new Map(mesas.map((mesa) => [mesa.id, mesa]));
    const recintosPorId = new Map(recintos.map((recinto) => [recinto.id, recinto]));
    return asignaciones.map((asignacion) => {
      const mesa = mesasPorId.get(asignacion.mesa_id);
      const recinto = mesa ? recintosPorId.get(mesa.recinto_id) : undefined;
      if (!mesa || !recinto) {
        throw new Error("Una mesa asignada no tiene un recinto disponible.");
      }
      const datosActas = estadosActas.get(mesa.id) ?? this.actasFaltantes();
      return {
        asignacion_id: asignacion.id,
        mesa_id: mesa.id,
        numero: mesa.numero,
        recinto_id: recinto.id,
        recinto: recinto.nombre,
        latitud: recinto.latitud,
        longitud: recinto.longitud,
        actas: datosActas.estados,
        acta_ids: datosActas.ids,
        motivos_revision: datosActas.motivos,
      };
    });
  }
}
