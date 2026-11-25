import type { EvidenciaRepositorio } from "../repositorios/evidenciaRepositorio";

export function calcularHashSha256(
  repositorio: EvidenciaRepositorio,
  uri: string,
) {
  return repositorio.calcularHashSha256(uri);
}
