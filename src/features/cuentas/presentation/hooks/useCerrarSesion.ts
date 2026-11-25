import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { limpiarCacheLocal } from "@/core/offline/limpiarCacheLocal";
import { detenerPersistenciaConsultas } from "@/core/offline/persistenciaConsultas";
import { cuentas } from "@/core/di/cuentas";
import { useSesionStore } from "@/core/store/sesionStore";

export function useCerrarSesion() {
  const cerrarSesionLocal = useSesionStore((estado) => estado.cerrarSesion);
  const clienteConsultasContexto = useQueryClient();
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cerrar(): Promise<void> {
    if (cerrando) {
      return;
    }
    setCerrando(true);
    setError(null);
    try {
      await cuentas.cerrarSesion();
      await cerrarSesionLocal();
      await detenerPersistenciaConsultas();
      await limpiarCacheLocal();
      clienteConsultasContexto.clear();
    } catch (resultado) {
      setError(
        resultado instanceof Error
          ? resultado.message
          : "No se pudo cerrar la sesión de forma segura.",
      );
    } finally {
      setCerrando(false);
    }
  }

  return { cerrar, cerrando, error };
}
