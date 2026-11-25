import type { DetalleActaRevision } from "../entidades/revisionActa";
import type { RevisionActasRepositorio } from "../repositorios/revisionActasRepositorio";

export function obtenerDetalleActaRevision(
  repositorio: RevisionActasRepositorio,
  actaId: string,
): Promise<DetalleActaRevision> {
  return repositorio.obtenerDetalle(actaId);
}
