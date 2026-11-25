import { supabase } from "@/core/supabase/client";
import { cerrarSesion as cerrarSesionCaso } from "@/features/cuentas/domain/casos-uso/cerrarSesion";
import { cambiarContrasena as cambiarContrasenaCaso } from "@/features/cuentas/domain/casos-uso/cambiarContrasena";
import { crearCoordinadorRecinto as crearCoordinadorRecintoCaso } from "@/features/cuentas/domain/casos-uso/crearCoordinadorRecinto";
import { crearVeedor as crearVeedorCaso } from "@/features/cuentas/domain/casos-uso/crearVeedor";
import { iniciarSesion as iniciarSesionCaso } from "@/features/cuentas/domain/casos-uso/iniciarSesion";
import { obtenerPerfilActual as obtenerPerfilActualCaso } from "@/features/cuentas/domain/casos-uso/obtenerPerfilActual";
import { procesarEnlaceAutenticacion as procesarEnlaceAutenticacionCaso } from "@/features/cuentas/domain/casos-uso/procesarEnlaceAutenticacion";
import { solicitarRecuperacion as solicitarRecuperacionCaso } from "@/features/cuentas/domain/casos-uso/solicitarRecuperacion";
import type {
  CredencialesAcceso,
  NuevoCoordinadorRecinto,
  NuevoVeedor,
} from "@/features/cuentas/domain/esquemas/cuentasEsquemas";
import { SupabaseCuentasRepositorio } from "@/features/cuentas/data/supabaseCuentasRepositorio";

const cuentasRepositorio = new SupabaseCuentasRepositorio(supabase);

export const cuentas = {
  crearVeedor(datos: NuevoVeedor) {
    return crearVeedorCaso(cuentasRepositorio, datos);
  },
  crearCoordinadorRecinto(
    datos: NuevoCoordinadorRecinto,
    recintoId?: string,
  ) {
    return crearCoordinadorRecintoCaso(
      cuentasRepositorio,
      datos,
      recintoId,
    );
  },
  procesarEnlaceAutenticacion(url: string) {
    return procesarEnlaceAutenticacionCaso(cuentasRepositorio, url);
  },
  solicitarRecuperacion(correo: unknown, redirectTo: string) {
    return solicitarRecuperacionCaso(
      cuentasRepositorio,
      correo,
      redirectTo,
    );
  },
  cambiarContrasena(contrasena: unknown) {
    return cambiarContrasenaCaso(cuentasRepositorio, contrasena);
  },
  iniciarSesion(credenciales: CredencialesAcceso) {
    return iniciarSesionCaso(cuentasRepositorio, credenciales);
  },
  cerrarSesion() {
    return cerrarSesionCaso(cuentasRepositorio);
  },
  obtenerPerfilActual() {
    return obtenerPerfilActualCaso(cuentasRepositorio);
  },
};
