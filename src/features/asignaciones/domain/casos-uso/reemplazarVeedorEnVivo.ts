import { reemplazarVeedorSchema } from "../esquemas/asignacionEsquemas";
import type { AsignacionesRepositorio } from "../repositorios/asignacionesRepositorio";

export function reemplazarVeedorEnVivo(
  repositorio: AsignacionesRepositorio,
  datos: unknown,
): Promise<void> {
  const reemplazo = reemplazarVeedorSchema.parse(datos);
  return repositorio.reemplazarVeedorEnVivo(reemplazo);
}
