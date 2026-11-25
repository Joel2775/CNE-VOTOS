import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

type ClayChipProps = {
  label: string;
  icono: ComponentProps<typeof Ionicons>["name"];
  tono: "alerta" | "exito" | "error";
};

const clasesPorTono = {
  alerta: {
    fondo: "bg-alerta/15",
    texto: "text-alerta",
  },
  exito: {
    fondo: "bg-exito/15",
    texto: "text-exito",
  },
  error: {
    fondo: "bg-error/15",
    texto: "text-error",
  },
} as const;

export function ClayChip({ label, icono, tono }: ClayChipProps) {
  const clases = clasesPorTono[tono];

  return (
    <View
      accessibilityLabel={label}
      className={`self-start flex-row items-center gap-2 rounded-full px-4 py-2 ${clases.fondo}`}
    >
      <Ionicons name={icono} size={20} className={clases.texto} />
      <Text className={`text-base font-semibold ${clases.texto}`}>{label}</Text>
    </View>
  );
}
