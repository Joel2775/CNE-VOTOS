import { correoSchema } from "../esquemas/cuentasEsquemas";
import type { CuentasRepositorio } from "../repositorios/cuentasRepositorio";

export function solicitarRecuperacion(
  repositorio: CuentasRepositorio,
  correo: unknown,
  redirectTo: string,
): Promise<void> {
  const correoValidado = correoSchema.parse(correo);
  return repositorio.solicitarRecuperacion(correoValidado, redirectTo);
}
