import type {
  DecisionRevisionActa,
  DetalleActaRevision,
  CorreccionActa,
  FiltrosBandejaRevision,
  ActaRevision,
} from "../entidades/revisionActa";

export interface RevisionActasRepositorio {
  listarBandeja(filtros: FiltrosBandejaRevision): Promise<ActaRevision[]>;
  obtenerDetalle(actaId: string): Promise<DetalleActaRevision>;
  obtenerUrlFotoFirmada(ruta: string): Promise<string>;
  decidirRevision(
    actaId: string,
    decision: DecisionRevisionActa,
    motivo: string | null,
  ): Promise<void>;
  corregirActa(correccion: CorreccionActa): Promise<void>;
}
