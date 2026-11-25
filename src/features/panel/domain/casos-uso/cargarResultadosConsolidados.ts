import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import type {
  ModoResultados,
  ResultadosConsolidados,
} from "../entidades/panelProvincial";
import type { PanelRepositorio } from "../repositorios/panelRepositorio";

export function cargarResultadosConsolidados(
  repositorio: PanelRepositorio,
  provinciaId: string,
  dignidad: DignidadActa,
  modo: ModoResultados,
): Promise<ResultadosConsolidados> {
  return repositorio.cargarResultados(provinciaId, dignidad, modo);
}
