import { Text, View } from "react-native";

import type {
  PerfilUsuario,
  UsuarioAutenticado,
} from "@/core/store/sesionStore";
import { ClayButton } from "./ClayButton";
import { ClayCard } from "./ClayCard";

type CabeceraSesionProps = {
  usuario: UsuarioAutenticado | null;
  perfil: PerfilUsuario | null;
  enLinea: boolean | null;
  actasPendientes: number | null;
  cerrandoSesion: boolean;
  errorCerrarSesion: string | null;
  errorContador: string | null;
  onCerrarSesion: () => void;
};

const nombresRol = {
  coordinador_provincial: "Coordinador provincial",
  coordinador_recinto: "Coordinador de recinto",
  veedor: "Veedor",
} as const;

export function CabeceraSesion({
  usuario,
  perfil,
  enLinea,
  actasPendientes,
  cerrandoSesion,
  errorCerrarSesion,
  errorContador,
  onCerrarSesion,
}: CabeceraSesionProps) {
  const estadoConexion =
    enLinea === null
      ? "Comprobando conexión…"
      : enLinea
        ? "En línea"
        : "Sin conexión";

  return (
    <ClayCard className="gap-4">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View
          accessibilityLabel={`Estado de conexión: ${estadoConexion}`}
          className={`rounded-full px-4 py-2 ${
            enLinea
              ? "bg-exito/15"
              : enLinea === false
                ? "bg-error/15"
                : "bg-alerta/15"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              enLinea
                ? "text-exito"
                : enLinea === false
                  ? "text-error"
                  : "text-alerta"
            }`}
          >
            {estadoConexion}
          </Text>
        </View>
        <Text className="text-base font-semibold text-texto">
          Actas pendientes: {actasPendientes ?? "No disponible"}
        </Text>
      </View>
      {errorContador ? (
        <Text accessibilityRole="alert" className="text-base text-error">
          No se pudo consultar la cola de envío: {errorContador}
        </Text>
      ) : null}

      <View className="gap-1">
        <Text className="text-lg font-bold text-texto">
          {perfil ? `${perfil.nombres} ${perfil.apellidos}` : "Sesión activa"}
        </Text>
        <Text className="text-base text-texto-suave">
          {perfil ? nombresRol[perfil.rol] : usuario?.correo ?? ""}
        </Text>
      </View>

      <ClayButton
        title="Cerrar sesión"
        loading={cerrandoSesion}
        loadingLabel="Cerrando sesión…"
        onPress={onCerrarSesion}
      />
      {errorCerrarSesion ? (
        <Text accessibilityRole="alert" className="text-base text-error">
          {errorCerrarSesion}
        </Text>
      ) : null}
    </ClayCard>
  );
}
