import { supabase } from "@/core/supabase/client";
import { cargarAvanceProvincial } from "@/features/panel/domain/casos-uso/cargarAvanceProvincial";
import { cargarResultadosConsolidados } from "@/features/panel/domain/casos-uso/cargarResultadosConsolidados";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import type { ModoResultados } from "@/features/panel/domain/entidades/panelProvincial";
import { SupabasePanelRepositorio } from "@/features/panel/data/supabasePanelRepositorio";

const repositorio = new SupabasePanelRepositorio(supabase);

export const panel = {
  cargarAvance(provinciaId: string) {
    return cargarAvanceProvincial(repositorio, provinciaId);
  },
  cargarResultados(
    provinciaId: string,
    dignidad: DignidadActa,
    modo: ModoResultados,
  ) {
    return cargarResultadosConsolidados(
      repositorio,
      provinciaId,
      dignidad,
      modo,
    );
  },
};
