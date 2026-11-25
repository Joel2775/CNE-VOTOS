import type {
  ActaRevision,
  FiltrosBandejaRevision,
} from "../entidades/revisionActa";
import type { RevisionActasRepositorio } from "../repositorios/revisionActasRepositorio";

export function listarBandejaRevision(
  repositorio: RevisionActasRepositorio,
  filtros: FiltrosBandejaRevision,
): Promise<ActaRevision[]> {
  return repositorio.listarBandeja(filtros);
}
