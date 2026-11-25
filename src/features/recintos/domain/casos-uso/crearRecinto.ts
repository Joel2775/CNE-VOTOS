import type { NuevoRecintoValidado } from "../esquemas/recintoEsquemas";
import type { RecintosRepositorio } from "../repositorios/recintosRepositorio";

export async function crearRecinto(
  repositorio: RecintosRepositorio,
  datos: NuevoRecintoValidado,
): Promise<string> {
  return repositorio.crear({
    ...datos,
    coordinador_id: datos.coordinador_id || undefined,
  });
}
