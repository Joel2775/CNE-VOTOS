import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  obtenerGrupoInicial,
  useSesionStore,
} from "@/core/store/sesionStore";
import {
  cambioContrasenaSchema,
  type CambioContrasena,
} from "@/features/cuentas/domain/esquemas/cuentasEsquemas";
import { useCambiarContrasena } from "@/features/cuentas/presentation/hooks/useCambiarContrasena";
import { esErrorSinConexion } from "@/core/red/verificarConexionObligatoria";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";
import { AvisoSinConexionLottie } from "@/ui/componentes/AvisoSinConexionLottie";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { EncabezadoAcceso } from "@/ui/componentes/EncabezadoAcceso";
import { ClayInput } from "@/ui/componentes/ClayInput";

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo completar el cambio de contraseña.";
}

export default function PrimerAccesoPantalla() {
  const usuario = useSesionStore((estado) => estado.usuario);
  const perfil = useSesionStore((estado) => estado.perfil);
  const establecerSesion = useSesionStore((estado) => estado.iniciarSesion);
  const limpiarFlujoEnlace = useSesionStore((estado) => estado.limpiarFlujoEnlace);
  const cambiarContrasena = useCambiarContrasena();
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [estadoOperacion, setEstadoOperacion] = useState<
    "procesando" | "exito" | "error" | null
  >(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CambioContrasena>({
    resolver: zodResolver(cambioContrasenaSchema),
    defaultValues: { contrasena: "", confirmarContrasena: "" },
    mode: "onChange",
  });

  async function guardarContrasena(datos: CambioContrasena) {
    setErrorAccion(null);
    setMensaje(null);
    setSinConexion(false);
    setEstadoOperacion("procesando");
    try {
      const sesion = await cambiarContrasena.mutateAsync(datos.contrasena);
      await establecerSesion(sesion.usuario, sesion.perfil);
      limpiarFlujoEnlace();
      setMensaje("Contraseña guardada. Ya puedes continuar.");
      setEstadoOperacion("exito");
      router.replace(obtenerGrupoInicial(sesion.usuario, sesion.perfil));
    } catch (error) {
      setSinConexion(esErrorSinConexion(error));
      setErrorAccion(mensajeDeError(error));
      setEstadoOperacion("error");
    }
  }

  const puedeDefinirContrasena =
    Boolean(usuario && perfil?.debe_cambiar_clave);

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerClassName="flex-grow justify-center gap-5 p-5"
      keyboardShouldPersistTaps="handled"
    >
      <ClayCard className="gap-5">
        <EncabezadoAcceso
          icono="key-outline"
          titulo="Primer acceso"
          descripcion="Crea una contraseña personal que solo tú conozcas."
        />
        {estadoOperacion ? (
          <EstadoOperacion
            estado={estadoOperacion}
            mensaje={errorAccion ?? mensaje ?? "Validando tu enlace…"}
          />
        ) : null}
        {usuario && perfil?.debe_cambiar_clave === true ? (
          <Text className="text-base leading-6 text-exito">
            Correo verificado. Define tu contraseña personal.
          </Text>
        ) : null}
        {!puedeDefinirContrasena ? (
          <Text className="text-base leading-6 text-texto">
            Abre el enlace de invitación que enviamos a tu correo. Si venció,
            solicita a tu coordinador que envíe una invitación nueva.
          </Text>
        ) : (
          <View className="gap-5">
            <Controller
              control={control}
              name="contrasena"
              render={({ field }) => (
                <ClayInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  error={errors.contrasena?.message}
                  label="Nueva contraseña"
                  onBlur={field.onBlur}
                  onChangeText={(valor) => {
                    setErrorAccion(null);
                    field.onChange(valor);
                  }}
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
              control={control}
              name="confirmarContrasena"
              render={({ field }) => (
                <ClayInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  error={errors.confirmarContrasena?.message}
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
              title="Guardar contraseña"
              loading={cambiarContrasena.isPending}
              loadingLabel="Guardando…"
              disabled={!usuario || !isValid || cambiarContrasena.isPending}
              onPress={handleSubmit(guardarContrasena)}
            />
          </View>
        )}
        {!puedeDefinirContrasena ? (
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
        ) : null}
      </ClayCard>
      <AvisoSinConexionLottie
        visible={sinConexion}
        onDismiss={() => setSinConexion(false)}
      />
    </ScrollView>
  );
}
