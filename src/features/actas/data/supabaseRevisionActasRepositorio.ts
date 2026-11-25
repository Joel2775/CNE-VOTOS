import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  leerLecturaCache,
  guardarLecturaCache,
} from "@/core/offline/lecturasCache";
import { cargarTodasLasFilas } from "@/core/supabase/paginacion";
import type { Database } from "@/core/supabase/database.types";
import type {
  ActaRevision,
  CorreccionActa,
  DecisionRevisionActa,
  DetalleActaRevision,
  FiltrosBandejaRevision,
  HistorialRevision,
  VotoRevision,
} from "../domain/entidades/revisionActa";
import {
  actaRevisionSchema,
  historialRevisionSchema,
  votoRevisionSchema,
} from "../domain/entidades/revisionActa";
import type { RevisionActasRepositorio } from "../domain/repositorios/revisionActasRepositorio";

type FilaActa = Database["public"]["Views"]["vw_actas_revision"]["Row"];
type FilaVoto =
  Database["public"]["Views"]["vw_detalle_votos_revision"]["Row"];
type FilaHistorial =
  Database["public"]["Views"]["vw_historial_revision_actas"]["Row"];

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

function mapearActa(fila: FilaActa): ActaRevision {
  return actaRevisionSchema.parse(fila);
}

function mapearVoto(fila: FilaVoto): VotoRevision {
  return votoRevisionSchema.parse(fila);
}

function mapearHistorial(fila: FilaHistorial): HistorialRevision {
  return historialRevisionSchema.parse(fila);
}

function cacheActasKey(filtros: FiltrosBandejaRevision): string {
  return [
    "bandeja-revision",
    filtros.coordinadorId,
    filtros.estado,
    filtros.dignidad,
  ].join(":");
}

export class SupabaseRevisionActasRepositorio
  implements RevisionActasRepositorio
{
  constructor(private readonly cliente: SupabaseClient<Database>) {}

  async listarBandeja(
    filtros: FiltrosBandejaRevision,
  ): Promise<ActaRevision[]> {
    const conexion = await NetInfo.fetch();
    const online =
      conexion.isInternetReachable ?? conexion.isConnected ?? false;
    const clave = cacheActasKey(filtros);

    if (!online) {
      return this.leerActasCache(clave);
    }

    const filas = await cargarTodasLasFilas(async (desde, hasta) => {
      let consulta = this.cliente
        .from("vw_actas_revision")
        .select("*")
        .eq("coordinador_id", filtros.coordinadorId);

      if (filtros.estado !== "todas") {
        consulta = consulta.eq("estado_revision", filtros.estado);
      }
      if (filtros.dignidad !== "todas") {
        consulta = consulta.eq("dignidad", filtros.dignidad);
      }

      return consulta
        .order("recibida_en", { ascending: false })
        .order("acta_id")
        .range(desde, hasta);
    }, "No se pudo cargar la bandeja de actas.");
    const actas = filas.map(mapearActa);
    await guardarLecturaCache(clave, actas);
    return actas;
  }

  async obtenerDetalle(actaId: string): Promise<DetalleActaRevision> {
    const conexion = await NetInfo.fetch();
    const online =
      conexion.isInternetReachable ?? conexion.isConnected ?? false;
    const clave = `detalle-revision:${actaId}`;

    if (!online) {
      return this.leerDetalleCache(clave);
    }

    const [
      { data: filaActa, error: errorActa },
      { data: filasVotos, error: errorVotos },
      { data: filasHistorial, error: errorHistorial },
    ] = await Promise.all([
      this.cliente
        .from("vw_actas_revision")
        .select("*")
        .eq("acta_id", actaId)
        .maybeSingle(),
      this.cliente
        .from("vw_detalle_votos_revision")
        .select("*")
        .eq("acta_id", actaId)
        .order("organizacion_orden"),
      this.cliente
        .from("vw_historial_revision_actas")
        .select("*")
        .eq("acta_id", actaId)
        .order("id", { ascending: false }),
    ]);

    const fila = asegurarResultado(
      filaActa,
      errorActa,
      "No se encontró el acta solicitada.",
    );
    const detalle: DetalleActaRevision = {
      acta: mapearActa(fila),
      votos: asegurarResultado(
        filasVotos,
        errorVotos,
        "No se pudieron cargar los votos del acta.",
      ).map(mapearVoto),
      historial: asegurarResultado(
        filasHistorial,
        errorHistorial,
        "No se pudo cargar el historial de revisión.",
      ).map(mapearHistorial),
    };
    await guardarLecturaCache(clave, detalle);
    return detalle;
  }

  async obtenerUrlFotoFirmada(ruta: string): Promise<string> {
    const { data, error } = await this.cliente.storage
      .from("actas")
      .createSignedUrl(ruta, 300);
    if (error) {
      throw new Error(`No se pudo abrir la fotografía privada. ${error.message}`);
    }
    if (!data?.signedUrl) {
      throw new Error("Supabase no devolvió una URL temporal para la fotografía.");
    }
    return data.signedUrl;
  }

  async decidirRevision(
    actaId: string,
    decision: DecisionRevisionActa,
    motivo: string | null,
  ): Promise<void> {
    const { data, error } = await this.cliente.rpc("revisar_acta", {
      p_acta_id: actaId,
      p_estado_revision: decision,
      p_motivo: motivo,
    });
    asegurarResultado(data, error, "No se pudo guardar la decisión de revisión.");
  }

  async corregirActa(correccion: CorreccionActa): Promise<void> {
    const { data, error } = await this.cliente.rpc("corregir_acta", {
      p_acta_id: correccion.actaId,
      p_total_sufragantes: correccion.totalSufragantes,
      p_votos_nulos: correccion.votosNulos,
      p_votos_blancos: correccion.votosBlancos,
      p_votos: correccion.votos,
      p_motivo: correccion.motivo,
      p_evidencia: null,
    });
    asegurarResultado(data, error, "No se pudo guardar la corrección del acta.");
  }

  private async leerActasCache(clave: string): Promise<ActaRevision[]> {
    const cache = await leerLecturaCache(clave);
    if (!cache) {
      throw new Error(
        "No hay una bandeja guardada en este teléfono. Conéctate para cargar las actas.",
      );
    }
    return z.array(actaRevisionSchema).parse(cache.contenido);
  }

  private async leerDetalleCache(
    clave: string,
  ): Promise<DetalleActaRevision> {
    const cache = await leerLecturaCache(clave);
    if (!cache) {
      throw new Error(
        "No hay un detalle guardado en este teléfono. Conéctate para abrirlo.",
      );
    }

    const detalleSchema = z.object({
      acta: actaRevisionSchema,
      votos: z.array(votoRevisionSchema),
      historial: z.array(historialRevisionSchema),
    });
    return detalleSchema.parse(cache.contenido);
  }
}
