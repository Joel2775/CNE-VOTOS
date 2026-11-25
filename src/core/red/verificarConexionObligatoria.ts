import NetInfo from "@react-native-community/netinfo";

const TIEMPO_LIMITE_MS = 12_000;
const TIEMPO_LIMITE_CONSULTA_MS = 2_000;

export class SinConexionError extends Error {
  constructor() {
    super("Se necesita conexión a internet para completar esta acción.");
    this.name = "SinConexionError";
  }
}

export class TiempoAgotadoError extends Error {
  constructor(operacion: string) {
    super(`La operación tardó más de 12 segundos. ${operacion} no se completó.`);
    this.name = "TiempoAgotadoError";
  }
}

function noHayConexion(
  estado: Awaited<ReturnType<typeof NetInfo.fetch>>,
): boolean {
  return (
    estado.isConnected === false || estado.isInternetReachable === false
  );
}

export async function verificarConexionObligatoria(): Promise<void> {
  const estado = await consultarConexionConLimite();
  if (!estado || noHayConexion(estado)) {
    throw new SinConexionError();
  }
}

async function consultarConexionConLimite(): Promise<
  Awaited<ReturnType<typeof NetInfo.fetch>> | null
> {
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  const limite = new Promise<null>((resolver) => {
    temporizador = setTimeout(
      () => resolver(null),
      TIEMPO_LIMITE_CONSULTA_MS,
    );
  });

  try {
    // NetInfo.fetch can stall; bound the probe so the UI can leave its loading state.
    return await Promise.race([NetInfo.fetch(), limite]);
  } finally {
    if (temporizador !== null) {
      clearTimeout(temporizador);
    }
  }
}

export async function ejecutarOnlineConTimeout<T>(
  operacion: string,
  ejecutar: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  await verificarConexionObligatoria();

  const controlador = new AbortController();
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  const resultado = Promise.resolve().then(() => ejecutar(controlador.signal));
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => {
      controlador.abort();
      rechazar(new TiempoAgotadoError(operacion));
    }, TIEMPO_LIMITE_MS);
  });

  try {
    return await Promise.race([resultado, limite]);
  } catch (error) {
    if (error instanceof TiempoAgotadoError) {
      const estado = await consultarConexionConLimite();
      if (!estado || noHayConexion(estado)) {
        throw new SinConexionError();
      }
    }
    throw error;
  } finally {
    if (temporizador !== null) {
      clearTimeout(temporizador);
    }
  }
}

export function esErrorSinConexion(error: unknown): error is SinConexionError {
  return error instanceof SinConexionError;
}
