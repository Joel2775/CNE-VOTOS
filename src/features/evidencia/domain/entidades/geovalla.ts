export const UMBRAL_NITIDEZ_LAPLACIANO = 100;
export const MARGEN_GEOVALLA_METROS = 200;

export type Coordenadas = {
  latitud: number;
  longitud: number;
};

export function calcularDistanciaMetros(
  origen: Coordenadas,
  destino: Coordenadas,
): number {
  const coordenadas = [origen, destino];
  if (
    coordenadas.some(
      ({ latitud, longitud }) =>
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        latitud < -90 ||
        latitud > 90 ||
        longitud < -180 ||
        longitud > 180,
    )
  ) {
    throw new Error("Las coordenadas para calcular la distancia no son válidas.");
  }

  const radioTierraMetros = 6_371_008.8;
  const latitudOrigen = (origen.latitud * Math.PI) / 180;
  const latitudDestino = (destino.latitud * Math.PI) / 180;
  const diferenciaLatitud = ((destino.latitud - origen.latitud) * Math.PI) / 180;
  const diferenciaLongitud =
    ((destino.longitud - origen.longitud) * Math.PI) / 180;
  const haversine =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(latitudOrigen) *
      Math.cos(latitudDestino) *
      Math.sin(diferenciaLongitud / 2) ** 2;
  const haversineSeguro = Math.min(1, Math.max(0, haversine));
  const distancia =
    2 * radioTierraMetros * Math.asin(Math.sqrt(haversineSeguro));

  if (!Number.isFinite(distancia)) {
    throw new Error("No se pudo calcular la distancia al recinto.");
  }

  return distancia;
}

export function esFotoNitida(varianzaLaplaciano: number): boolean {
  return (
    Number.isFinite(varianzaLaplaciano) &&
    varianzaLaplaciano >= UMBRAL_NITIDEZ_LAPLACIANO
  );
}
