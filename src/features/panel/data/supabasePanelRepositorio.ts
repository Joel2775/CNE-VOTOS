import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  guardarLecturaCache,
  leerLecturaCache,
} from "@/core/offline/lecturasCache";
import { cargarTodasLasFilas } from "@/core/supabase/paginacion";
import type { Database } from "@/core/supabase/database.types";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import {
  actaRevisionSchema,
  votoRevisionSchema,
} from "@/features/actas/domain/entidades/revisionActa";
import type {
  AvanceProvincial,
  ModoResultados,
  ResultadoCandidato,
  ResultadosConsolidados,
} from "../domain/entidades/panelProvincial";
import {
  alertaActaSchema,
  progresoRecintoSchema,
} from "../domain/entidades/panelProvincial";
import type { PanelRepositorio } from "../domain/repositorios/panelRepositorio";

type FilaProgreso =
  Database["public"]["Views"]["vw_avance_revision_recintos"]["Row"];
type FilaActa = Database["public"]["Views"]["vw_actas_revision"]["Row"];
type FilaVoto =
  Database["public"]["Views"]["vw_detalle_votos_revision"]["Row"];

function esOnline(
  estado: Awaited<ReturnType<typeof NetInfo.fetch>>,
): boolean {
  return estado.isInternetReachable ?? estado.isConnected ?? false;
}

function claveAvance(provinciaId: string): string {
  return `panel-avance:${provinciaId}`;
}

function claveResultados(
  provinciaId: string,
  dignidad: DignidadActa,
  modo: ModoResultados,
): string {
  return `panel-resultados:${provinciaId}:${dignidad}:${modo}`;
}

const avanceSchema = z.object({
  recintos: z.array(progresoRecintoSchema),
  alertas: z.array(alertaActaSchema),
  actas: z.array(actaRevisionSchema).default([]),
});

