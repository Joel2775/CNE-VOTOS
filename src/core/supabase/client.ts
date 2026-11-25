import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Keeps each SecureStore value below the size rejected by some iOS versions.
const MAX_SECURE_CHUNK_BYTES = 1500;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

function segmentarValor(valor: string): string[] {
  const segmentos: string[] = [];
  let segmento = "";
  let bytes = 0;

  for (const caracter of valor) {
    const codigo = caracter.codePointAt(0) ?? 0;
    const bytesCaracter =
      codigo <= 0x7f ? 1 : codigo <= 0x7ff ? 2 : codigo <= 0xffff ? 3 : 4;

    if (bytes + bytesCaracter > MAX_SECURE_CHUNK_BYTES) {
      segmentos.push(segmento);
      segmento = "";
      bytes = 0;
    }

    segmento += caracter;
    bytes += bytesCaracter;
  }

  if (segmento || segmentos.length === 0) {
    segmentos.push(segmento);
  }

  return segmentos;
}

function leerCantidadSegmentos(valor: string | null): number {
  if (valor === null) {
    return 0;
  }

  const cantidad = Number(valor);
  if (!Number.isSafeInteger(cantidad) || cantidad < 1) {
    throw new Error("El índice de la sesión segura está dañado.");
  }

  return cantidad;
}

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const cantidad = leerCantidadSegmentos(
      await SecureStore.getItemAsync(`${key}.count`),
    );

    if (cantidad === 0) {
      return null;
    }

    const segmentos = await Promise.all(
      Array.from({ length: cantidad }, (_, index) =>
        SecureStore.getItemAsync(`${key}.part.${index}`),
      ),
    );

    if (segmentos.some((segmento) => segmento === null)) {
      throw new Error("La sesión segura está incompleta.");
    }

    return segmentos.join("");
  },
  async setItem(key: string, value: string): Promise<void> {
    const metadataKey = `${key}.count`;
    const cantidadAnterior = leerCantidadSegmentos(
      await SecureStore.getItemAsync(metadataKey),
    );
    const segmentos = segmentarValor(value);

    await Promise.all(
      segmentos.map((segmento, index) =>
        SecureStore.setItemAsync(`${key}.part.${index}`, segmento),
      ),
    );
    await SecureStore.setItemAsync(metadataKey, String(segmentos.length));

    await Promise.all(
      Array.from(
        { length: Math.max(0, cantidadAnterior - segmentos.length) },
        (_, index) =>
          SecureStore.deleteItemAsync(`${key}.part.${segmentos.length + index}`),
      ),
    );
  },
  async removeItem(key: string): Promise<void> {
    const metadataKey = `${key}.count`;
    const cantidad = leerCantidadSegmentos(
      await SecureStore.getItemAsync(metadataKey),
    );

    await Promise.all(
      Array.from({ length: cantidad }, (_, index) =>
        SecureStore.deleteItemAsync(`${key}.part.${index}`),
      ),
    );
    await SecureStore.deleteItemAsync(metadataKey);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
