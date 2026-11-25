import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

import type {
  PerfilUsuario,
  SesionAutenticada,
  UsuarioAutenticado,
} from "@/features/cuentas/domain/entidades/perfilUsuario";
import { esRolUsuario } from "@/features/cuentas/domain/entidades/perfilUsuario";

export type { PerfilUsuario, UsuarioAutenticado };

export type GrupoRuta =
  | "/(auth)"
  | "/(provincial)"
  | "/(recinto)"
  | "/(veedor)";

type EstadoSesion = {
  usuario: UsuarioAutenticado | null;
  perfil: PerfilUsuario | null;
  flujoEnlace: "invitacion" | "recuperacion" | null;
  cargando: boolean;
  hidratado: boolean;
  errorHidratacion: string | null;
  limpiarErrorHidratacion: () => void;
  iniciarSesion: (
    usuario: UsuarioAutenticado,
    perfil: PerfilUsuario,
    flujoEnlace?: "invitacion" | "recuperacion" | null,
  ) => Promise<void>;
  limpiarFlujoEnlace: () => void;
  cerrarSesion: () => Promise<void>;
  hidratarSesion: (
    restaurar: () => Promise<SesionAutenticada | null>,
  ) => Promise<void>;
};

const CLAVE_PERFIL_SESION = "cne-votos-perfil-sesion";

function esPerfilUsuario(valor: unknown): valor is PerfilUsuario {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }

  const perfil = valor as Record<string, unknown>;
  return (
    typeof perfil.id === "string" &&
    typeof perfil.rol === "string" &&
    esRolUsuario(perfil.rol) &&
    typeof perfil.nombres === "string" &&
    typeof perfil.apellidos === "string" &&
    typeof perfil.cedula === "string" &&
    typeof perfil.telefono === "string" &&
    typeof perfil.provincia_id === "string" &&
    typeof perfil.debe_cambiar_clave === "boolean"
  );
}

function esSesionAutenticada(valor: unknown): valor is SesionAutenticada {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }

  const sesion = valor as Record<string, unknown>;
  if (
    typeof sesion.usuario !== "object" ||
    sesion.usuario === null ||
    !esPerfilUsuario(sesion.perfil)
  ) {
    return false;
  }

  const usuario = sesion.usuario as Record<string, unknown>;
  return (
    typeof usuario.id === "string" &&
    typeof usuario.correo === "string" &&
    usuario.id === sesion.perfil.id
  );
}

function parsearSesionGuardada(valor: string): SesionAutenticada | null {
  try {
    const sesion: unknown = JSON.parse(valor);
    return esSesionAutenticada(sesion) ? sesion : null;
  } catch {
    return null;
  }
}

async function obtenerSesionGuardada(): Promise<SesionAutenticada | null> {
  const valorGuardado = await SecureStore.getItemAsync(CLAVE_PERFIL_SESION);
  if (valorGuardado === null) {
    return null;
  }

  const sesion = parsearSesionGuardada(valorGuardado);
  if (sesion === null) {
    await SecureStore.deleteItemAsync(CLAVE_PERFIL_SESION);
  }
  return sesion;
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo restaurar la sesión guardada.";
}

export const useSesionStore = create<EstadoSesion>((set, get) => ({
  usuario: null,
  perfil: null,
  flujoEnlace: null,
  cargando: false,
  hidratado: false,
  errorHidratacion: null,
  limpiarErrorHidratacion() {
    set({ errorHidratacion: null });
  },
  async iniciarSesion(usuario, perfil, flujoEnlace = null) {
    if (usuario.id !== perfil.id) {
      throw new Error("La cuenta y el perfil no corresponden.");
    }

    await SecureStore.setItemAsync(
      CLAVE_PERFIL_SESION,
      JSON.stringify({ usuario, perfil }),
    );
    set({
      usuario,
      perfil,
      flujoEnlace,
      cargando: false,
      hidratado: true,
      errorHidratacion: null,
    });
  },
  limpiarFlujoEnlace() {
    set({ flujoEnlace: null });
  },
  async cerrarSesion() {
    set({
      usuario: null,
      perfil: null,
      flujoEnlace: null,
      cargando: false,
      hidratado: true,
      errorHidratacion: null,
    });
    await SecureStore.deleteItemAsync(CLAVE_PERFIL_SESION);
  },
  async hidratarSesion(restaurar) {
    if (get().hidratado || get().cargando) {
      return;
    }

    set({ cargando: true, errorHidratacion: null });
    let sesionGuardada: SesionAutenticada | null = null;

    try {
      sesionGuardada = await obtenerSesionGuardada();

      const sesionActual = await restaurar();
      if (sesionActual) {
        await SecureStore.setItemAsync(
          CLAVE_PERFIL_SESION,
          JSON.stringify(sesionActual),
        );
      } else {
        await SecureStore.deleteItemAsync(CLAVE_PERFIL_SESION);
      }

      set({
        usuario: sesionActual?.usuario ?? null,
        perfil: sesionActual?.perfil ?? null,
        flujoEnlace: null,
        cargando: false,
        hidratado: true,
      });
    } catch (error) {
      if (sesionGuardada) {
        set({
          usuario: sesionGuardada.usuario,
          perfil: sesionGuardada.perfil,
          cargando: false,
          hidratado: true,
          errorHidratacion:
            "No se pudo validar la sesión con el servidor; se conserva el último perfil guardado de forma segura.",
        });
        return;
      }

      set({
        usuario: null,
        perfil: null,
        cargando: false,
        hidratado: true,
        errorHidratacion: mensajeDeError(error),
      });
    }
  },
}));

export function obtenerGrupoInicial(
  usuario: UsuarioAutenticado | null,
  perfil: PerfilUsuario | null,
): GrupoRuta {
  if (!usuario || !perfil || usuario.id !== perfil.id) {
    return "/(auth)";
  }
  if (perfil.debe_cambiar_clave) {
    return "/(auth)";
  }

  switch (perfil.rol) {
    case "coordinador_provincial":
      return "/(provincial)";
    case "coordinador_recinto":
      return "/(recinto)";
    case "veedor":
      return "/(veedor)";
  }
}
