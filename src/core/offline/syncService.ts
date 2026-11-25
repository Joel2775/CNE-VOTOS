import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from "expo-crypto";
import { File, Directory, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as SecureStore from "expo-secure-store";

import { supabase } from "../supabase/client";
import type { Database, Json } from "../supabase/database.types";
import { inicializarBaseLocal } from "./sqliteDb";
import type { ResultadoSincronizacion } from "@/features/sincronizacion/domain/entidades/resultadoSincronizacion";

type RegistrarActaArgs =
  Database["public"]["Functions"]["registrar_acta"]["Args"];

type EvidenciaLocal = {
  latitud: number;
  longitud: number;
  precision_m: number;
  capturada_en: string;
};

type ActaOfflineInput = Omit<RegistrarActaArgs, "p_evidencia"> & {
  p_evidencia: EvidenciaLocal;
  ruta_foto_local: string;
  distancia_metros: number;
  hash_sha256: string;
  modo_recaptura?: boolean;
  id_recaptura?: string;
};

type PayloadOffline = Omit<RegistrarActaArgs, "p_evidencia"> & {
  p_evidencia: EvidenciaLocal;
  modo_recaptura?: boolean;
  id_recaptura?: string;
};

type FilaPendiente = {
  acta_id: string;
  mesa_id: string;
  payload_json: string;
  ruta_foto_local: string;
};

const PHOTO_KEY_STORAGE = "cne-votos.photo.key";

async function obtenerClaveFoto(): Promise<AESEncryptionKey> {
  const claveGuardada = await SecureStore.getItemAsync(PHOTO_KEY_STORAGE);

  if (claveGuardada) {
    if (!/^[0-9a-f]{64}$/i.test(claveGuardada)) {
      throw new Error("La clave de cifrado de las fotos no es válida.");
    }

    return AESEncryptionKey.import(claveGuardada, "hex");
  }

  const clave = await AESEncryptionKey.generate();
  await SecureStore.setItemAsync(
    PHOTO_KEY_STORAGE,
    await clave.encoded("hex"),
  );
  return clave;
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esJson(valor: unknown): valor is Json {
  if (
    valor === null ||
    typeof valor === "string" ||
    typeof valor === "boolean"
  ) {
    return true;
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor);
  }

  if (Array.isArray(valor)) {
    return valor.every(esJson);
  }

  return esObjeto(valor) && Object.values(valor).every(esJson);
}

function leerPayload(payloadJson: string): PayloadOffline {
  const valor: unknown = JSON.parse(payloadJson);

  if (
    !esObjeto(valor) ||
    typeof valor.p_acta_id !== "string" ||
    typeof valor.p_mesa_id !== "string" ||
    typeof valor.p_dignidad !== "string" ||
    typeof valor.p_capturada_en !== "string" ||
    typeof valor.p_total_sufragantes !== "number" ||
    typeof valor.p_votos_nulos !== "number" ||
    typeof valor.p_votos_blancos !== "number" ||
    (valor.modo_recaptura !== undefined &&
      typeof valor.modo_recaptura !== "boolean") ||
    (valor.id_recaptura !== undefined &&
      (typeof valor.id_recaptura !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          valor.id_recaptura,
        ))) ||
    (valor.modo_recaptura === true &&
      typeof valor.id_recaptura !== "string") ||
    !esJson(valor.p_votos) ||
    !esObjeto(valor.p_evidencia) ||
    typeof valor.p_evidencia.latitud !== "number" ||
    typeof valor.p_evidencia.longitud !== "number" ||
    typeof valor.p_evidencia.precision_m !== "number" ||
    typeof valor.p_evidencia.capturada_en !== "string"
  ) {
    throw new Error("El contenido de un acta pendiente no es válido.");
  }

  return {
    p_acta_id: valor.p_acta_id,
    p_mesa_id: valor.p_mesa_id,
    p_dignidad: valor.p_dignidad,
    p_capturada_en: valor.p_capturada_en,
    p_total_sufragantes: valor.p_total_sufragantes,
    p_votos_nulos: valor.p_votos_nulos,
    p_votos_blancos: valor.p_votos_blancos,
    p_votos: valor.p_votos,
    modo_recaptura: valor.modo_recaptura === true,
    id_recaptura:
      typeof valor.id_recaptura === "string" ? valor.id_recaptura : undefined,
    p_evidencia: {
      latitud: valor.p_evidencia.latitud,
      longitud: valor.p_evidencia.longitud,
      precision_m: valor.p_evidencia.precision_m,
      capturada_en: valor.p_evidencia.capturada_en,
    },
  };
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Evita que dos toques con el mismo UUID compriman o encolen el acta a la vez.
const encoladoEnCurso = new Map<
  string,
  { payloadJson: string; promise: Promise<void> }
>();

export function encolarActaOffline(
  acta: ActaOfflineInput,
): Promise<void> {
  const { ruta_foto_local: _rutaOriginal, ...payload } = acta;
  const payloadJson = JSON.stringify(payload);
  const encoladoExistente = encoladoEnCurso.get(acta.p_acta_id);

  if (encoladoExistente) {
    if (encoladoExistente.payloadJson !== payloadJson) {
      return Promise.reject(
        new Error("El UUID del acta ya está en cola con otros datos."),
      );
    }

    return encoladoExistente.promise;
  }

  const encolado = guardarActaOffline(acta, payloadJson).finally(() => {
    encoladoEnCurso.delete(acta.p_acta_id);
  });
  encoladoEnCurso.set(acta.p_acta_id, { payloadJson, promise: encolado });
  return encolado;
}

async function guardarActaOffline(
  acta: ActaOfflineInput,
  payloadJson: string,
): Promise<void> {
  const database = await inicializarBaseLocal();
  const actaExistente = await database.getFirstAsync<{
    payload_json: string;
    estado: string;
  }>(
    "SELECT payload_json, estado FROM sync_queue WHERE acta_id = ?",
    acta.p_acta_id,
  );

  if (actaExistente) {
    if (
      !acta.modo_recaptura ||
      actaExistente.estado !== "enviada"
    ) {
      if (actaExistente.payload_json !== payloadJson) {
        throw new Error("El UUID del acta ya está en cola con otros datos.");
      }

      return;
    }

  }

  const carpeta = new Directory(Paths.document, "actas-offline");
  carpeta.create({ idempotent: true, intermediates: true });

  const imagenComprimida = await ImageManipulator.manipulate(
    acta.ruta_foto_local,
  )
    .renderAsync()
    .then((imagen) =>
      imagen.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.82,
      }),
    );

  const archivoPersistente = new File(
    carpeta,
    `${acta.p_acta_id}.enc`,
  );
  const archivoTemporal = new File(imagenComprimida.uri);

  try {
    const clave = await obtenerClaveFoto();
    const imagenSellada = await aesEncryptAsync(
      await archivoTemporal.bytes(),
      clave,
    );
    const bytesCifrados = await imagenSellada.combined();

    archivoPersistente.create({ overwrite: true });
    archivoPersistente.write(bytesCifrados);
  } finally {
    if (archivoTemporal.exists) {
      archivoTemporal.delete();
    }
  }

  try {
    if (actaExistente) {
      const resultado = await database.runAsync(
        `UPDATE sync_queue
         SET mesa_id = ?,
             dignidad = ?,
             payload_json = ?,
             ruta_foto_local = ?,
             latitud_captura = ?,
             longitud_captura = ?,
             precision_m = ?,
             distancia_metros = ?,
             hash_sha256 = ?,
             estado = 'pendiente',
             intentos = 0,
             ultimo_error = NULL,
             creado_en = datetime('now')
         WHERE acta_id = ? AND estado = 'enviada'`,
        acta.p_mesa_id,
        acta.p_dignidad,
        payloadJson,
        archivoPersistente.uri,
        acta.p_evidencia.latitud,
        acta.p_evidencia.longitud,
        acta.p_evidencia.precision_m,
        acta.distancia_metros,
        acta.hash_sha256,
        acta.p_acta_id,
      );
      if (resultado.changes !== 1) {
        throw new Error("No se pudo reemplazar la captura enviada por su recaptura.");
      }
    } else {
      await database.runAsync(
        `INSERT INTO sync_queue (
          acta_id,
          mesa_id,
          dignidad,
          payload_json,
          ruta_foto_local,
          latitud_captura,
          longitud_captura,
          precision_m,
          distancia_metros,
          hash_sha256
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        acta.p_acta_id,
        acta.p_mesa_id,
        acta.p_dignidad,
        payloadJson,
        archivoPersistente.uri,
        acta.p_evidencia.latitud,
        acta.p_evidencia.longitud,
        acta.p_evidencia.precision_m,
        acta.distancia_metros,
        acta.hash_sha256,
      );
    }
  } catch (error) {
    if (archivoPersistente.exists) {
      archivoPersistente.delete();
    }
    throw error;
  }
}

let sincronizacionEnCurso: Promise<ResultadoSincronizacion> | null = null;

export function sincronizarPendientes(): Promise<ResultadoSincronizacion> {
  if (!sincronizacionEnCurso) {
    sincronizacionEnCurso = ejecutarSincronizacion().finally(() => {
      sincronizacionEnCurso = null;
    });
  }

  return sincronizacionEnCurso;
}

async function ejecutarSincronizacion(): Promise<ResultadoSincronizacion> {
  const database = await inicializarBaseLocal();
  const pendientes = await database.getAllAsync<FilaPendiente>(
    `SELECT acta_id, mesa_id, payload_json, ruta_foto_local
     FROM sync_queue
     WHERE estado IN ('pendiente', 'error')
     ORDER BY creado_en ASC`,
  );
  const resultado: ResultadoSincronizacion = {
    sincronizadas: [],
    errores: [],
  };

  for (const pendiente of pendientes) {
    await database.runAsync(
      `UPDATE sync_queue
       SET estado = 'sincronizando', intentos = intentos + 1, ultimo_error = NULL
       WHERE acta_id = ?`,
      pendiente.acta_id,
    );

    try {
      const payload = leerPayload(pendiente.payload_json);
      const archivo = new File(pendiente.ruta_foto_local);

      if (!archivo.exists) {
        throw new Error("No se encontró la foto cifrada local del acta.");
      }

      const rutaFotoRemota =
        `${pendiente.mesa_id}/${pendiente.acta_id}/${
          payload.modo_recaptura
            ? `${payload.id_recaptura}.jpg`
            : "evidencia.jpg"
        }`;
      // El RPC recibe la ruta privada definitiva solo después de subir la foto.
      const fotoCifrada = AESSealedData.fromCombined(await archivo.bytes());
      const fotoOriginal = await aesDecryptAsync(
        fotoCifrada,
        await obtenerClaveFoto(),
        { output: "bytes" },
      );
      const { error: errorSubida } = await supabase.storage
        .from("actas")
        .upload(rutaFotoRemota, fotoOriginal, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (errorSubida) {
        throw errorSubida;
      }

      const { modo_recaptura: _modoRecaptura, ...datosActa } = payload;
      const args: RegistrarActaArgs = {
        ...datosActa,
        p_evidencia: {
          ...payload.p_evidencia,
          ruta_foto: rutaFotoRemota,
        },
      };
      const respuestaRegistro = payload.modo_recaptura
        ? await supabase.rpc("recapturar_acta_rechazada", {
            p_acta_id: args.p_acta_id,
            p_total_sufragantes: args.p_total_sufragantes,
            p_votos_nulos: args.p_votos_nulos,
            p_votos_blancos: args.p_votos_blancos,
            p_votos: args.p_votos,
            p_evidencia: args.p_evidencia,
          })
        : await supabase.rpc("registrar_acta", args);

      if (respuestaRegistro.error) {
        throw respuestaRegistro.error;
      }

      if (payload.modo_recaptura) {
        await database.runAsync(
          `UPDATE actas_remotas
           SET estado_revision = 'pendiente_revision', motivo_revision = NULL
           WHERE id = ?`,
          pendiente.acta_id,
        );
      }

      await database.runAsync(
        `UPDATE sync_queue
         SET estado = 'enviada', ultimo_error = NULL
         WHERE acta_id = ?`,
        pendiente.acta_id,
      );
      resultado.sincronizadas.push(pendiente.acta_id);
    } catch (error) {
      const mensaje = mensajeDeError(error);
      await database.runAsync(
        `UPDATE sync_queue
         SET estado = 'error', ultimo_error = ?
         WHERE acta_id = ?`,
        mensaje,
        pendiente.acta_id,
      );
      resultado.errores.push({
        acta_id: pendiente.acta_id,
        mensaje,
      });
    }
  }

  return resultado;
}
