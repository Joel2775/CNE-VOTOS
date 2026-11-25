import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { actasRevision } from "@/core/di/revisionActas";
import type {
  DecisionRevisionActa,
  EstadoRevisionActa,
} from "@/features/actas/domain/entidades/revisionActa";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import { useRealtimeActas } from "@/core/red/useRealtimeActas";

export function useBandejaRevisionActas(
  coordinadorId: string | null,
  estado: EstadoRevisionActa | "todas",
  dignidad: DignidadActa | "todas",
) {
  useRealtimeActas();
  return useQuery({
    queryKey: ["revision-actas", coordinadorId, estado, dignidad],
    queryFn: () =>
      actasRevision.listarBandeja({
        coordinadorId: coordinadorId!,
        estado,
        dignidad,
      }),
    enabled: Boolean(coordinadorId),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useDetalleRevisionActa(actaId: string | null) {
  return useQuery({
    queryKey: ["revision-actas-detalle", actaId],
    queryFn: () => actasRevision.obtenerDetalle(actaId!),
    enabled: Boolean(actaId),
  });
}

export function useDecidirRevisionActa(
  coordinadorId: string | null,
  estado: EstadoRevisionActa | "todas",
  dignidad: DignidadActa | "todas",
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      actaId,
      decision,
      motivo,
    }: {
      actaId: string;
      decision: DecisionRevisionActa;
      motivo: string | null;
    }) => actasRevision.decidir(actaId, decision, motivo),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["revision-actas", coordinadorId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["revision-actas-detalle", variables.actaId],
        }),
        queryClient.invalidateQueries({ queryKey: ["panel-provincial"] }),
      ]);
    },
  });
}

export function useCorregirActa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (correccion: Parameters<typeof actasRevision.corregir>[0]) =>
      actasRevision.corregir(correccion),
    onSuccess: async (_data, correccion) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["panel-provincial"] }),
        queryClient.invalidateQueries({ queryKey: ["revision-actas"] }),
        queryClient.invalidateQueries({
          queryKey: ["revision-actas-detalle", correccion.actaId],
        }),
      ]);
    },
  });
}
