import type { SesionAutenticada } from "../entidades/perfilUsuario";
import type {
  NuevoCoordinadorRecinto,
  NuevoVeedor,
} from "../esquemas/cuentasEsquemas";

export interface CuentasRepositorio {
  iniciarSesion(
    correo: string,
    contrasena: string,
  ): Promise<SesionAutenticada>;
  crearVeedor(datos: NuevoVeedor): Promise<{ id: string }>;
  crearCoordinadorRecinto(
    datos: NuevoCoordinadorRecinto,
    recintoId?: string,
  ): Promise<{ id: string }>;
  cerrarSesion(): Promise<void>;
  obtenerPerfilActual(): Promise<SesionAutenticada | null>;
  procesarEnlaceAutenticacion(url: string): Promise<SesionAutenticada>;
  solicitarRecuperacion(correo: string, redirectTo: string): Promise<void>;
  cambiarContrasena(contrasena: string): Promise<SesionAutenticada>;
}
