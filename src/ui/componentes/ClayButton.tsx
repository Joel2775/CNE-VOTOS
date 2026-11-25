import { Pressable, Text } from "react-native";

type ClayButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
};

export function ClayButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel = "Ingresando...",
}: ClayButtonProps) {
  const bloqueado = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: bloqueado, busy: loading }}
      className={`min-h-[56px] items-center justify-center rounded-boton bg-primario px-6 py-4 ${
        bloqueado ? "opacity-60" : "active:scale-[0.97]"
      }`}
      disabled={bloqueado}
      onPress={onPress}
      style={{
        boxShadow: [
          { offsetX: 6, offsetY: 8, blurRadius: 16, color: "rgba(70,60,140,0.22)" },
          { offsetX: -4, offsetY: -4, blurRadius: 10, color: "rgba(255,255,255,0.35)" },
          { offsetX: 3, offsetY: 3, blurRadius: 8, color: "rgba(255,255,255,0.16)", inset: true },
        ],
      }}
    >
      <Text className="text-center text-lg font-semibold text-superficie">
        {loading ? loadingLabel : title}
      </Text>
    </Pressable>
  );
}
