import LottieView from "lottie-react-native";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from "react-native-reanimated";

import { ClayCard } from "../componentes/ClayCard";

type EstadoOperacionProps = {
  estado: "procesando" | "exito" | "error" | "sinConexion";
  mensaje: string;
  presentacion?: "integrada" | "flotante";
  visible?: boolean;
  onAnimationFinish?: () => void;
  onDismiss?: () => void;
};

const animaciones = {
  procesando: require("../../../assets/lottie/loading.json"),
  exito: require("../../../assets/lottie/success.json"),
  error: require("../../../assets/lottie/Failed.json"),
  sinConexion: require("../../../assets/lottie/No Connection.json"),
} as const;

export function EstadoOperacion({
  estado,
  mensaje,
  presentacion = "integrada",
  visible = true,
  onAnimationFinish,
  onDismiss,
}: EstadoOperacionProps) {
  const flotante = presentacion === "flotante";
  const escala = useDerivedValue(() =>
    withSpring(estado === "procesando" ? 0.96 : 1, {
      damping: 14,
      stiffness: 160,
    }),
  );
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));
  const animacion = (
    <LottieView
      autoPlay
      loop={estado === "procesando"}
      onAnimationFinish={() => onAnimationFinish?.()}
      source={animaciones[estado]}
      style={{ width: flotante ? 160 : 64, height: flotante ? 160 : 64 }}
    />
  );
  const contenido = flotante ? (
    <Animated.View style={estiloAnimado}>
      <ClayCard className="w-full max-w-[420px] items-center gap-4">
        {animacion}
        <Text className="text-center text-lg font-semibold leading-6 text-texto">
          {mensaje}
        </Text>
        {onDismiss && estado !== "procesando" ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-[56px] items-center justify-center px-6"
            onPress={onDismiss}
          >
            <Text className="text-lg font-semibold text-primario">
              Entendido
            </Text>
          </Pressable>
        ) : null}
      </ClayCard>
    </Animated.View>
  ) : (
    <Animated.View style={estiloAnimado}>
      <View
        accessibilityLiveRegion="polite"
        className="flex-row items-center gap-3 rounded-tarjeta bg-superficie p-4"
      >
        {animacion}
        <Text className="flex-1 text-base font-semibold text-texto">
          {mensaje}
        </Text>
      </View>
    </Animated.View>
  );

  return flotante ? (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-texto/60 px-6">
        {contenido}
      </View>
    </Modal>
  ) : (
    contenido
  );
}
