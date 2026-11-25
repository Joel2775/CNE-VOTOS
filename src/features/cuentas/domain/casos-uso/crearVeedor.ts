import { nuevoVeedorSchema } from "../esquemas/cuentasEsquemas";
import type { CuentasRepositorio } from "../repositorios/cuentasRepositorio";

export function crearVeedor(
  repositorio: CuentasRepositorio,
  datos: unknown,
): Promise<{ id: string }> {
  const nuevoVeedor = nuevoVeedorSchema.parse(datos);
  return repositorio.crearVeedor(nuevoVeedor);
}
