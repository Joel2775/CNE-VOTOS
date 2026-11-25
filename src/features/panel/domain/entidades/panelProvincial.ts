import { z } from "zod";

import { estadoRevisionActaSchema } from "@/features/actas/domain/entidades/revisionActa";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import type { ActaRevision } from "@/features/actas/domain/entidades/revisionActa";

export const progresoRecintoSchema = z.object({
  recinto_id: z.uuid(),
  recinto: z.string().min(1),
  parroquia_id: z.uuid(),
  parroquia: z.string().min(1),
  mesas_esperadas: z.number().int().nonnegative(),
  mesas_reportadas: z.number().int().nonnegative(),
  mesas_validadas: z.number().int().nonnegative(),
  actas_esperadas: z.number().int().nonnegative(),
  actas_recibidas: z.number().int().nonnegative(),
  actas_validadas: z.number().int().nonnegative(),
  actas_rechazadas: z.number().int().nonnegative(),
  alertas_geovalla: z.number().int().nonnegative(),
});

export type ProgresoRecinto = z.infer<typeof progresoRecintoSchema>;

export const alertaActaSchema = z.object({
  acta_id: z.uuid(),
  recinto_id: z.uuid(),
  recinto: z.string(),
  parroquia: z.string(),
  mesa_numero: z.number().int(),
  dignidad: z.enum(["alcaldia", "prefectura"]),
  estado_revision: estadoRevisionActaSchema,
  motivo_revision: z.string().nullable(),
  distancia_recinto_m: z.number().nonnegative(),
  fuera_margen: z.boolean(),
});

export type AlertaActa = z.infer<typeof alertaActaSchema>;

export type AvanceProvincial = {
  recintos: ProgresoRecinto[];
  alertas: AlertaActa[];
  actas: ActaRevision[];
};

export type ResultadoCandidato = {
  candidatoId: string;
  organizacionId: string;
  organizacionSigla: string;
  organizacion: string;
  candidato: string;
  colorHex: string;
  organizacionOrden: number;
  votos: number;
  porcentaje: number;
};

export type ResultadosConsolidados = {
  dignidad: DignidadActa;
  actasRecibidas: number;
  actasValidadas: number;
  votosValidos: number;
  votosBlancos: number;
  votosNulos: number;
  totalSufragantes: number;
  candidaturas: ResultadoCandidato[];
};

export type ModoResultados = "preliminares" | "validadas";
