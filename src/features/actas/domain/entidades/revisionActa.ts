import { z } from "zod";

import type { DignidadActa } from "./acta";

export const estadoRevisionActaSchema = z.enum([
  "pendiente_revision",
  "validada",
  "observada",
  "rechazada",
]);

export type EstadoRevisionActa = z.infer<typeof estadoRevisionActaSchema>;
export type DecisionRevisionActa = Exclude<
  EstadoRevisionActa,
  "pendiente_revision"
>;

export const actaRevisionSchema = z.object({
  acta_id: z.uuid(),
  mesa_id: z.uuid(),
  mesa_numero: z.number().int(),
  dignidad: z.enum(["alcaldia", "prefectura"]),
  estado_revision: estadoRevisionActaSchema,
  motivo_revision: z.string().nullable(),
  total_sufragantes: z.number().int().nonnegative(),
  votos_nulos: z.number().int().nonnegative(),
  votos_blancos: z.number().int().nonnegative(),
  capturada_en: z.string().min(1),
  recibida_en: z.string().min(1),
  distancia_recinto_m: z.number().nonnegative(),
  fuera_margen: z.boolean(),
  recinto_id: z.uuid(),
  recinto: z.string().min(1),
  provincia_id: z.uuid(),
  coordinador_id: z.uuid(),
  parroquia_id: z.uuid(),
  parroquia: z.string().min(1),
  veedor_id: z.uuid(),
  veedor_nombres: z.string().nullable(),
  veedor_apellidos: z.string().nullable(),
  ruta_foto: z.string().min(1).nullable(),
  evidencia_latitud: z.number().nullable(),
  evidencia_longitud: z.number().nullable(),
  evidencia_precision_m: z.number().nonnegative().nullable(),
  evidencia_capturada_en: z.string().min(1).nullable(),
});

export type ActaRevision = z.infer<typeof actaRevisionSchema>;

export const votoRevisionSchema = z.object({
  acta_id: z.uuid(),
  organizacion_id: z.uuid(),
  candidato_id: z.uuid(),
  organizacion_sigla: z.string(),
  organizacion: z.string(),
  organizacion_orden: z.number().int(),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  candidato: z.string(),
  votos: z.number().int().nonnegative(),
});

export type VotoRevision = z.infer<typeof votoRevisionSchema>;

export const historialRevisionSchema = z.object({
  id: z.number().int(),
  acta_id: z.uuid(),
  estado_revision: estadoRevisionActaSchema,
  motivo: z.string().nullable(),
  actor_cedula: z.string(),
  actor_nombres: z.string().nullable(),
  actor_apellidos: z.string().nullable(),
  registrada_en: z.string().min(1),
});

export type HistorialRevision = z.infer<typeof historialRevisionSchema>;

export type DetalleActaRevision = {
  acta: ActaRevision;
  votos: VotoRevision[];
  historial: HistorialRevision[];
};

export type CorreccionActa = {
  actaId: string;
  totalSufragantes: number;
  votosNulos: number;
  votosBlancos: number;
  votos: { organizacion_id: string; votos: number }[];
  motivo: string;
};

export type FiltrosBandejaRevision = {
  coordinadorId: string;
  estado: EstadoRevisionActa | "todas";
  dignidad: DignidadActa | "todas";
};
