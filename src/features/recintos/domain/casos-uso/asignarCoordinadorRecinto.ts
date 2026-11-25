import type { RecintosRepositorio } from "../repositorios/recintosRepositorio";

export function asignarCoordinadorRecinto(
  repositorio: RecintosRepositorio,
  recintoId: string,
  coordinadorId: string,
): Promise<void> {
  if (!recintoId || !coordinadorId) {
    throw new Error("Selecciona el recinto y el coordinador.");
  }

  return repositorio.asignarCoordinador(recintoId, coordinadorId);
}
