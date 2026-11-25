import type { AsignacionesRepositorio } from "../repositorios/asignacionesRepositorio";

export function listarMesasRecinto(
  repositorio: AsignacionesRepositorio,
  coordinadorId: string,
) {
  return repositorio.listarMesasRecinto(coordinadorId);
}
