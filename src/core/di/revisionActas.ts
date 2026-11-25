import { supabase } from "@/core/supabase/client";
import { decidirRevisionActa } from "@/features/actas/domain/casos-uso/decidirRevisionActa";
import { corregirActa } from "@/features/actas/domain/casos-uso/corregirActa";
import { listarBandejaRevision } from "@/features/actas/domain/casos-uso/listarBandejaRevision";
import { obtenerDetalleActaRevision } from "@/features/actas/domain/casos-uso/obtenerDetalleActaRevision";
import type {
  DecisionRevisionActa,
  CorreccionActa,
  FiltrosBandejaRevision,
} from "@/features/actas/domain/entidades/revisionActa";
import { SupabaseRevisionActasRepositorio } from "@/features/actas/data/supabaseRevisionActasRepositorio";

const repositorio = new SupabaseRevisionActasRepositorio(supabase);

export const actasRevision = {
  listarBandeja(filtros: FiltrosBandejaRevision) {
    return listarBandejaRevision(repositorio, filtros);
  },
  obtenerDetalle(actaId: string) {
    return obtenerDetalleActaRevision(repositorio, actaId);
  },
  obtenerUrlFotoFirmada(ruta: string) {
    return repositorio.obtenerUrlFotoFirmada(ruta);
  },
  decidir(
    actaId: string,
    decision: DecisionRevisionActa,
    motivo: string | null,
  ) {
    return decidirRevisionActa(repositorio, actaId, decision, motivo);
  },
  corregir(correccion: CorreccionActa) {
    return corregirActa(repositorio, correccion);
  },
};
