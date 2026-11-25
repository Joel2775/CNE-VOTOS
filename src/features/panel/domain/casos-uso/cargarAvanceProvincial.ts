import type { AvanceProvincial } from "../entidades/panelProvincial";
import type { PanelRepositorio } from "../repositorios/panelRepositorio";

export function cargarAvanceProvincial(
  repositorio: PanelRepositorio,
  provinciaId: string,
): Promise<AvanceProvincial> {
  return repositorio.cargarAvance(provinciaId);
}
