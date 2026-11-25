import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { router } from "expo-router";

import { useAcceso } from "@/features/cuentas/presentation/hooks/useAcceso";
import {
  credencialesAccesoSchema,
  type CredencialesAcceso,
} from "@/features/cuentas/domain/esquemas/cuentasEsquemas";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { EncabezadoAcceso } from "@/ui/componentes/EncabezadoAcceso";
import { ClayInput } from "@/ui/componentes/ClayInput";
import { AvisoSinConexionLottie } from "@/ui/componentes/AvisoSinConexionLottie";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";

export default function AccesoPantalla() {
  const {
    acceder,
    confirmarAcceso,
    error,
    estadoAcceso,
    sinConexion,
    limpiarError,
  } = useAcceso();
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CredencialesAcceso>({
    resolver: zodResolver(credencialesAccesoSchema),
    defaultValues: { correo: "", contrasena: "" },
    mode: "onChange",
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-fondo"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <ClayCard className="gap-8">
          <EncabezadoAcceso
            icono="shield-checkmark-outline"
            titulo="Control Electoral"
            descripcion="Ingresa con el correo y la contraseña que te asignó tu responsable."
          />
          <View className="gap-5">
            <Controller
              control={control}
              name="correo"
              render={({ field }) => (
                <ClayInput
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.correo?.message}
                  keyboardType="email-address"
                  label="Correo electrónico"
                  onBlur={field.onBlur}
                  onChangeText={(valor) => {
                    limpiarError();
                    field.onChange(valor);
                  }}
                  placeholder="nombre@correo.com"
                  textContentType="emailAddress"
                  value={field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="contrasena"
              render={({ field }) => (
                <ClayInput
                  autoCapitalize="none"
                  autoComplete="password"
                  error={errors.contrasena?.message}
                  label="Contraseña"
                  onBlur={field.onBlur}
                  onChangeText={(valor) => {
                    limpiarError();
                    field.onChange(valor);
                  }}
                  placeholder="Escribe tu contraseña"
                  secureTextEntry={!mostrarContrasena}
                  textContentType="password"
                  value={field.value}
                  accionDerecha={{
                    texto: mostrarContrasena ? "Ocultar" : "Mostrar",
                    alPresionar: () =>
                      setMostrarContrasena((mostrar) => !mostrar),
                  }}
                />
              )}
            />
          </View>
          <ClayButton
            disabled={isSubmitting || !isValid}
            loading={isSubmitting}
            onPress={handleSubmit(acceder)}
            title="Iniciar sesión"
          />
          <Pressable
            accessibilityRole="button"
            className="min-h-[52px] items-center justify-center"
            onPress={() => router.push("/(auth)/recuperar-contrasena")}
          >
            <Text className="text-base font-semibold text-primario">
              Olvidé mi contraseña
            </Text>
          </Pressable>
        </ClayCard>
        {isSubmitting && estadoAcceso === null ? (
          <EstadoOperacion
            estado="procesando"
            mensaje="Verificando tus datos…"
            presentacion="flotante"
            visible
          />
        ) : null}
        {estadoAcceso === "exito" ? (
          <EstadoOperacion
            estado="exito"
            mensaje="¡Inicio de sesión exitoso! Preparando tu espacio…"
            onAnimationFinish={() => void confirmarAcceso()}
            presentacion="flotante"
            visible
          />
        ) : null}
        {error && !sinConexion ? (
          <EstadoOperacion
            estado="error"
            mensaje={error}
            onDismiss={limpiarError}
            presentacion="flotante"
            visible
          />
        ) : null}
        <AvisoSinConexionLottie
          visible={sinConexion}
          onDismiss={limpiarError}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
