import type {
  AvanceProvincial,
  ModoResultados,
  ResultadosConsolidados,
} from "../entidades/panelProvincial";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";

export interface PanelRepositorio {
  cargarAvance(provinciaId: string): Promise<AvanceProvincial>;
  cargarResultados(
    provinciaId: string,
    dignidad: DignidadActa,
    modo: ModoResultados,
  ): Promise<ResultadosConsolidados>;
}
