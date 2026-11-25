import { ExpoEvidenciaRepositorio } from "@/features/evidencia/data/expoEvidenciaRepositorio";
import type { Coordenadas } from "@/features/evidencia/domain/entidades/geovalla";
import { calcularHashSha256 } from "@/features/evidencia/domain/casos-uso/calcularHashSha256";
import { leerUbicacion } from "@/features/evidencia/domain/casos-uso/leerUbicacion";

const repositorio = new ExpoEvidenciaRepositorio();

export const evidencia = {
  leerUbicacion(recinto: Coordenadas) {
    return leerUbicacion(repositorio, recinto);
  },
  calcularHashSha256(uri: string) {
    return calcularHashSha256(repositorio, uri);
  },
};
