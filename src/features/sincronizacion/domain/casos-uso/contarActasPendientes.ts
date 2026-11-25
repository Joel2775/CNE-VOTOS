import type { SincronizacionRepositorio } from "../repositorios/sincronizacionRepositorio";

export function contarActasPendientes(
  repositorio: SincronizacionRepositorio,
): Promise<number> {
  return repositorio.contarActasPendientes();
}

export function sincronizarActasPendientes(
  repositorio: SincronizacionRepositorio,
) {
  return repositorio.sincronizarPendientes();
}
