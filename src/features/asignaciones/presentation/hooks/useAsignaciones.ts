import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { asignaciones } from "@/core/di/asignaciones";
import { useEstadoConectividad } from "@/core/red/useEstadoConectividad";

export function useAsignacionesRecinto(
  coordinadorId: string | null,
  enLinea: boolean,
) {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ["asignaciones-recinto", coordinadorId],
    queryFn: () => asignaciones.listarMesasRecinto(coordinadorId!),
    enabled: Boolean(coordinadorId && enLinea),
  });
  const invalidar = () => {
    void queryClient.invalidateQueries({
      queryKey: ["asignaciones-recinto", coordinadorId],
    });
  };
  const asignar = useMutation({
    mutationFn: asignaciones.asignarVeedor,
    onSuccess: invalidar,
  });
  const reemplazar = useMutation({
    mutationFn: asignaciones.reemplazar,
    onSuccess: invalidar,
  });

  return { consulta, asignar, reemplazar };
}

export function useMesasAsignadasVeedor(veedorId: string | null) {
  const queryClient = useQueryClient();
  const conexion = useEstadoConectividad();
  const local = useQuery({
    queryKey: ["mesas-asignadas-veedor-local", veedorId],
    queryFn: () => asignaciones.listarMesasAsignadasLocal(veedorId!),
    enabled: Boolean(veedorId),
  });
  const remoto = useQuery({
    queryKey: ["mesas-asignadas-veedor", veedorId],
    queryFn: () => asignaciones.listarMesasAsignadas(veedorId!),
    enabled: Boolean(veedorId) && conexion.enLinea === true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (remoto.data) {
      void queryClient.invalidateQueries({
        queryKey: ["mesas-asignadas-veedor-local", veedorId],
      });
    }
  }, [queryClient, remoto.data, veedorId]);

  return {
    ...remoto,
    data: remoto.data ?? local.data,
    error: remoto.error ?? local.error,
    isError: remoto.isError || (!remoto.data && local.isError),
    isLoading:
      !remoto.data &&
      (local.isLoading ||
        (conexion.enLinea === true && remoto.isLoading)),
  };
}
