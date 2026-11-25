import type { Recinto } from "../entidades/recinto";
import type { RecintosRepositorio } from "../repositorios/recintosRepositorio";

export function listarRecintosProvincia(
  repositorio: RecintosRepositorio,
  provinciaId: string,
): Promise<Recinto[]> {
  return repositorio.listarPorProvincia(provinciaId);
}
