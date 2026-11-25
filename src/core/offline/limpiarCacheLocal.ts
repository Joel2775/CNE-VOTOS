import { inicializarBaseLocal } from "./sqliteDb";

export async function limpiarCacheLocal(): Promise<void> {
  const database = await inicializarBaseLocal();
  await database.execAsync(`
    DELETE FROM organizaciones;
    DELETE FROM candidatos;
    DELETE FROM actas_remotas;
    DELETE FROM asignaciones_veedor;
    DELETE FROM mesas;
    DELETE FROM recintos;
    DELETE FROM lecturas_cache;
    DELETE FROM sync_queue WHERE estado = 'enviada';
    UPDATE sync_queue
    SET estado = 'pendiente'
    WHERE estado = 'sincronizando';
  `);
}