const resultadoCandidatoSchema = z.object({
  candidatoId: z.uuid(),
  organizacionId: z.uuid(),
  organizacionSigla: z.string(),
  organizacion: z.string(),
  candidato: z.string(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  organizacionOrden: z.number().int(),
  votos: z.number().int().nonnegative(),
  porcentaje: z.number().nonnegative(),
});

const resultadosSchema = z.object({
  dignidad: z.enum(["alcaldia", "prefectura"]),
  actasRecibidas: z.number().int().nonnegative(),
  actasValidadas: z.number().int().nonnegative(),
  votosValidos: z.number().int().nonnegative(),
  votosBlancos: z.number().int().nonnegative(),
  votosNulos: z.number().int().nonnegative(),
  totalSufragantes: z.number().int().nonnegative(),
  candidaturas: z.array(resultadoCandidatoSchema),
});

export class SupabasePanelRepositorio implements PanelRepositorio {
  constructor(private readonly cliente: SupabaseClient<Database>) {}

  async cargarAvance(provinciaId: string): Promise<AvanceProvincial> {
    const conexion = await NetInfo.fetch();
    const clave = claveAvance(provinciaId);
    if (!esOnline(conexion)) {
      return this.leerCache(clave, avanceSchema);
    }

    const [filasProgreso, filasActas] = await Promise.all([
      cargarTodasLasFilas(
        async (desde, hasta) =>
          this.cliente
            .from("vw_avance_revision_recintos")
            .select("*")
            .eq("provincia_id", provinciaId)
            .order("recinto")
            .order("recinto_id")
            .range(desde, hasta),
        "No se pudo cargar el avance provincial.",
      ),
      cargarTodasLasFilas(
        async (desde, hasta) =>
          this.cliente
            .from("vw_actas_revision")
            .select("*")
            .eq("provincia_id", provinciaId)
            .order("acta_id")
            .range(desde, hasta),
        "No se pudieron cargar las alertas de actas.",
      ),
    ]);

    const progreso = filasProgreso.map((fila: FilaProgreso) =>
      progresoRecintoSchema.parse(fila),
    );
    const actas = filasActas.map((fila: FilaActa) => actaRevisionSchema.parse(fila));
    const alertas = actas
      .filter((acta) => acta.fuera_margen || acta.estado_revision === "rechazada")
      .map((acta) =>
        alertaActaSchema.parse({
          acta_id: acta.acta_id,
          recinto_id: acta.recinto_id,
          recinto: acta.recinto,
          parroquia: acta.parroquia,
          mesa_numero: acta.mesa_numero,
          dignidad: acta.dignidad,
          estado_revision: acta.estado_revision,
          motivo_revision: acta.motivo_revision,
          distancia_recinto_m: acta.distancia_recinto_m,
          fuera_margen: acta.fuera_margen,
        }),
      );
    const avance: AvanceProvincial = { recintos: progreso, alertas, actas };
    await guardarLecturaCache(clave, avance);
    return avance;
  }

  async cargarResultados(
    provinciaId: string,
    dignidad: DignidadActa,
    modo: ModoResultados,
  ): Promise<ResultadosConsolidados> {
    const conexion = await NetInfo.fetch();
    const clave = claveResultados(provinciaId, dignidad, modo);
    if (!esOnline(conexion)) {
      return this.leerCache(clave, resultadosSchema);
    }

    const filasActas = await cargarTodasLasFilas(
      async (desde, hasta) =>
        this.cliente
          .from("vw_actas_revision")
          .select("*")
          .eq("provincia_id", provinciaId)
          .eq("dignidad", dignidad)
          .order("acta_id")
          .range(desde, hasta),
      "No se pudieron cargar las actas para los resultados.",
    );
    const actas = filasActas
      .map((fila: FilaActa) => actaRevisionSchema.parse(fila))
      .filter(
        (acta) => modo === "preliminares" || acta.estado_revision === "validada",
      );

    const votos: ReturnType<typeof votoRevisionSchema.parse>[] = [];
    for (let inicio = 0; inicio < actas.length; inicio += 100) {
      const actaIds = actas
        .slice(inicio, inicio + 100)
        .map((acta) => acta.acta_id);
      const filasVotos = await cargarTodasLasFilas(
        async (desde, hasta) =>
          this.cliente
            .from("vw_detalle_votos_revision")
            .select("*")
            .in("acta_id", actaIds)
            .order("organizacion_orden")
            .range(desde, hasta),
        "No se pudieron cargar los votos consolidados.",
      );
      votos.push(
        ...filasVotos.map((fila: FilaVoto) =>
          votoRevisionSchema.parse(fila),
        ),
      );
    }

    const totalVotosValidos = votos.reduce((suma, voto) => suma + voto.votos, 0);
    const grupos = new Map<string, ResultadoCandidato>();
    for (const voto of votos) {
      const candidatura = grupos.get(voto.candidato_id);
      if (candidatura) {
        candidatura.votos += voto.votos;
      } else {
        grupos.set(voto.candidato_id, {
          candidatoId: voto.candidato_id,
          organizacionId: voto.organizacion_id,
          organizacionSigla: voto.organizacion_sigla,
          organizacion: voto.organizacion,
          candidato: voto.candidato,
          colorHex: voto.color_hex,
          organizacionOrden: voto.organizacion_orden,
          votos: voto.votos,
          porcentaje: 0,
        });
      }
    }

    const candidaturas = [...grupos.values()]
      .map((candidatura) => ({
        ...candidatura,
        porcentaje:
          totalVotosValidos === 0
            ? 0
            : Number(((candidatura.votos / totalVotosValidos) * 100).toFixed(2)),
      }))
      .sort((a, b) => a.organizacionOrden - b.organizacionOrden);

    const resultado: ResultadosConsolidados = {
      dignidad,
      actasRecibidas: actas.length,
      actasValidadas: actas.filter(
        (acta) => acta.estado_revision === "validada",
      ).length,
      votosValidos: totalVotosValidos,
      votosBlancos: actas.reduce((suma, acta) => suma + acta.votos_blancos, 0),
      votosNulos: actas.reduce((suma, acta) => suma + acta.votos_nulos, 0),
      totalSufragantes: actas.reduce(
        (suma, acta) => suma + acta.total_sufragantes,
        0,
      ),
      candidaturas,
    };
    await guardarLecturaCache(clave, resultado);
    return resultado;
  }

  private async leerCache<T>(
    clave: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const cache = await leerLecturaCache(clave);
    if (!cache) {
      throw new Error(
        "No hay una lectura guardada en este teléfono. Conéctate para cargar el panel.",
      );
    }
    return schema.parse(cache.contenido);
  }
}
