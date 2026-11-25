import { useMutation } from "@tanstack/react-query";

import { cuentas } from "@/core/di/cuentas";

export function useCambiarContrasena() {
  return useMutation({
    mutationFn: (contrasena: string) => cuentas.cambiarContrasena(contrasena),
  });
}
