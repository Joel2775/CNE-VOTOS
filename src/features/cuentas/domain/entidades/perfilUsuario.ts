export const ROLES_USUARIO = [
  "veedor",
  "coordinador_recinto",
  "coordinador_provincial",
] as const;

export type RolUsuario = (typeof ROLES_USUARIO)[number];

export interface PerfilUsuario {
  id: string;
  rol: RolUsuario;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  provincia_id: string;
  debe_cambiar_clave: boolean;
}

export interface UsuarioAutenticado {
  id: string;
  correo: string;
}

export interface SesionAutenticada {
  usuario: UsuarioAutenticado;
  perfil: PerfilUsuario;
}

export function esRolUsuario(rol: string): rol is RolUsuario {
  return ROLES_USUARIO.some((rolValido) => rolValido === rol);
}
