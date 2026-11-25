import { asignarVeedorSchema } from "../esquemas/asignacionEsquemas";
import type { AsignacionesRepositorio } from "../repositorios/asignacionesRepositorio";

export function asignarVeedorMesa(
  repositorio: AsignacionesRepositorio,
  datos: unknown,
): Promise<void> {
  const asignacion = asignarVeedorSchema.parse(datos);
  return repositorio.asignarVeedorMesa(
    asignacion.mesa_id,
    asignacion.veedor_id,
  );
}
