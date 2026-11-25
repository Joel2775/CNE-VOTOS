import { inicializarBaseLocal } from "./sqliteDb";

type FilaCache = {
  contenido_json: string;
  actualizada_en: string;
};

export async function leerLecturaCache(
  clave: string,
): Promise<{ contenido: unknown; actualizadaEn: string } | null> {
  const database = await inicializarBaseLocal();
  const fila = await database.getFirstAsync<FilaCache>(
    `SELECT contenido_json, actualizada_en
     FROM lecturas_cache
     WHERE clave = ?`,
    clave,
  );
  if (!fila) {
    return null;
  }

  let contenido: unknown;
  try {
    contenido = JSON.parse(fila.contenido_json);
  } catch {
    throw new Error("La última lectura local está dañada.");
  }

  return { contenido, actualizadaEn: fila.actualizada_en };
}

export async function guardarLecturaCache(
  clave: string,
  contenido: unknown,
): Promise<void> {
  const contenidoJson = JSON.stringify(contenido);
  if (contenidoJson === undefined) {
    throw new Error("No se pudo serializar la lectura para guardarla localmente.");
  }

  const database = await inicializarBaseLocal();
  await database.runAsync(
    `INSERT INTO lecturas_cache (clave, contenido_json, actualizada_en)
     VALUES (?, ?, ?)
     ON CONFLICT(clave) DO UPDATE SET
       contenido_json = excluded.contenido_json,
       actualizada_en = excluded.actualizada_en`,
    clave,
    contenidoJson,
    new Date().toISOString(),
  );
}
