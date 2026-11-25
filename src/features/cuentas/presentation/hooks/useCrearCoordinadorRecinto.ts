import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cuentas } from "@/core/di/cuentas";

export function useCrearCoordinadorRecinto(provinciaId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      datos,
      recintoId,
    }: {
      datos: Parameters<typeof cuentas.crearCoordinadorRecinto>[0];
      recintoId?: string;
    }) => cuentas.crearCoordinadorRecinto(datos, recintoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["recintos", provinciaId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["recintos-opciones", provinciaId],
      });
    },
  });
}
