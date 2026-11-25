import type { ActaOffline } from "../entidades/acta";
import type { ActasRepositorio } from "../repositorios/actasRepositorio";

export function guardarActaOffline(
  repositorio: ActasRepositorio,
  acta: ActaOffline,
) {
  return repositorio.guardarActaOffline(acta);
}
