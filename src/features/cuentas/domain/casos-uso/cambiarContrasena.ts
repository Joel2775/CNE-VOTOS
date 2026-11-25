import { contrasenaSeguraSchema } from "../esquemas/cuentasEsquemas";
import type { CuentasRepositorio } from "../repositorios/cuentasRepositorio";

export function cambiarContrasena(
  repositorio: CuentasRepositorio,
  contrasena: unknown,
) {
  const contrasenaValidada = contrasenaSeguraSchema.parse(contrasena);
  return repositorio.cambiarContrasena(contrasenaValidada);
}
