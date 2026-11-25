import { Stack, useRouter, useSegments } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { queryClient } from "@/core/queryClient";
import {
  iniciarPersistenciaConsultas,
  restaurarCacheConsultas,
} from "@/core/offline/persistenciaConsultas";
import { esErrorSinConexion } from "@/core/red/verificarConexionObligatoria";
import { obtenerGrupoInicial, useSesionStore } from "@/core/store/sesionStore";
import { useRestaurarSesion } from "@/features/cuentas/presentation/hooks/useAcceso";
import { cuentas } from "@/core/di/cuentas";
import { supabase } from "@/core/supabase/client";
import { AvisoSinConexionLottie } from "@/ui/componentes/AvisoSinConexionLottie";
import { ClayCard } from "@/ui/componentes/ClayCard";

import "../global.css";

function esErrorOtpExpirado(url: string): boolean {
  try {
    const enlace = new URL(url);
    const parametros = new URLSearchParams(enlace.search);
    const fragmento = new URLSearchParams(enlace.hash.replace(/^#/, ""));
    return (
      parametros.get("error_code") === "otp_expired" ||
      fragmento.get("error_code") === "otp_expired"
    );
  } catch {
    return false;
  }
}

export default function RootLayout() {
  useRestaurarSesion();
  const router = useRouter();
  const segmentos = useSegments();
  const usuario = useSesionStore((estado) => estado.usuario);
  const perfil = useSesionStore((estado) => estado.perfil);
  const hidratado = useSesionStore((estado) => estado.hidratado);
  const errorHidratacion = useSesionStore(
    (estado) => estado.errorHidratacion,
  );
  const iniciarSesion = useSesionStore((estado) => estado.iniciarSesion);
  const cerrarSesion = useSesionStore((estado) => estado.cerrarSesion);
  const limpiarErrorHidratacion = useSesionStore(
    (estado) => estado.limpiarErrorHidratacion,
  );
  const [errorEnlace, setErrorEnlace] = useState<string | null>(null);
  const [errorPersistenciaCache, setErrorPersistenciaCache] = useState<{
    usuarioId: string;
    mensaje: string;
  } | null>(null);
  const [sinConexionEnlace, setSinConexionEnlace] = useState(false);
  const [urlPendiente, setUrlPendiente] = useState<string | null>(null);
  const [procesandoEnlace, setProcesandoEnlace] = useState(false);
  const [enlaceInicialRevisado, setEnlaceInicialRevisado] = useState(false);
  const [conexion, setConexion] = useState<boolean | null>(null);
  const [cacheUsuarioId, setCacheUsuarioId] = useState<
    string | null | undefined
  >(undefined);
  const urlProcesada = useRef<string | null>(null);
  const usuarioId = usuario?.id ?? null;
  const consultasListas =
    hidratado && cacheUsuarioId === usuarioId;
  const grupoInicial = obtenerGrupoInicial(usuario, perfil);
  const grupoActual = segmentos[0] ? `/${segmentos[0]}` : undefined;
  const rutaActual = segmentos[1];

  useEffect(
    () =>
      NetInfo.addEventListener((estado) => {
        setConexion(
          estado.isInternetReachable ?? estado.isConnected ?? null,
        );
      }),
    [],
  );

  useEffect(() => {
    if (!errorHidratacion) {
      return;
    }

    const temporizador = setTimeout(limpiarErrorHidratacion, 4_000);
    return () => clearTimeout(temporizador);
  }, [errorHidratacion, limpiarErrorHidratacion]);

  useEffect(() => {
    if (errorHidratacion && conexion === true) {
      limpiarErrorHidratacion();
    }
  }, [conexion, errorHidratacion, limpiarErrorHidratacion]);

  useEffect(() => {
    if (!hidratado) {
      return;
    }

    let activo = true;
    let detenerPersistencia = () => {};
    queryClient.clear();

    async function prepararCache(): Promise<void> {
      if (usuarioId) {
        try {
          await restaurarCacheConsultas(usuarioId);
        } catch (error) {
          if (activo) {
            setErrorPersistenciaCache({
              usuarioId,
              mensaje:
                error instanceof Error
                  ? `No se pudo restaurar la caché local. ${error.message}`
                  : "No se pudo restaurar la caché local.",
            });
          }
        }
        if (!activo) {
          return;
        }

        detenerPersistencia = iniciarPersistenciaConsultas(
          usuarioId,
          (error) => {
            if (activo) {
              setErrorPersistenciaCache({
                usuarioId,
                mensaje:
                  error instanceof Error
                    ? `No se pudo guardar la caché local. ${error.message}`
                    : "No se pudo guardar la caché local.",
              });
            }
          },
        );
      }

      if (activo) {
        setCacheUsuarioId(usuarioId);
      }
    }

    void prepararCache();
    return () => {
      activo = false;
      detenerPersistencia();
    };
  }, [hidratado, usuarioId]);

  useEffect(() => {
    let activo = true;

    function recibirUrl(url: string | null): void {
      if (!activo || !url || url === urlProcesada.current) {
        return;
      }

      let enlace: URL;
      try {
        enlace = new URL(url);
      } catch {
        return;
      }

      const parametros = new URLSearchParams(enlace.search);
      const fragmento = new URLSearchParams(enlace.hash.replace(/^#/, ""));
      const contieneCredenciales =
        parametros.has("code") ||
        fragmento.has("code") ||
        parametros.has("access_token") ||
        fragmento.has("access_token") ||
        parametros.has("refresh_token") ||
        fragmento.has("refresh_token") ||
        parametros.has("error_code") ||
        fragmento.has("error_code") ||
        parametros.has("error_description") ||
        fragmento.has("error_description");
      if (!contieneCredenciales) {
        return;
      }

      setProcesandoEnlace(true);
      setSinConexionEnlace(false);
      setUrlPendiente(url);
    }

    const suscripcion = Linking.addEventListener("url", ({ url }) => {
      recibirUrl(url);
    });
    void Linking.getInitialURL()
      .then(recibirUrl)
      .catch((error: unknown) => {
        if (activo) {
          setErrorEnlace(
            error instanceof Error
              ? error.message
              : "No se pudo abrir el enlace de acceso.",
          );
        }
      })
      .finally(() => {
        if (activo) {
          setEnlaceInicialRevisado(true);
        }
      });

    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !hidratado ||
      urlPendiente === null ||
      urlPendiente === urlProcesada.current
    ) {
      return;
    }
    const enlaceUrl = urlPendiente;
    urlProcesada.current = enlaceUrl;

    async function procesarUrl(url: string): Promise<void> {
      try {
        await cerrarSesion();
        await cuentas.cerrarSesion();
        const sesionEnlace = await cuentas.procesarEnlaceAutenticacion(url);
        const enlace = new URL(url);
        const parametros = new URLSearchParams(enlace.search);
        const fragmento = new URLSearchParams(enlace.hash.replace(/^#/, ""));
        const tipo =
          parametros.get("type") ?? fragmento.get("type") ?? "";
        const esRecuperacion =
          tipo === "recovery" || url.includes("recuperar-contrasena");
        const flujoEnlace = esRecuperacion ? "recuperacion" : "invitacion";
        const sesionActual = await cuentas.obtenerPerfilActual();
        if (
          !sesionActual ||
          sesionActual.usuario.id !== sesionEnlace.usuario.id
        ) {
          throw new Error(
            "No se pudo actualizar el perfil de la cuenta del enlace.",
          );
        }
        await iniciarSesion(
          sesionActual.usuario,
          sesionActual.perfil,
          flujoEnlace,
        );
        router.replace(
          sesionActual.perfil.debe_cambiar_clave
            ? "/(auth)/primer-acceso"
            : esRecuperacion
              ? "/(auth)/recuperar-contrasena"
              : obtenerGrupoInicial(
                  sesionActual.usuario,
                  sesionActual.perfil,
                ),
        );
        setErrorEnlace(null);
      } catch (error) {
        let errorFinal = error;
        if (esErrorOtpExpirado(url)) {
          try {
            const { data, error: errorSesion } =
              await supabase.auth.getSession();
            if (errorSesion) {
              throw new Error(
                `No se pudo comprobar la sesión activa. ${errorSesion.message}`,
              );
            }

            const idUsuario = data.session?.user.id;
            if (idUsuario) {
              const sesionActiva = await cuentas.obtenerPerfilActual();
              if (
                sesionActiva?.usuario.id === idUsuario &&
                sesionActiva.perfil.debe_cambiar_clave
              ) {
                await iniciarSesion(
                  sesionActiva.usuario,
                  sesionActiva.perfil,
                  "invitacion",
                );
                router.replace("/(auth)/primer-acceso");
                setErrorEnlace(null);
                setSinConexionEnlace(false);
                return;
              }
            }
          } catch (errorRecuperacion) {
            errorFinal = errorRecuperacion;
          }
        }
        setSinConexionEnlace(esErrorSinConexion(errorFinal));
        setErrorEnlace(
          errorFinal instanceof Error
            ? errorFinal.message
            : "No se pudo validar el enlace de acceso.",
        );
      } finally {
        setUrlPendiente(null);
        setProcesandoEnlace(false);
      }
    }

    void procesarUrl(enlaceUrl);
  }, [cerrarSesion, hidratado, iniciarSesion, router, urlPendiente]);

  useEffect(() => {
    if (
      !hidratado ||
      !enlaceInicialRevisado ||
      procesandoEnlace ||
      urlPendiente !== null
    ) {
      return;
    }
    if (perfil?.debe_cambiar_clave === true) {
      if (grupoActual !== "/(auth)" || rutaActual !== "primer-acceso") {
        router.replace("/(auth)/primer-acceso");
      }
      return;
    }
    if (grupoActual === "/(auth)" && rutaActual === "recuperar-contrasena") {
      return;
    }
    if (grupoActual !== grupoInicial) {
      router.replace(grupoInicial);
    }
  }, [
    enlaceInicialRevisado,
    grupoActual,
    grupoInicial,
    hidratado,
    perfil,
    procesandoEnlace,
    router,
    rutaActual,
    urlPendiente,
  ]);

  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-fondo">
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            {!hidratado || !consultasListas || !enlaceInicialRevisado ? (
              <View className="flex-1 items-center justify-center gap-4 bg-fondo">
                <ActivityIndicator colorClassName="accent-primario" size="large" />
                <Text className="text-lg text-texto">
                  {!hidratado
                    ? "Restaurando sesión..."
                    : !consultasListas
                      ? "Restaurando datos guardados..."
                      : "Verificando enlace de acceso..."}
                </Text>
              </View>
            ) : (
              <>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(provincial)" />
                  <Stack.Screen name="(recinto)" />
                  <Stack.Screen name="(veedor)" />
                </Stack>
                {errorHidratacion ||
                (consultasListas &&
                  errorPersistenciaCache?.usuarioId === usuarioId) ? (
                  <View className="absolute bottom-28 left-4 right-4 gap-2">
                    {errorHidratacion ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar aviso de sesión"
                        onPress={limpiarErrorHidratacion}
                      >
                        <ClayCard>
                          <Text className="text-base leading-6 text-texto">
                            {errorHidratacion}
                          </Text>
                        </ClayCard>
                      </Pressable>
                    ) : null}
                    {consultasListas &&
                    errorPersistenciaCache?.usuarioId === usuarioId ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar aviso de caché local"
                        onPress={() => setErrorPersistenciaCache(null)}
                      >
                        <ClayCard>
                          <Text className="text-base leading-6 text-error">
                            {errorPersistenciaCache.mensaje}
                          </Text>
                        </ClayCard>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {errorEnlace ? (
                  <View className="absolute bottom-6 left-4 right-4">
                    <ClayCard>
                      <Text className="text-base leading-6 text-error">
                        {errorEnlace}
                      </Text>
                    </ClayCard>
                  </View>
                ) : null}
                {procesandoEnlace ? (
                  <View className="absolute inset-0 items-center justify-center gap-4 bg-fondo/95">
                    <ActivityIndicator colorClassName="accent-primario" size="large" />
                    <Text className="text-lg text-texto">
                      Validando enlace de acceso…
                    </Text>
                  </View>
                ) : null}
                <AvisoSinConexionLottie
                  visible={sinConexionEnlace}
                  onDismiss={() => setSinConexionEnlace(false)}
                />
              </>
            )}
          </QueryClientProvider>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
