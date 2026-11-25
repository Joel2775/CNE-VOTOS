import LottieView from "lottie-react-native";
import { Modal, Pressable, Text, View } from "react-native";

import animacionSinConexion from "../../../assets/lottie/No Connection.json";
import { ClayButton } from "./ClayButton";
import { ClayCard } from "./ClayCard";

type AvisoSinConexionLottieProps = {
  visible: boolean;
  onDismiss: () => void;
  onRetry?: () => void;
};

export function AvisoSinConexionLottie({
  visible,
  onDismiss,
  onRetry,
}: AvisoSinConexionLottieProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-center bg-texto/50 px-5">
        <ClayCard className="items-center gap-4">
          <LottieView
            autoPlay
            loop
            source={animacionSinConexion}
            style={{ width: 176, height: 132 }}
          />
          <Text className="text-center text-xl font-bold text-texto">
            Se necesita conexión a internet
          </Text>
          <Text className="text-center text-base leading-6 text-texto-suave">
            Esta operación necesita conexión con el servidor central. Conéctate
            e inténtalo nuevamente.
          </Text>
          {onRetry ? (
            <ClayButton title="Reintentar" onPress={onRetry} />
          ) : null}
          <Pressable
            accessibilityRole="button"
            className="min-h-[52px] items-center justify-center px-4"
            onPress={onDismiss}
          >
            <Text className="text-base font-semibold text-primario">
              Entendido
            </Text>
          </Pressable>
        </ClayCard>
      </View>
    </Modal>
  );
}
