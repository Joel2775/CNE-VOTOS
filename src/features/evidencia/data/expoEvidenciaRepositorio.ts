import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { File } from "expo-file-system";

import {
  calcularDistanciaMetros,
  type Coordenadas,
} from "../domain/entidades/geovalla";
import type {
  EvidenciaRepositorio,
  UbicacionCaptura,
} from "../domain/repositorios/evidenciaRepositorio";

export class ExpoEvidenciaRepositorio implements EvidenciaRepositorio {
  async leerUbicacion(recinto: Coordenadas): Promise<UbicacionCaptura> {
    const serviciosActivos = await Location.hasServicesEnabledAsync();
    if (!serviciosActivos) {
      throw new Error("Activa la ubicación o el GPS del teléfono e inténtalo otra vez.");
    }

    let permiso = await Location.getForegroundPermissionsAsync();
    if (permiso.status !== "granted") {
      permiso = await Location.requestForegroundPermissionsAsync();
    }
    if (permiso.status !== "granted") {
      throw new Error(
        "Se necesita permiso de ubicación para capturar el acta. Habilítalo en los ajustes del teléfono.",
      );
    }

    const posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const { latitude, longitude, accuracy } = posicion.coords;
    if (accuracy === null || !Number.isFinite(accuracy)) {
      throw new Error(
        "El GPS no entregó una precisión válida. Muévete a un lugar despejado y vuelve a intentar.",
      );
    }

    return {
      latitud: latitude,
      longitud: longitude,
      precision_m: accuracy,
      distancia_metros: calcularDistanciaMetros(
        { latitud: latitude, longitud: longitude },
        recinto,
      ),
    };
  }

  async calcularHashSha256(uri: string): Promise<string> {
    const bytes = await new File(uri).bytes();
    const resumen = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      bytes,
    );

    return Array.from(new Uint8Array(resumen), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }
}
