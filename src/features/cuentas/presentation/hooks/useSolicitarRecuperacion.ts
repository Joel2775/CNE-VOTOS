import * as Linking from "expo-linking";
import { useMutation } from "@tanstack/react-query";

import { cuentas } from "@/core/di/cuentas";

export function useSolicitarRecuperacion() {
  return useMutation({
    mutationFn: (correo: string) =>
      cuentas.solicitarRecuperacion(
        correo,
        Linking.createURL("recuperar-contrasena"),
      ),
  });
}
