import { useMutation } from "@tanstack/react-query";

import { cuentas } from "@/core/di/cuentas";
import type { NuevoVeedor } from "@/features/cuentas/domain/esquemas/cuentasEsquemas";

export function useCrearVeedor() {
  return useMutation({
    mutationFn: (datos: NuevoVeedor) => cuentas.crearVeedor(datos),
  });
}
