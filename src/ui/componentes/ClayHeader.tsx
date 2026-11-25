import { Text, View } from "react-native";

type ClayHeaderProps = {
  titulo: string;
  descripcion: string;
};

export function ClayHeader({ titulo, descripcion }: ClayHeaderProps) {
  return (
    <View className="gap-2">
      <Text className="text-3xl font-bold text-texto">{titulo}</Text>
      <Text className="text-lg leading-7 text-texto-suave">{descripcion}</Text>
    </View>
  );
}
