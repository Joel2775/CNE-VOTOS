import type { ResultadoSincronizacion } from "../entidades/resultadoSincronizacion";

export interface SincronizacionRepositorio {
  contarActasPendientes(): Promise<number>;
  sincronizarPendientes(): Promise<ResultadoSincronizacion>;
}
