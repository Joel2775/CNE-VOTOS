import type { AsignacionesRepositorio } from "../repositorios/asignacionesRepositorio";

export function listarMesasAsignadasVeedor(
  repositorio: AsignacionesRepositorio,
  veedorId: string,
) {
  return repositorio.listarMesasAsignadasVeedor(veedorId);
}
