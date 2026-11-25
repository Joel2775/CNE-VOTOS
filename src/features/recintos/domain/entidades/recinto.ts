export interface Canton {
  id: string;
  nombre: string;
}

export interface Parroquia {
  id: string;
  nombre: string;
  canton_id: string;
  canton: Canton;
}

export interface Mesa {
  id: string;
  numero: number;
}

export interface CoordinadorRecinto {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  asignado: boolean;
}

export interface Recinto {
  id: string;
  nombre: string;
  provincia_id: string;
  canton_id: string;
  canton: string;
  parroquia_id: string;
  parroquia: string;
  latitud: number;
  longitud: number;
  mesas: Mesa[];
  coordinador: Pick<CoordinadorRecinto, "id" | "nombres" | "apellidos"> | null;
  actas_recibidas: number;
  actas_pendientes: number;
}

export interface OpcionesRecinto {
  parroquias: Parroquia[];
  coordinadores: CoordinadorRecinto[];
}

export interface NuevoRecinto {
  nombre: string;
  parroquia_id: string;
  latitud: number;
  longitud: number;
  cantidad_mesas: number;
  coordinador_id?: string;
}
