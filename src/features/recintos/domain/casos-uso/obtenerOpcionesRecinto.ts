import type { OpcionesRecinto } from "../entidades/recinto";
import type { RecintosRepositorio } from "../repositorios/recintosRepositorio";

export function obtenerOpcionesRecinto(
  repositorio: RecintosRepositorio,
  provinciaId: string,
): Promise<OpcionesRecinto> {
  return repositorio.obtenerOpcionesFormulario(provinciaId);
}
