import type { CuentasRepositorio } from "../repositorios/cuentasRepositorio";

export function procesarEnlaceAutenticacion(
  repositorio: CuentasRepositorio,
  url: string,
) {
  return repositorio.procesarEnlaceAutenticacion(url);
}
