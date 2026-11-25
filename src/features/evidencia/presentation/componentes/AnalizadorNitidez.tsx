import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  ImageManipulator,
  SaveFormat,
} from "expo-image-manipulator";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

type AnalizadorNitidezProps = {
  uri: string;
  ancho: number;
  alto: number;
  onResultado: (varianza: number | null, error: string | null) => void;
};

function esResultadoNitidez(
  valor: unknown,
): valor is { varianza: number } {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const resultado = valor as Record<string, unknown>;
  return (
    typeof resultado.varianza === "number" &&
    Number.isFinite(resultado.varianza)
  );
}

function crearHtmlAnalisis(imagenBase64: string): string {
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><script>
const imagen = new Image();
imagen.onload = () => {
  const lienzo = document.createElement("canvas");
  lienzo.width = imagen.width;
  lienzo.height = imagen.height;
  const contexto = lienzo.getContext("2d", { willReadFrequently: true });
  if (!contexto) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ error: "No se pudo analizar la imagen." }));
    return;
  }
  contexto.drawImage(imagen, 0, 0);
  const pixeles = contexto.getImageData(0, 0, lienzo.width, lienzo.height).data;
  const grises = new Uint8Array(lienzo.width * lienzo.height);
  for (let indice = 0; indice < grises.length; indice += 1) {
    const pixel = indice * 4;
    grises[indice] = Math.round(
      pixeles[pixel] * 0.299 + pixeles[pixel + 1] * 0.587 + pixeles[pixel + 2] * 0.114
    );
  }
  let suma = 0;
  let sumaCuadrados = 0;
  let muestras = 0;
  for (let y = 1; y < lienzo.height - 1; y += 1) {
    for (let x = 1; x < lienzo.width - 1; x += 1) {
      const indice = y * lienzo.width + x;
      const laplaciano =
        grises[indice - lienzo.width] +
        grises[indice - 1] -
        4 * grises[indice] +
        grises[indice + 1] +
        grises[indice + lienzo.width];
      suma += laplaciano;
      sumaCuadrados += laplaciano * laplaciano;
      muestras += 1;
    }
  }
  const media = suma / muestras;
  const varianza = Math.max(0, sumaCuadrados / muestras - media * media);
  window.ReactNativeWebView.postMessage(JSON.stringify({ varianza }));
};
imagen.onerror = () => window.ReactNativeWebView.postMessage(
  JSON.stringify({ error: "No se pudo leer la imagen para revisar su nitidez." })
);
imagen.src = "data:image/jpeg;base64," + ${JSON.stringify(imagenBase64)};
</script></body></html>`;
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo analizar la nitidez de la foto.";
}

export function AnalizadorNitidez({
  uri,
  ancho,
  alto,
  onResultado,
}: AnalizadorNitidezProps) {
  const [html, setHtml] = useState<string | null>(null);
  const resultadoRef = useRef(onResultado);

  useEffect(() => {
    resultadoRef.current = onResultado;
  }, [onResultado]);

  useEffect(() => {
    let activo = true;

    async function prepararImagen(): Promise<void> {
      const escala = Math.min(1, 512 / Math.max(ancho, alto));
      const anchoReducido = Math.max(1, Math.round(ancho * escala));
      const altoReducido = Math.max(1, Math.round(alto * escala));
      const manipulator = ImageManipulator.manipulate(uri);
      manipulator.resize({ width: anchoReducido, height: altoReducido });
      const imagen = await (await manipulator.renderAsync()).saveAsync({
        format: SaveFormat.JPEG,
        compress: 1,
        base64: true,
      });

      if (!imagen.base64) {
        throw new Error("No se pudo preparar la imagen para medir su nitidez.");
      }
      if (activo) {
        setHtml(crearHtmlAnalisis(imagen.base64));
      }
    }

    void prepararImagen().catch((error: unknown) => {
      if (activo) {
        resultadoRef.current(null, mensajeDeError(error));
      }
    });

    return () => {
      activo = false;
    };
  }, [alto, ancho, uri]);

  function recibirResultado(evento: WebViewMessageEvent): void {
    let resultado: unknown;
    try {
      resultado = JSON.parse(evento.nativeEvent.data);
    } catch {
      resultadoRef.current(null, "La revisión de nitidez devolvió un resultado inválido.");
      return;
    }

    if (esResultadoNitidez(resultado)) {
      resultadoRef.current(resultado.varianza, null);
      return;
    }

    if (
      typeof resultado === "object" &&
      resultado !== null &&
      "error" in resultado &&
      typeof resultado.error === "string"
    ) {
      resultadoRef.current(null, resultado.error);
      return;
    }

    resultadoRef.current(null, "No se pudo comprobar la nitidez de la foto.");
  }

  return html ? (
    <WebView
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      javaScriptEnabled
      originWhitelist={["*"]}
      onMessage={recibirResultado}
      scrollEnabled={false}
      source={{ html }}
      style={{ width: 1, height: 1, opacity: 0 }}
    />
  ) : (
    <View className="h-px w-px opacity-0" />
  );
}
