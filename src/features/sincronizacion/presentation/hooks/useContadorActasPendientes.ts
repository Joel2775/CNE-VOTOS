import { useQuery } from "@tanstack/react-query";

import { sincronizacion } from "@/core/di/sincronizacion";

export function useContadorActasPendientes() {
  return useQuery({
    queryKey: ["actas-pendientes"],
    queryFn: sincronizacion.contarActasPendientes,
    refetchInterval: 10000,
  });
}
