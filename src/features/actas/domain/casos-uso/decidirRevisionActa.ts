import type { DecisionRevisionActa } from "../entidades/revisionActa";
import type { RevisionActasRepositorio } from "../repositorios/revisionActasRepositorio";

export function decidirRevisionActa(
  repositorio: RevisionActasRepositorio,
  actaId: string,
  decision: DecisionRevisionActa,
  motivo: string | null,
): Promise<void> {
  if (
    (decision === "observada" || decision === "rechazada") &&
    !motivo?.trim()
  ) {
    throw new Error("Escribe el motivo antes de observar o rechazar el acta.");
  }

  return repositorio.decidirRevision(actaId, decision, motivo?.trim() || null);
}
