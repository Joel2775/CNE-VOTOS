import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

let databasePromise: Promise<SQLiteDatabase> | null = null;
const DATABASE_KEY_STORAGE = "cne-votos.sqlite.key";
const esExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function obtenerClaveCifrado(): Promise<string> {
  const claveGuardada = await SecureStore.getItemAsync(DATABASE_KEY_STORAGE);

  if (claveGuardada) {
    if (!/^[0-9a-f]{64}$/i.test(claveGuardada)) {
      throw new Error("La clave de cifrado de la base local no es válida.");
    }

    return claveGuardada;
  }

  const clave = Array.from(Crypto.getRandomBytes(32), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  await SecureStore.setItemAsync(DATABASE_KEY_STORAGE, clave);
  return clave;
}

export function inicializarBaseLocal(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync("cne_votos.db")
      .then(async (database) => {
        if (!esExpoGo) {
          const clave = await obtenerClaveCifrado();

          // SQLCipher debe recibir la clave antes de consultar cualquier tabla.
          await database.execAsync(`PRAGMA key = "x'${clave}'";`);
          const cipher = await database.getFirstAsync<{
            cipher_version: string;
          }>("PRAGMA cipher_version;");

          if (!cipher?.cipher_version) {
            throw new Error("SQLCipher no está habilitado para expo-sqlite.");
          }
        }

        await database.execAsync(`
          PRAGMA journal_mode = WAL;

          CREATE TABLE IF NOT EXISTS organizaciones (
            id TEXT PRIMARY KEY NOT NULL,
            sigla TEXT NOT NULL,
            nombre TEXT NOT NULL,
            color_hex TEXT NOT NULL,
            orden INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS candidatos (
            id TEXT PRIMARY KEY NOT NULL,
            organizacion_id TEXT NOT NULL,
            dignidad TEXT NOT NULL,
            nombre TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS recintos (
            id TEXT PRIMARY KEY NOT NULL,
            provincia_id TEXT NOT NULL,
            canton_id TEXT NOT NULL,
            parroquia_id TEXT NOT NULL,
            nombre TEXT NOT NULL,
            latitud REAL NOT NULL,
            longitud REAL NOT NULL,
            coordinador_id TEXT,
            rol_coordinador TEXT NOT NULL DEFAULT 'coordinador_recinto',
            creado_en TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS mesas (
            id TEXT PRIMARY KEY NOT NULL,
            recinto_id TEXT NOT NULL,
            numero INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS asignaciones_veedor (
            id TEXT PRIMARY KEY NOT NULL,
            veedor_id TEXT NOT NULL,
            rol_veedor TEXT NOT NULL,
            mesa_id TEXT NOT NULL,
            asignado_por TEXT NOT NULL,
            asignado_en TEXT NOT NULL,
            finalizado_por TEXT,
            finalizado_en TEXT
          );

          CREATE TABLE IF NOT EXISTS sync_queue (
            acta_id TEXT PRIMARY KEY NOT NULL,
            mesa_id TEXT NOT NULL,
            dignidad TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            ruta_foto_local TEXT NOT NULL,
            latitud_captura REAL,
            longitud_captura REAL,
            precision_m REAL,
            distancia_metros REAL,
            hash_sha256 TEXT NOT NULL DEFAULT '',
            estado TEXT NOT NULL DEFAULT 'pendiente'
              CHECK (estado IN ('pendiente', 'sincronizando', 'error', 'enviada')),
            intentos INTEGER NOT NULL DEFAULT 0,
            ultimo_error TEXT,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
          );

          CREATE INDEX IF NOT EXISTS sync_queue_estado_creado_idx
            ON sync_queue (estado, creado_en);

          CREATE TABLE IF NOT EXISTS actas_remotas (
            id TEXT PRIMARY KEY NOT NULL,
            mesa_id TEXT NOT NULL,
            dignidad TEXT NOT NULL,
            recibida_en TEXT NOT NULL,
            estado_revision TEXT NOT NULL DEFAULT 'pendiente_revision',
            motivo_revision TEXT
          );

          CREATE INDEX IF NOT EXISTS actas_remotas_mesa_idx
            ON actas_remotas (mesa_id, dignidad);

          CREATE TABLE IF NOT EXISTS lecturas_cache (
            clave TEXT PRIMARY KEY NOT NULL,
            contenido_json TEXT NOT NULL,
            actualizada_en TEXT NOT NULL
          );

          UPDATE sync_queue
          SET estado = 'pendiente'
          WHERE estado = 'sincronizando';
        `);

        const columnasActasRemotas = await database.getAllAsync<{ name: string }>(
          "PRAGMA table_info(actas_remotas)",
        );
        if (!columnasActasRemotas.some((columna) => columna.name === "estado_revision")) {
          await database.execAsync(
            "ALTER TABLE actas_remotas ADD COLUMN estado_revision TEXT NOT NULL DEFAULT 'pendiente_revision';",
          );
        }
        if (!columnasActasRemotas.some((columna) => columna.name === "motivo_revision")) {
          await database.execAsync(
            "ALTER TABLE actas_remotas ADD COLUMN motivo_revision TEXT;",
          );
        }

        const columnasQueue = await database.getAllAsync<{ name: string }>(
          "PRAGMA table_info(sync_queue)",
        );
        const nombresColumnasQueue = new Set(
          columnasQueue.map((columna) => columna.name),
        );
        const columnasNuevas = [
          ["latitud_captura", "REAL"],
          ["longitud_captura", "REAL"],
          ["precision_m", "REAL"],
          ["distancia_metros", "REAL"],
          ["hash_sha256", "TEXT NOT NULL DEFAULT ''"],
        ] as const;

        for (const [nombre, tipo] of columnasNuevas) {
          if (!nombresColumnasQueue.has(nombre)) {
            await database.execAsync(
              `ALTER TABLE sync_queue ADD COLUMN ${nombre} ${tipo};`,
            );
          }
        }

        return database;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}
