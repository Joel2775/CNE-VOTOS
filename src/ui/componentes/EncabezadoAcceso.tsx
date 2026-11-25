import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

type EncabezadoAccesoProps = {
  icono: ComponentProps<typeof Ionicons>["name"];
  titulo: string;
  descripcion: string;
};

export function EncabezadoAcceso({
  icono,
  titulo,
  descripcion,
}: EncabezadoAccesoProps) {
  return (
    <View className="items-center gap-4">
      <View className="h-16 w-16 items-center justify-center rounded-tarjeta bg-primario/10">
        <Ionicons name={icono} size={32} className="text-primario" />
      </View>
      <View className="items-center gap-2">
        <Text className="text-center text-2xl font-bold text-texto">
          {titulo}
        </Text>
        <Text className="text-center text-base leading-6 text-texto-suave">
          {descripcion}
        </Text>
      </View>
    </View>
  );
}
