import { Text, View } from "react-native";

type BarraResultadoProps = {
  nombre: string;
  organizacion: string;
  votos: number;
  porcentaje: number;
  colorHex: string;
};

export function BarraResultado({
  nombre,
  organizacion,
  votos,
  porcentaje,
  colorHex,
}: BarraResultadoProps) {
  const ancho = Math.max(0, Math.min(100, porcentaje));

  return (
    <View className="gap-2 py-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-texto">{nombre}</Text>
          <Text className="text-base text-texto-suave">
            {organizacion} · {votos.toLocaleString("es-EC")} votos
          </Text>
        </View>
        <Text className="text-lg font-bold text-texto">
          {porcentaje.toFixed(2)}%
        </Text>
      </View>
      <View
        accessibilityLabel={`${nombre}: ${porcentaje.toFixed(2)} por ciento`}
        className="h-4 overflow-hidden rounded-full bg-fondo"
      >
        <View
          className="h-full rounded-full"
          style={{ width: `${ancho}%`, backgroundColor: colorHex }}
        />
      </View>
      <Text className="text-sm font-semibold text-texto-suave">
        {organizacion}
      </Text>
    </View>
  );
}
