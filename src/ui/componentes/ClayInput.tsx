import { Pressable, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

type ClayInputProps = Omit<TextInputProps, "placeholderTextColor"> & {
  label: string;
  error?: string;
  accionDerecha?: {
    texto: string;
    alPresionar: () => void;
  };
};

export function ClayInput({
  label,
  error,
  accionDerecha,
  className = "",
  ...inputProps
}: ClayInputProps) {
  return (
    <View className="gap-2">
      <Text className="text-base font-medium text-texto">{label}</Text>
      <View
        className={`min-h-[56px] flex-row items-center rounded-campo border border-primario/20 bg-superficie px-4 ${
          error ? "border-error" : ""
        } ${className}`}
        style={{
          boxShadow: [
            { offsetX: 3, offsetY: 4, blurRadius: 8, color: "rgba(70,60,140,0.14)" },
            { offsetX: -3, offsetY: -3, blurRadius: 7, color: "rgba(255,255,255,0.8)", inset: true },
          ],
        }}
      >
        <TextInput
          accessibilityLabel={label}
          className="min-h-[54px] flex-1 text-lg text-texto"
          placeholderTextColorClassName="text-texto-suave"
          {...inputProps}
        />
        {accionDerecha ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accionDerecha.texto}
            className="min-h-[48px] justify-center pl-3"
            onPress={accionDerecha.alPresionar}
          >
            <Text className="text-base font-semibold text-primario">
              {accionDerecha.texto}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-base text-error">{error}</Text> : null}
    </View>
  );
}
