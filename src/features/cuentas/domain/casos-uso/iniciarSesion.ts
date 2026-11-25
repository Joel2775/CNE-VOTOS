import type { CuentasRepositorio } from "../repositorios/cuentasRepositorio";
import type { CredencialesAcceso } from "../esquemas/cuentasEsquemas";

export function iniciarSesion(
  repositorio: CuentasRepositorio,
  credenciales: CredencialesAcceso,
) {
  return repositorio.iniciarSesion(
    credenciales.correo,
    credenciales.contrasena,
  );
}
