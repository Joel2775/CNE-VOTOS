import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function useEstadoConectividad(): { enLinea: boolean | null } {
  const [enLinea, setEnLinea] = useState<boolean | null>(null);

  useEffect(
    () =>
      NetInfo.addEventListener((estado) => {
        setEnLinea(
          estado.isInternetReachable ?? estado.isConnected ?? null,
        );
      }),
    [],
  );

  return { enLinea };
}
