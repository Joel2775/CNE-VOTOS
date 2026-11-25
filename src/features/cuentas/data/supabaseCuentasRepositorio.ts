import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/core/supabase/database.types";
import { ejecutarOnlineConTimeout } from "@/core/red/verificarConexionObligatoria";
import type {
  PerfilUsuario,
  SesionAutenticada,
} from "../domain/entidades/perfilUsuario";
import { esRolUsuario } from "../domain/entidades/perfilUsuario";
import type { CuentasRepositorio } from "../domain/repositorios/cuentasRepositorio";
import type {
  NuevoCoordinadorRecinto,
  NuevoVeedor,
} from "../domain/esquemas/cuentasEsquemas";

type PerfilFila = Pick<
  Database["public"]["Tables"]["perfiles"]["Row"],
  | "id"
  | "rol"
  | "nombres"
  | "apellidos"
  | "cedula"
  | "telefono"
  | "provincia_id"
  | "debe_cambiar_clave"
>;

function mapearPerfil(fila: PerfilFila): PerfilUsuario {
  if (!esRolUsuario(fila.rol)) {
    throw new Error("El perfil tiene un rol no reconocido.");
  }

  return {
    id: fila.id,
    rol: fila.rol,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    cedula: fila.cedula,
    telefono: fila.telefono,
    provincia_id: fila.provincia_id,
    debe_cambiar_clave: fila.debe_cambiar_clave,
  };
}

function traducirErrorAcceso(codigo: string | undefined): string {
  switch (codigo) {
    case "invalid_credentials":
      return "El correo o la contraseña no son correctos.";
    case "email_not_confirmed":
      return "Confirma tu correo antes de iniciar sesión.";
    case "user_not_found":
      return "No existe una cuenta habilitada con ese correo.";
    default:
      return "No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.";
  }
}

function extraerMensajeRespuesta(valor: unknown): string | null {
  if (typeof valor !== "object" || valor === null) {
    return null;
  }
  if ("error" in valor && typeof valor.error === "string") {
    return valor.error;
  }
  if ("message" in valor && typeof valor.message === "string") {
    return valor.message;
  }
  return null;
}

type RespuestaFuncion = {
  status: number;
  clone: () => { text: () => Promise<string> };
};

function esRespuestaFuncion(valor: unknown): valor is RespuestaFuncion {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "status" in valor &&
    typeof valor.status === "number" &&
    "clone" in valor &&
    typeof valor.clone === "function"
  );
}

