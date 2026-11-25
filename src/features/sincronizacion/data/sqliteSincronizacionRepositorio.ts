import { inicializarBaseLocal } from "@/core/offline/sqliteDb";
import {
  sincronizarPendientes,
} from "@/core/offline/syncService";
import type { ResultadoSincronizacion } from "../domain/entidades/resultadoSincronizacion";
import type { SincronizacionRepositorio } from "../domain/repositorios/sincronizacionRepositorio";

export class SQLiteSincronizacionRepositorio
  implements SincronizacionRepositorio
{
  async contarActasPendientes(): Promise<number> {
    const database = await inicializarBaseLocal();
    const fila = await database.getFirstAsync<{ cantidad: number }>(
      `SELECT COUNT(*) AS cantidad
       FROM sync_queue
       WHERE estado IN ('pendiente', 'sincronizando', 'error')`,
    );
    if (!fila) {
      throw new Error("No se pudo consultar la cantidad de actas pendientes.");
    }

    return fila.cantidad;
  }

  sincronizarPendientes(): Promise<ResultadoSincronizacion> {
    return sincronizarPendientes();
  }
}
