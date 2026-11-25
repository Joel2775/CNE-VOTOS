import type { DignidadActa } from "@/features/actas/domain/entidades/acta";

export interface Veedor {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
}

export interface AsignacionVeedor {
  id: string;
  veedor_id: string;
  mesa_id: string;
  asignado_en: string;
  finalizado_en: string | null;
}

export interface ReemplazoVeedor {
  asignacion_anterior_id: string;
  veedor_entrante_id: string;
  motivo: string;
}

export interface MesaAsignable {
  id: string;
  numero: number;
  asignacion: (AsignacionVeedor & { veedor: Veedor }) | null;
}

export interface ResumenMesasRecinto {
  recinto: { id: string; nombre: string };
  mesas: MesaAsignable[];
  veedores: Veedor[];
}

export type EstadoActaMesa =
  | "faltante"
  | "en_cola"
  | "pendiente_subida"
  | "enviada"
  | "pendiente_revision"
  | "validada"
  | "observada"
  | "rechazada"
  | "error";

export interface MesaAsignadaVeedor {
  asignacion_id: string;
  mesa_id: string;
  numero: number;
  recinto_id: string;
  recinto: string;
  latitud: number;
  longitud: number;
  actas: Record<DignidadActa, EstadoActaMesa>;
  acta_ids: Record<DignidadActa, string | null>;
  motivos_revision: Record<DignidadActa, string | null>;
}
