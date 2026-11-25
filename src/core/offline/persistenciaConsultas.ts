import { queryClient } from "@/core/queryClient";
import {
  guardarLecturaCache,
  leerLecturaCache,
} from "./lecturasCache";

const CLAVE_CACHE = "tanstack-query-cache";
const CLAVES_PERSISTIBLES = new Set([
  "panel-provincial",
  "recintos",
  "coordinadores",
  "recintos-opciones",
  "mesas-recinto",
  "veedores-recinto",
  "asignaciones-recinto",
  "revision-actas",
  "revision-actas-detalle",
]);

type ConsultaPersistida = {
  queryKey: readonly unknown[];
  data: unknown;
  dataUpdatedAt: number;
};

type CacheConsultasPersistida = {
  version: 1;
  consultas: ConsultaPersistida[];
};

for (const clave of CLAVES_PERSISTIBLES) {
  queryClient.setQueryDefaults([clave], { gcTime: Infinity });
}

function esClavePersistible(queryKey: readonly unknown[]): boolean {
  const clave = queryKey[0];
  return typeof clave === "string" && CLAVES_PERSISTIBLES.has(clave);
}

function esConsultaPersistida(valor: unknown): valor is ConsultaPersistida {
  if (
    typeof valor !== "object" ||
    valor === null ||
    !("queryKey" in valor) ||
    !("data" in valor) ||
    !("dataUpdatedAt" in valor)
  ) {
    return false;
  }

  return (
    Array.isArray(valor.queryKey) &&
    typeof valor.dataUpdatedAt === "number" &&
    Number.isFinite(valor.dataUpdatedAt)
  );
}

function esCacheConsultasPersistida(
  valor: unknown,
): valor is CacheConsultasPersistida {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "version" in valor &&
    "consultas" in valor &&
    valor.version === 1 &&
    Array.isArray(valor.consultas) &&
    valor.consultas.every(esConsultaPersistida)
  );
}

function capturarConsultasPersistibles(): CacheConsultasPersistida {
  const consultas: ConsultaPersistida[] = [];

  for (const consulta of queryClient.getQueryCache().getAll()) {
    if (
      consulta.state.data === undefined ||
      !esClavePersistible(consulta.queryKey)
    ) {
      continue;
    }

    consultas.push({
      queryKey: consulta.queryKey,
      data: consulta.state.data,
      dataUpdatedAt: consulta.state.dataUpdatedAt,
    });
  }

  return { version: 1, consultas };
}

function claveCacheUsuario(usuarioId: string): string {
  return `${CLAVE_CACHE}:${usuarioId}`;
}

export async function restaurarCacheConsultas(
  usuarioId: string,
): Promise<void> {
  const cache = await leerLecturaCache(claveCacheUsuario(usuarioId));
  if (!cache) {
    return;
  }
  if (!esCacheConsultasPersistida(cache.contenido)) {
    throw new Error("La caché de consultas local está dañada.");
  }

  for (const consulta of cache.contenido.consultas) {
    if (esClavePersistible(consulta.queryKey)) {
      queryClient.setQueryData(consulta.queryKey, consulta.data, {
        updatedAt: consulta.dataUpdatedAt,
      });
    }
  }
}

let detenerPersistenciaActual: (() => void) | null = null;
let escriturasPendientes: Promise<void> = Promise.resolve();

export function iniciarPersistenciaConsultas(
  usuarioId: string,
  alFallar: (error: unknown) => void,
): () => void {
  detenerPersistenciaActual?.();

  let activa = true;
  const clave = claveCacheUsuario(usuarioId);

  function detener(): void {
    if (!activa) {
      return;
    }
    activa = false;
    desuscribir();
    if (detenerPersistenciaActual === detener) {
      detenerPersistenciaActual = null;
    }
  }

  const desuscribir = queryClient.getQueryCache().subscribe((evento) => {
    if (
      evento.type !== "updated" ||
      evento.action.type !== "success" ||
      !esClavePersistible(evento.query.queryKey)
    ) {
      return;
    }

    const cache = capturarConsultasPersistibles();
    escriturasPendientes = escriturasPendientes
      .then(() => guardarLecturaCache(clave, cache))
      .catch((error: unknown) => {
        if (activa) {
          alFallar(error);
        }
      });
  });

  detenerPersistenciaActual = detener;
  return detener;
}

export async function detenerPersistenciaConsultas(): Promise<void> {
  detenerPersistenciaActual?.();
  await escriturasPendientes;
}
