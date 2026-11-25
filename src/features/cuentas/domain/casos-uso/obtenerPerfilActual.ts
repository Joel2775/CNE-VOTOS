import type { CuentasRepositorio } from "../repositorios/cuentasRepositorio";

export function obtenerPerfilActual(repositorio: CuentasRepositorio) {
  return repositorio.obtenerPerfilActual();
}