async function mensajeErrorFuncion(error: unknown): Promise<string> {
  if (typeof error === "object" && error !== null && "context" in error) {
    const respuesta = error.context;
    if (esRespuestaFuncion(respuesta)) {
      let cuerpo: string;
      try {
        cuerpo = await respuesta.clone().text();
      } catch {
        return `El servidor rechazó la solicitud (HTTP ${respuesta.status}).`;
      }

      try {
        const mensaje = extraerMensajeRespuesta(JSON.parse(cuerpo));
        if (mensaje) {
          return mensaje;
        }
      } catch {
        // Si el cuerpo no es JSON, se informa el estado sin exponer texto arbitrario.
      }

      return `El servidor rechazó la solicitud (HTTP ${respuesta.status}).`;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message !== "Edge Function returned a non-2xx status code"
  ) {
    return error.message;
  }

  return "No se pudo crear la cuenta. Inténtalo nuevamente.";
}

export class SupabaseCuentasRepositorio implements CuentasRepositorio {
  constructor(private readonly cliente: SupabaseClient<Database>) {}

  async crearVeedor(datos: NuevoVeedor): Promise<{ id: string }> {
    return this.invitarCuenta(datos, "veedor");
  }

  async crearCoordinadorRecinto(
    datos: NuevoCoordinadorRecinto,
    recintoId?: string,
  ): Promise<{ id: string }> {
    return this.invitarCuenta(datos, "coordinador_recinto", recintoId);
  }

  private async invitarCuenta(
    datos: NuevoVeedor | NuevoCoordinadorRecinto,
    rolDestino: "veedor" | "coordinador_recinto",
    recintoId?: string,
  ): Promise<{ id: string }> {
    return ejecutarOnlineConTimeout(
      "No se pudo enviar la invitación.",
      async (signal) => {
        const { data, error } = await this.cliente.functions.invoke<{
          id: string;
        }>("crear-cuenta", {
          body: { ...datos, rolDestino, ...(recintoId ? { recintoId } : {}) },
          signal,
        });
        if (error) {
          throw new Error(await mensajeErrorFuncion(error));
        }
        if (!data?.id) {
          throw new Error(
            "El servidor no devolvió el identificador de la cuenta.",
          );
        }
        return data;
      },
    );
  }

  async procesarEnlaceAutenticacion(url: string): Promise<SesionAutenticada> {
    return ejecutarOnlineConTimeout(
      "No se pudo validar el enlace de acceso.",
      async () => {
        let enlace: URL;
        try {
          enlace = new URL(url);
        } catch {
          throw new Error("El enlace de acceso no tiene un formato válido.");
        }

        const parametros = new URLSearchParams(enlace.search);
        const parametrosFragmento = new URLSearchParams(
          enlace.hash.replace(/^#/, ""),
        );
        const codigo =
          parametros.get("code") ?? parametrosFragmento.get("code");
        const errorEnlace =
          parametros.get("error_description") ??
          parametrosFragmento.get("error_description");
        if (errorEnlace) {
          throw new Error(
            "El enlace venció o ya fue utilizado. Solicita uno nuevo.",
          );
        }

        let usuarioId: string | null = null;
        let correo: string | null = null;
        if (codigo) {
          const { data, error } =
            await this.cliente.auth.exchangeCodeForSession(codigo);
          if (error) {
            throw new Error("No se pudo validar el enlace. Solicita uno nuevo.");
          }
          usuarioId = data.user?.id ?? null;
          correo = data.user?.email ?? null;
        } else {
          const accessToken =
            parametros.get("access_token") ??
            parametrosFragmento.get("access_token");
          const refreshToken =
            parametros.get("refresh_token") ??
            parametrosFragmento.get("refresh_token");
          if (!accessToken || !refreshToken) {
            throw new Error("El enlace no contiene una sesión válida.");
          }

          const { data, error } = await this.cliente.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw new Error("No se pudo validar el enlace. Solicita uno nuevo.");
          }
          usuarioId = data.user?.id ?? null;
          correo = data.user?.email ?? null;
        }

        if (!usuarioId || !correo) {
          throw new Error("El enlace no corresponde a una cuenta válida.");
        }
        return {
          usuario: { id: usuarioId, correo },
          perfil: await this.cargarPerfil(usuarioId),
        };
      },
    );
  }

  async solicitarRecuperacion(
    correo: string,
    redirectTo: string,
  ): Promise<void> {
    return ejecutarOnlineConTimeout(
      "No se pudo enviar el correo de recuperación.",
      async () => {
        const { error } = await this.cliente.auth.resetPasswordForEmail(
          correo,
          { redirectTo },
        );
        if (error) {
          throw new Error(
            "No se pudo enviar el correo de recuperación. Revisa tu conexión e inténtalo de nuevo.",
          );
        }
      },
    );
  }

  async cambiarContrasena(
    contrasena: string,
  ): Promise<SesionAutenticada> {
    return ejecutarOnlineConTimeout(
      "No se pudo guardar la contraseña.",
      async () => {
        const { data, error } = await this.cliente.auth.updateUser({
          password: contrasena,
        });
        if (error) {
          throw new Error(
            "No se pudo guardar la contraseña. Verifica que el enlace siga vigente.",
          );
        }
        if (!data.user?.id || !data.user.email) {
          throw new Error("No se pudo validar la cuenta después del cambio.");
        }

        const perfil = await this.cargarPerfil(data.user.id);
        if (perfil.debe_cambiar_clave) {
          throw new Error(
            "La contraseña se guardó, pero no se pudo completar el acceso. Inténtalo nuevamente.",
          );
        }

        return {
          usuario: { id: data.user.id, correo: data.user.email },
          perfil,
        };
      },
    );
  }

  async iniciarSesion(
    correo: string,
    contrasena: string,
  ): Promise<SesionAutenticada> {
    return ejecutarOnlineConTimeout(
      "No se pudo iniciar sesión.",
      async () => {
        const { data, error } = await this.cliente.auth.signInWithPassword({
          email: correo,
          password: contrasena,
        });

        if (error) {
          throw new Error(traducirErrorAcceso(error.code));
        }

        if (!data.user.email) {
          throw new Error("La cuenta no tiene un correo asociado.");
        }

        const perfil = await this.cargarPerfil(data.user.id);
        return {
          usuario: { id: data.user.id, correo: data.user.email },
          perfil,
        };
      },
    );
  }

  async cerrarSesion(): Promise<void> {
    const { error } = await this.cliente.auth.signOut();
    if (error) {
      throw new Error(
        "No se pudo cerrar la sesión. Inténtalo nuevamente.",
      );
    }
  }

  async obtenerPerfilActual(): Promise<SesionAutenticada | null> {
    const { data, error } = await this.cliente.auth.getSession();
    if (error) {
      throw new Error("No se pudo restaurar la sesión guardada.");
    }

    const usuario = data.session?.user;
    if (!usuario) {
      return null;
    }
    if (!usuario.email) {
      throw new Error("La cuenta no tiene un correo asociado.");
    }

    return {
      usuario: { id: usuario.id, correo: usuario.email },
      perfil: await this.cargarPerfil(usuario.id),
    };
  }

  private async cargarPerfil(usuarioId: string): Promise<PerfilUsuario> {
    const { data, error } = await this.cliente
      .from("perfiles")
      .select(
        "id, rol, nombres, apellidos, cedula, telefono, provincia_id, debe_cambiar_clave",
      )
      .eq("id", usuarioId)
      .maybeSingle();

    if (error) {
      if (error.code === "42703" || error.code === "PGRST204") {
        throw new Error(
          "La base de datos no tiene la columna de primer acceso. Verifica que la migración 0008_primer_acceso.sql esté aplicada y que el esquema de Supabase esté actualizado.",
        );
      }
      if (error.code === "42501") {
        throw new Error(
          "No tienes permiso para consultar tu perfil. Revisa las políticas RLS de perfiles.",
        );
      }
      throw new Error(
        `No se pudo cargar tu perfil (código ${error.code}). Revisa tu conexión y los permisos de acceso.`,
      );
    }
    if (!data) {
      throw new Error(
        "La cuenta no tiene un perfil habilitado. Contacta a tu responsable.",
      );
    }

    return mapearPerfil(data);
  }
}
