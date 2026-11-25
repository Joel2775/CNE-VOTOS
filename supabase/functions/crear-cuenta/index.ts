import { createClient } from "npm:@supabase/supabase-js@2";

const cabecerasCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respuestaJson(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cabecerasCors, "Content-Type": "application/json" },
  });
}

function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }
  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) {
    return false;
  }

  let suma = 0;
  for (let indice = 0; indice < 9; indice += 1) {
    let digito = Number(cedula[indice]);
    if (indice % 2 === 0) {
      digito *= 2;
      if (digito > 9) {
        digito -= 9;
      }
    }
    suma += digito;
  }
  return (10 - (suma % 10)) % 10 === Number(cedula[9]);
}

Deno.serve(async (solicitud) => {
  if (solicitud.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }
  if (solicitud.method !== "POST") {
    return respuestaJson({ error: "Método no permitido." }, 405);
  }

  const autorizacion = solicitud.headers.get("Authorization");
  if (!autorizacion) {
    return respuestaJson({ error: "Se requiere una sesión activa." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Falta configuración de Supabase para crear cuentas.");
    return respuestaJson(
      { error: "El servicio de creación de cuentas no está configurado." },
      500,
    );
  }

  const clienteUsuario = createClient(url, anonKey, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clienteAdmin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: usuarioActual, error: errorUsuario } =
    await clienteUsuario.auth.getUser();
  if (errorUsuario || !usuarioActual.user) {
    return respuestaJson({ error: "La sesión ya no es válida." }, 401);
  }

  const { data: perfilCreador, error: errorPerfilCreador } =
    await clienteUsuario
      .from("perfiles")
      .select("id, rol, provincia_id")
      .eq("id", usuarioActual.user.id)
      .maybeSingle();
  if (errorPerfilCreador) {
    console.error("No se pudo consultar el perfil del usuario autenticado.");
    return respuestaJson(
      { error: "No se pudo validar el perfil del coordinador." },
      500,
    );
  }
  if (!perfilCreador) {
    return respuestaJson(
      { error: "No se pudo validar el perfil del coordinador." },
      403,
    );
  }

  let datos: unknown;
  try {
    datos = await solicitud.json();
  } catch {
    return respuestaJson({ error: "El contenido de la solicitud no es válido." }, 400);
  }
  if (typeof datos !== "object" || datos === null) {
    return respuestaJson({ error: "Los datos de la cuenta no son válidos." }, 400);
  }

  const entrada = datos as Record<string, unknown>;
  const nombres = typeof entrada.nombres === "string" ? entrada.nombres.trim() : "";
  const apellidos =
    typeof entrada.apellidos === "string" ? entrada.apellidos.trim() : "";
  const cedula = typeof entrada.cedula === "string" ? entrada.cedula.trim() : "";
  const telefono =
    typeof entrada.telefono === "string" ? entrada.telefono.trim() : "";
  const correo =
    typeof entrada.correo === "string"
      ? entrada.correo.trim().toLowerCase()
      : "";
  if (
    "recintoId" in entrada &&
    (typeof entrada.recintoId !== "string" || !entrada.recintoId.trim())
  ) {
    return respuestaJson({ error: "El identificador del recinto no es válido." }, 400);
  }
  const rolDestino =
    entrada.rolDestino === undefined ? "veedor" : entrada.rolDestino;
  const recintoAsignacionId =
    typeof entrada.recintoId === "string" ? entrada.recintoId.trim() : null;

  if (rolDestino !== "coordinador_recinto" && rolDestino !== "veedor") {
    return respuestaJson({ error: "El rol de destino no es válido." }, 400);
  }

  if (
    nombres.length < 2 ||
    apellidos.length < 2 ||
    telefono.length < 7 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    !validarCedula(cedula)
  ) {
    return respuestaJson(
      { error: "Revisa nombres, apellidos, cédula, teléfono y correo." },
      400,
    );
  }

  if (
    (perfilCreador.rol === "coordinador_provincial" &&
      rolDestino !== "coordinador_recinto") ||
    (perfilCreador.rol === "coordinador_recinto" && rolDestino !== "veedor")
  ) {
    return respuestaJson(
      { error: "No tienes permiso para crear ese tipo de cuenta." },
      403,
    );
  }
  if (
    perfilCreador.rol !== "coordinador_provincial" &&
    perfilCreador.rol !== "coordinador_recinto"
  ) {
    return respuestaJson(
      { error: "El rol actual no puede crear cuentas." },
      403,
    );
  }
  if (
    perfilCreador.rol === "coordinador_recinto" &&
    recintoAsignacionId !== null
  ) {
    return respuestaJson(
      { error: "Un coordinador de recinto no puede asignar recintos." },
      403,
    );
  }

  if (perfilCreador.rol === "coordinador_recinto") {
    const { data: recinto, error: errorRecinto } = await clienteAdmin
      .from("recintos")
      .select("id")
      .eq("coordinador_id", usuarioActual.user.id)
      .maybeSingle();
    if (errorRecinto) {
      console.error("No se pudo comprobar el recinto del coordinador.");
      return respuestaJson(
        { error: "No se pudo validar el recinto del coordinador." },
        500,
      );
    }
    if (!recinto) {
      return respuestaJson(
        { error: "El coordinador no tiene un recinto asignado." },
        403,
      );
    }
  }

  if (recintoAsignacionId !== null) {
    const { data: recinto, error: errorRecinto } = await clienteAdmin
      .from("recintos")
      .select("id, provincia_id, coordinador_id")
      .eq("id", recintoAsignacionId)
      .maybeSingle();
    if (errorRecinto) {
      console.error("No se pudo validar el recinto para la asignación.");
      return respuestaJson(
        { error: "No se pudo validar el recinto seleccionado." },
        500,
      );
    }
    if (!recinto || recinto.provincia_id !== perfilCreador.provincia_id) {
      return respuestaJson(
        { error: "El recinto no pertenece a tu provincia." },
        403,
      );
    }
    if (recinto.coordinador_id !== null) {
      return respuestaJson(
        { error: "El recinto ya tiene un coordinador asignado." },
        409,
      );
    }
  }

  const { data: cedulaExistente, error: errorCedula } = await clienteAdmin
    .from("perfiles")
    .select("id")
    .eq("cedula", cedula)
    .maybeSingle();
  const { data: correoExistente, error: errorCorreo } = await clienteAdmin
    .from("perfiles")
    .select("id")
    .eq("correo", correo)
    .maybeSingle();
  if (errorCedula || errorCorreo) {
    console.error("No se pudo comprobar la unicidad de la nueva cuenta.");
    return respuestaJson({ error: "No se pudieron validar los datos." }, 500);
  }
  if (cedulaExistente || correoExistente) {
    return respuestaJson(
      { error: "Ya existe una cuenta con esa cédula o correo." },
      409,
    );
  }

  const { data: invitacion, error: errorInvitacion } =
    await clienteAdmin.auth.admin.inviteUserByEmail(correo, {
      redirectTo: "cnevotos://primer-acceso",
    });
  if (errorInvitacion || !invitacion.user) {
    return respuestaJson(
      {
        error:
          errorInvitacion?.message ??
          "No se pudo crear la cuenta ni enviar la invitación.",
      },
      400,
    );
  }

  const { error: errorPerfil } = await clienteAdmin.from("perfiles").insert({
    id: invitacion.user.id,
    rol: rolDestino,
    nombres,
    apellidos,
    cedula,
    correo,
    telefono,
    provincia_id: perfilCreador.provincia_id,
    creado_por: perfilCreador.id,
    debe_cambiar_clave: true,
  });
  if (errorPerfil) {
    const { error: errorEliminarUsuario } =
      await clienteAdmin.auth.admin.deleteUser(invitacion.user.id);
    if (errorEliminarUsuario) {
      console.error(
        "No se pudo revertir la cuenta sin perfil después de fallar la creación del perfil.",
      );
    }
    return respuestaJson(
      {
        error: errorEliminarUsuario
          ? "No se pudo guardar el perfil y tampoco se pudo revertir la cuenta invitada."
          : errorPerfil.code === "23505"
            ? "Ya existe una cuenta con esa cédula o correo."
            : "No se pudo guardar el perfil de la nueva cuenta.",
      },
      errorEliminarUsuario ? 500 : errorPerfil.code === "23505" ? 409 : 500,
    );
  }

  if (recintoAsignacionId !== null) {
    const { data: asignacion, error: errorAsignacion } = await clienteAdmin
      .from("recintos")
      .update({ coordinador_id: invitacion.user.id })
      .eq("id", recintoAsignacionId)
      .eq("provincia_id", perfilCreador.provincia_id)
      .is("coordinador_id", null)
      .select("id")
      .maybeSingle();

    if (errorAsignacion || !asignacion) {
      let errorReversion: string | null = null;
      const { error: errorEliminarPerfil } = await clienteAdmin
        .from("perfiles")
        .delete()
        .eq("id", invitacion.user.id);
      if (errorEliminarPerfil) {
        errorReversion = "No se pudo borrar el perfil de la cuenta invitada.";
        console.error(
          "No se pudo revertir el perfil después de fallar la asignación del recinto.",
        );
      } else {
        const { error: errorEliminarUsuario } =
          await clienteAdmin.auth.admin.deleteUser(invitacion.user.id);
        if (errorEliminarUsuario) {
          errorReversion = "No se pudo borrar la cuenta de autenticación invitada.";
          console.error(
            "No se pudo revertir la cuenta Auth después de fallar la asignación del recinto.",
          );
        }
      }

      return respuestaJson(
        {
          error: errorReversion
            ? `Falló la asignación y la reversión quedó incompleta: ${errorReversion}`
            : errorAsignacion
              ? "No se pudo asignar el coordinador al recinto."
              : "El recinto ya no está disponible para asignación.",
        },
        errorReversion ? 500 : errorAsignacion ? 500 : 409,
      );
    }
  }

  return respuestaJson({ id: invitacion.user.id }, 201);
});
