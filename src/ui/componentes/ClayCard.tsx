import type { PropsWithChildren } from "react";
import { View } from "react-native";

type ClayCardProps = PropsWithChildren<{
  className?: string;
}>;

export function ClayCard({ children, className = "" }: ClayCardProps) {
  return (
    <View
      className={`rounded-tarjeta bg-superficie p-6 ${className}`}
      style={{
        boxShadow: [
          { offsetX: 8, offsetY: 10, blurRadius: 20, color: "rgba(70,60,140,0.25)" },
          { offsetX: -6, offsetY: -6, blurRadius: 14, color: "rgba(255,255,255,0.9)" },
          { offsetX: 4, offsetY: 4, blurRadius: 10, color: "rgba(255,255,255,0.7)", inset: true },
          { offsetX: -4, offsetY: -6, blurRadius: 10, color: "rgba(70,60,140,0.18)", inset: true },
        ],
      }}
    >
      {children}
    </View>
  );
}
