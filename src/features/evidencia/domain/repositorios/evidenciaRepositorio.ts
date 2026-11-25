import type { Coordenadas } from "../entidades/geovalla";

export type UbicacionCaptura = Coordenadas & {
  precision_m: number;
  distancia_metros: number;
};

export interface EvidenciaRepositorio {
  leerUbicacion(
    recinto: Coordenadas,
  ): Promise<UbicacionCaptura>;
  calcularHashSha256(uri: string): Promise<string>;
}
