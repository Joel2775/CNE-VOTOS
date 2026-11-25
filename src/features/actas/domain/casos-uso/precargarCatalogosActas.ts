import type { ActasRepositorio } from "../repositorios/actasRepositorio";
import type { CatalogoActas } from "../entidades/acta";

export function precargarCatalogosActas(
  repositorio: ActasRepositorio,
): Promise<CatalogoActas> {
  return repositorio.precargarCatalogos();
}
