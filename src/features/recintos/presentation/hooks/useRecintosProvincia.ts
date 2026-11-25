import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { recintos } from "@/core/di/recintos";

export function useRecintosProvincia(provinciaId: string | null) {
  const queryClient = useQueryClient();
  const habilitado = Boolean(provinciaId);

  const lista = useQuery({
    queryKey: ["recintos", provinciaId],
    queryFn: () => recintos.listarPorProvincia(provinciaId!),
    enabled: habilitado,
  });
  const opciones = useQuery({
    queryKey: ["recintos-opciones", provinciaId],
    queryFn: () => recintos.obtenerOpciones(provinciaId!),
    enabled: habilitado,
  });
  const crear = useMutation({
    mutationFn: recintos.crear,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recintos", provinciaId] });
      void queryClient.invalidateQueries({
        queryKey: ["recintos-opciones", provinciaId],
      });
    },
  });
  const asignarCoordinador = useMutation({
    mutationFn: ({
      recintoId,
      coordinadorId,
    }: {
      recintoId: string;
      coordinadorId: string;
    }) => recintos.asignarCoordinador(recintoId, coordinadorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recintos", provinciaId] });
      void queryClient.invalidateQueries({
        queryKey: ["recintos-opciones", provinciaId],
      });
    },
  });

  return { lista, opciones, crear, asignarCoordinador };
}
