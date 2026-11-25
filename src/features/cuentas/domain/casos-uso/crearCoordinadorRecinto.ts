import { nuevoCoordinadorRecintoSchema } from "../esquemas/cuentasEsquemas";
import type { CuentasRepositorio } from "../repositorios/cuentasRepositorio";

export function crearCoordinadorRecinto(
  repositorio: CuentasRepositorio,
  datos: unknown,
  recintoId?: string,
): Promise<{ id: string }> {
  const nuevoCoordinador = nuevoCoordinadorRecintoSchema.parse(datos);
  return repositorio.crearCoordinadorRecinto(nuevoCoordinador, recintoId);
}
