import type { CorreccionActa } from "../entidades/revisionActa";
import { formularioActaSchema } from "../esquemas/actaEsquemas";
import type { RevisionActasRepositorio } from "../repositorios/revisionActasRepositorio";

export function corregirActa(
  repositorio: RevisionActasRepositorio,
  correccion: CorreccionActa,
): Promise<void> {
  const motivo = correccion.motivo.trim();
  if (motivo.length < 10) {
    throw new Error(
      "El motivo obligatorio de auditoría debe tener al menos 10 caracteres.",
    );
  }

  const validacion = formularioActaSchema.safeParse({
    total_sufragantes: String(correccion.totalSufragantes),
    votos_nulos: String(correccion.votosNulos),
    votos_blancos: String(correccion.votosBlancos),
    votos: correccion.votos.map((voto) => ({
      organizacion_id: voto.organizacion_id,
      votos: String(voto.votos),
    })),
  });
  if (!validacion.success) {
    throw new Error(
      validacion.error.issues[0]?.message ??
        "Los valores de votos no cumplen las reglas del acta.",
    );
  }

  return repositorio.corregirActa({
    ...correccion,
    totalSufragantes: validacion.data.total_sufragantes,
    votosNulos: validacion.data.votos_nulos,
    votosBlancos: validacion.data.votos_blancos,
    votos: validacion.data.votos,
    motivo,
  });
}
