export type DignidadActa = "alcaldia" | "prefectura";

export type OrganizacionConCandidato = {
  id: string;
  sigla: string;
  nombre: string;
  color_hex: string;
  orden: number;
  candidato: string;
};

export type CatalogoActas = {
  alcaldia: OrganizacionConCandidato[];
  prefectura: OrganizacionConCandidato[];
  advertencia: string | null;
};

export type VotoActa = {
  organizacion_id: string;
  votos: number;
};

export type ActaOffline = {
  p_acta_id: string;
  p_mesa_id: string;
  p_dignidad: DignidadActa;
  p_total_sufragantes: number;
  p_votos_nulos: number;
  p_votos_blancos: number;
  p_capturada_en: string;
  p_votos: VotoActa[];
  p_evidencia: {
    latitud: number;
    longitud: number;
    precision_m: number;
    capturada_en: string;
  };
  ruta_foto_local: string;
  distancia_metros: number;
  hash_sha256: string;
  modo_recaptura?: boolean;
  id_recaptura?: string;
};
