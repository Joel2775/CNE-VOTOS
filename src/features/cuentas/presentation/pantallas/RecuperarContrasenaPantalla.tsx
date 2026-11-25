import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useSesionStore } from "@/core/store/sesionStore";
import {
  cambioContrasenaSchema,
  solicitudRecuperacionSchema,
  type CambioContrasena,
  type SolicitudRecuperacion,
} from "@/features/cuentas/domain/esquemas/cuentasEsquemas";
import { useCambiarContrasena } from "@/features/cuentas/presentation/hooks/useCambiarContrasena";
import { useSolicitarRecuperacion } from "@/features/cuentas/presentation/hooks/useSolicitarRecuperacion";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";
import { esErrorSinConexion } from "@/core/red/verificarConexionObligatoria";
import { AvisoSinConexionLottie } from "@/ui/componentes/AvisoSinConexionLottie";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { EncabezadoAcceso } from "@/ui/componentes/EncabezadoAcceso";
import { ClayInput } from "@/ui/componentes/ClayInput";

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la recuperación.";
}

export default function RecuperarContrasenaPantalla() {
  const establecerSesion = useSesionStore((estado) => estado.iniciarSesion);
  const limpiarFlujoEnlace = useSesionStore((estado) => estado.limpiarFlujoEnlace);
  const flujoEnlace = useSesionStore((estado) => estado.flujoEnlace);
  const usuario = useSesionStore((estado) => estado.usuario);
  const solicitarRecuperacion = useSolicitarRecuperacion();
  const cambiarContrasena = useCambiarContrasena();
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [estadoOperacion, setEstadoOperacion] = useState<
    "procesando" | "exito" | "error" | null
  >(null);
  const formularioCorreo = useForm<SolicitudRecuperacion>({
    resolver: zodResolver(solicitudRecuperacionSchema),
    defaultValues: { correo: "" },
    mode: "onChange",
  });
  const formularioContrasena = useForm<CambioContrasena>({
    resolver: zodResolver(cambioContrasenaSchema),
    defaultValues: { contrasena: "", confirmarContrasena: "" },
    mode: "onChange",
  });

  async function enviarCorreo(datos: SolicitudRecuperacion) {
    setErrorAccion(null);
    setMensaje(null);
    setSinConexion(false);
    setEstadoOperacion("procesando");
    try {
      await solicitarRecuperacion.mutateAsync(datos.correo);
      setMensaje(
        "Si el correo está registrado, recibirás un enlace para cambiar la contraseña.",
      );
      setEstadoOperacion("exito");
    } catch (error) {
      const desconectada = esErrorSinConexion(error);
      setSinConexion(desconectada);
      setErrorAccion(mensajeDeError(error));
      setEstadoOperacion(desconectada ? null : "error");
    }
  }

  async function guardarContrasena(datos: CambioContrasena) {
    setErrorAccion(null);
    setMensaje(null);
    setSinConexion(false);
    setEstadoOperacion("procesando");
    try {
      const sesion = await cambiarContrasena.mutateAsync(datos.contrasena);
      await establecerSesion(sesion.usuario, sesion.perfil);
      limpiarFlujoEnlace();
      setMensaje("Contraseña actualizada. Ya puedes continuar.");
      setEstadoOperacion("exito");
      router.replace(
        sesion.perfil.rol === "coordinador_provincial"
          ? "/(provincial)"
          : sesion.perfil.rol === "coordinador_recinto"
            ? "/(recinto)"
            : "/(veedor)",
      );
    } catch (error) {
      const desconectada = esErrorSinConexion(error);
      setSinConexion(desconectada);
      setErrorAccion(mensajeDeError(error));
      setEstadoOperacion(desconectada ? null : "error");
    }
  }

  function reintentarOperacion(): void {
    setSinConexion(false);
    setEstadoOperacion(null);
    if (flujoEnlace === "recuperacion" && usuario) {
      void formularioContrasena.handleSubmit(guardarContrasena)();
      return;
    }

    void formularioCorreo.handleSubmit(enviarCorreo)();
  }

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerClassName="flex-grow justify-center gap-5 p-5"
      keyboardShouldPersistTaps="handled"
    >
      <ClayCard className="gap-5">
        <EncabezadoAcceso
          icono={
            flujoEnlace === "recuperacion" && usuario
              ? "key-outline"
              : "mail-outline"
          }
          titulo="Recuperar contraseña"
          descripcion={
            flujoEnlace === "recuperacion" && usuario
              ? "Crea una contraseña nueva para tu cuenta."
              : "Te enviaremos un enlace seguro a tu correo."
          }
        />
        {flujoEnlace === "recuperacion" && usuario ? (
          <View className="gap-5">
            <Controller
              control={formularioContrasena.control}
              name="contrasena"
              render={({ field }) => (
                <ClayInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  error={
                    formularioContrasena.formState.errors.contrasena?.message
                  }
                  label="Nueva contraseña"
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  placeholder="Mínimo 12 caracteres"
                  secureTextEntry={!mostrarContrasena}
                  textContentType="newPassword"
                  value={field.value}
                  accionDerecha={{
                    texto: mostrarContrasena ? "Ocultar" : "Mostrar",
                    alPresionar: () =>
                      setMostrarContrasena((mostrar) => !mostrar),
                  }}
                />
              )}
            />
            <Controller
              control={formularioContrasena.control}
              name="confirmarContrasena"
              render={({ field }) => (
                <ClayInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  error={
                    formularioContrasena.formState.errors.confirmarContrasena
                      ?.message
                  }
                  label="Confirma tu contraseña"
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  secureTextEntry={!mostrarContrasena}
                  textContentType="newPassword"
                  value={field.value}
                />
              )}
            />
            <Text className="text-base leading-6 text-texto-suave">
              Usa al menos 12 caracteres, con mayúsculas, minúsculas y números.
            </Text>
            <ClayButton
              title="Guardar contraseña nueva"
              loading={cambiarContrasena.isPending}
              loadingLabel="Guardando…"
              disabled={
                !formularioContrasena.formState.isValid ||
                cambiarContrasena.isPending
              }
              onPress={formularioContrasena.handleSubmit(guardarContrasena)}
            />
          </View>
        ) : (
          <View className="gap-5">
            <Controller
              control={formularioCorreo.control}
              name="correo"
              render={({ field }) => (
                <ClayInput
                  autoCapitalize="none"
                  autoComplete="email"
                  error={formularioCorreo.formState.errors.correo?.message}
                  keyboardType="email-address"
                  label="Correo electrónico"
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  placeholder="nombre@correo.com"
                  textContentType="emailAddress"
                  value={field.value}
                />
              )}
            />
            <ClayButton
              title="Enviar enlace de recuperación"
              loading={solicitarRecuperacion.isPending}
              loadingLabel="Enviando…"
              disabled={
                !formularioCorreo.formState.isValid ||
                solicitarRecuperacion.isPending
              }
              onPress={formularioCorreo.handleSubmit(enviarCorreo)}
            />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          className="min-h-[52px] items-center justify-center"
          onPress={() => {
            limpiarFlujoEnlace();
            router.replace("/(auth)");
          }}
        >
          <Text className="text-base font-semibold text-primario">
            Volver al inicio de sesión
          </Text>
        </Pressable>
      </ClayCard>
      {estadoOperacion && !sinConexion ? (
        <EstadoOperacion
          estado={estadoOperacion}
          mensaje={errorAccion ?? mensaje ?? "Procesando…"}
          onDismiss={
            estadoOperacion === "procesando"
              ? undefined
              : () => setEstadoOperacion(null)
          }
          presentacion="flotante"
          visible
        />
      ) : null}
      <AvisoSinConexionLottie
        visible={sinConexion}
        onDismiss={() => {
          setSinConexion(false);
          setEstadoOperacion(null);
        }}
        onRetry={reintentarOperacion}
      />
    </ScrollView>
  );
}
