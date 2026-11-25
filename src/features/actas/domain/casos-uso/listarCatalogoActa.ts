import type { DignidadActa } from "../entidades/acta";
import type { ActasRepositorio } from "../repositorios/actasRepositorio";

export function listarCatalogoActa(
  repositorio: ActasRepositorio,
  dignidad: DignidadActa,
) {
  return repositorio.listarCatalogo(dignidad);
}
