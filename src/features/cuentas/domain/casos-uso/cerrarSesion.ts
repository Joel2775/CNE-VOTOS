import type { CuentasRepositorio } from "../repositorios/cuentasRepositorio";

export function cerrarSesion(repositorio: CuentasRepositorio): Promise<void> {
  return repositorio.cerrarSesion();
}
