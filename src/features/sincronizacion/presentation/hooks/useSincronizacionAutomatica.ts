import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { sincronizacion } from "@/core/di/sincronizacion";

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudieron sincronizar las actas pendientes.";
}

export function useSincronizacionAutomatica(enLinea: boolean | null) {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ["sincronizacion-actas"],
    queryFn: sincronizacion.sincronizarPendientes,
    enabled: enLinea === true,
    retry: false,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (consulta.data) {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actas-pendientes"] }),
        queryClient.invalidateQueries({
          queryKey: ["mesas-asignadas-veedor"],
        }),
      ]);
    }
  }, [consulta.data, queryClient]);

  const primerError = consulta.data?.errores[0]?.mensaje;
  const error =
    consulta.error !== null
      ? mensajeDeError(consulta.error)
      : primerError
        ? `Hay actas que no se pudieron enviar: ${primerError}`
        : null;

  return {
    error,
    reintentar: () => consulta.refetch(),
  };
}
