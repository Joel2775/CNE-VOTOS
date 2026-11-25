import { useQuery } from "@tanstack/react-query";

import { actas } from "@/core/di/actas";

export function usePrecargaCatalogoActas() {
  return useQuery({
    queryKey: ["catalogo-actas"],
    queryFn: actas.precargarCatalogos,
    networkMode: "always",
    refetchOnReconnect: "always",
    staleTime: 5 * 60 * 1000,
  });
}
