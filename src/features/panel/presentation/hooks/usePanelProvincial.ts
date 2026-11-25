import { useQuery } from "@tanstack/react-query";

import { panel } from "@/core/di/panel";
import { useRealtimeActas } from "@/core/red/useRealtimeActas";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import type { ModoResultados } from "@/features/panel/domain/entidades/panelProvincial";

export function usePanelProvincial(
  provinciaId: string | null,
  dignidad: DignidadActa,
  modo: ModoResultados,
) {
  useRealtimeActas();
  const habilitado = Boolean(provinciaId);
  const avance = useQuery({
    queryKey: ["panel-provincial", provinciaId, "avance"],
    queryFn: () => panel.cargarAvance(provinciaId!),
    enabled: habilitado,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  const resultados = useQuery({
    queryKey: ["panel-provincial", provinciaId, "resultados", dignidad, modo],
    queryFn: () =>
      panel.cargarResultados(provinciaId!, dignidad, modo),
    enabled: habilitado,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  return { avance, resultados };
}
