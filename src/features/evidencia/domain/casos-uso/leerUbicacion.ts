import type { Coordenadas } from "../entidades/geovalla";
import type { EvidenciaRepositorio } from "../repositorios/evidenciaRepositorio";

export function leerUbicacion(
  repositorio: EvidenciaRepositorio,
  recinto: Coordenadas,
) {
  return repositorio.leerUbicacion(recinto);
}
