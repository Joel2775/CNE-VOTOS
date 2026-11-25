import { useEffect, useState } from "react";

import { cuentas } from "@/core/di/cuentas";
import { esErrorSinConexion } from "@/core/red/verificarConexionObligatoria";
import { useSesionStore } from "@/core/store/sesionStore";
import type { CredencialesAcceso } from "@/features/cuentas/domain/esquemas/cuentasEsquemas";

export function useAcceso() {
  const establecerSesion = useSesionStore((estado) => estado.iniciarSesion);
  const [error, setError] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [estadoAcceso, setEstadoAcceso] = useState<"exito" | "error" | null>(
    null,
  );
  const [sesionPendiente, setSesionPendiente] = useState<
    Awaited<ReturnType<typeof cuentas.iniciarSesion>> | null
  >(null);

  async function acceder(credenciales: CredencialesAcceso): Promise<void> {
    setError(null);
    setSinConexion(false);
    setEstadoAcceso(null);
    setSesionPendiente(null);
    try {
      const sesion = await cuentas.iniciarSesion(credenciales);
      setSesionPendiente(sesion);
      setEstadoAcceso("exito");
    } catch (resultado) {
      setSinConexion(esErrorSinConexion(resultado));
      setEstadoAcceso("error");
      setError(
        resultado instanceof Error
          ? resultado.message
          : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
    }
  }

  async function confirmarAcceso(): Promise<void> {
    if (!sesionPendiente) {
      return;
    }

    try {
      await establecerSesion(sesionPendiente.usuario, sesionPendiente.perfil);
    } catch (resultado) {
      setSinConexion(esErrorSinConexion(resultado));
      setEstadoAcceso("error");
      setError(
        resultado instanceof Error
          ? resultado.message
          : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
      setSesionPendiente(null);
    }
  }

  function limpiarError() {
    setError(null);
    setSinConexion(false);
    setEstadoAcceso(null);
    setSesionPendiente(null);
  }

  return {
    acceder,
    confirmarAcceso,
    error,
    estadoAcceso,
    sinConexion,
    limpiarError,
  };
}

export function useRestaurarSesion(): void {
  const hidratarSesion = useSesionStore((estado) => estado.hidratarSesion);

  useEffect(() => {
    void hidratarSesion(() => cuentas.obtenerPerfilActual());
  }, [hidratarSesion]);
}
