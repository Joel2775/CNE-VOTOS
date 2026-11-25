import { zodResolver } from "@hookform/resolvers/zod";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { actas } from "@/core/di/actas";
import { evidencia } from "@/core/di/evidencia";
import { sincronizacion } from "@/core/di/sincronizacion";
import { useEstadoConectividad } from "@/core/red/useEstadoConectividad";
import { useSesionStore } from "@/core/store/sesionStore";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import {
  formularioActaSchema,
  type FormularioActaEntrada,
  type FormularioActaValida,
} from "@/features/actas/domain/esquemas/actaEsquemas";
import { useMesasAsignadasVeedor } from "@/features/asignaciones/presentation/hooks/useAsignaciones";
import {
  MARGEN_GEOVALLA_METROS,
  esFotoNitida,
} from "@/features/evidencia/domain/entidades/geovalla";
import { AnalizadorNitidez } from "@/features/evidencia/presentation/componentes/AnalizadorNitidez";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { ClayChip } from "@/ui/componentes/ClayChip";
import { ClayHeader } from "@/ui/componentes/ClayHeader";
import { ClayInput } from "@/ui/componentes/ClayInput";

type DignidadParam = string | string[] | undefined;
type PasoCapturaActa = 0 | 1 | 2;

const pasosCaptura = ["Resultados", "Fotografía", "Revisión"] as const;

function obtenerDignidad(valor: DignidadParam): DignidadActa | null {
  if (valor === "alcaldia" || valor === "prefectura") {
    return valor;
  }
  return null;
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function etiquetaDignidad(dignidad: DignidadActa): string {
  return dignidad === "alcaldia" ? "Alcaldía" : "Prefectura";
}

export default function CapturaActaPantalla() {
  const parametros = useLocalSearchParams<{
    mesaId?: string | string[];
    dignidad?: string | string[];
    actaId?: string | string[];
  }>();
  const mesaId =
    typeof parametros.mesaId === "string" ? parametros.mesaId : null;
  const dignidad = obtenerDignidad(parametros.dignidad);
  const actaIdRecaptura =
    typeof parametros.actaId === "string" ? parametros.actaId : null;
  const perfil = useSesionStore((estado) => estado.perfil);
  const conexion = useEstadoConectividad();
  const queryClient = useQueryClient();
  const camaraRef = useRef<CameraView>(null);
  const [permisoCamara, solicitarPermisoCamara] = useCameraPermissions();
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoAncho, setFotoAncho] = useState(0);
  const [fotoAlto, setFotoAlto] = useState(0);
  const [fotoHash, setFotoHash] = useState<string | null>(null);
  const [fotoCapturadaEn, setFotoCapturadaEn] = useState<string | null>(null);
  const [varianza, setVarianza] = useState<number | null>(null);
  const [pasoActual, setPasoActual] = useState<PasoCapturaActa>(0);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [errorHash, setErrorHash] = useState<string | null>(null);
  const [analizandoFoto, setAnalizandoFoto] = useState(false);
  const [fotoConfirmada, setFotoConfirmada] = useState(false);
  const [actaGuardada, setActaGuardada] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState<{
    estado: "exito" | "error" | "sinConexion";
    texto: string;
  } | null>(null);

  const consultaMesas = useMesasAsignadasVeedor(perfil?.id ?? null);
  const mesa = consultaMesas.data?.find((item) => item.mesa_id === mesaId);
  const consultaUbicacion = useQuery({
    queryKey: ["ubicacion-captura", mesa?.mesa_id],
    queryFn: () => {
      if (!mesa) {
        throw new Error("No se encontró la mesa asignada.");
      }
      return evidencia.leerUbicacion({
        latitud: mesa.latitud,
        longitud: mesa.longitud,
      });
    },
    enabled: Boolean(mesa),
    retry: false,
    staleTime: 0,
  });
  const ubicacion = consultaUbicacion.isError ? null : consultaUbicacion.data ?? null;
  const formulario = useForm<
    FormularioActaEntrada,
    unknown,
    FormularioActaValida
  >({
    resolver: zodResolver(formularioActaSchema),
    defaultValues: {
      total_sufragantes: "",
      votos_nulos: "",
      votos_blancos: "",
      votos: [],
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const valoresFormulario = useWatch({ control: formulario.control });
  const votosActuales = valoresFormulario.votos ?? [];
  const resetFormulario = formulario.reset;
  const [organizaciones, setOrganizaciones] = useState<
    Awaited<ReturnType<typeof actas.listarCatalogo>>
  >([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;

    async function cargarCatalogo(): Promise<void> {
      if (!dignidad) {
        setErrorCatalogo("El tipo de acta solicitado no es válido.");
        setCargandoCatalogo(false);
        return;
      }

      setCargandoCatalogo(true);
      setErrorCatalogo(null);
      try {
        const resultado = await actas.listarCatalogo(dignidad);
        if (activa) {
          setOrganizaciones(resultado);
          resetFormulario({
            total_sufragantes: "",
            votos_nulos: "",
            votos_blancos: "",
            votos: resultado.map((organizacion) => ({
              organizacion_id: organizacion.id,
              votos: "",
            })),
          });
        }
      } catch (error) {
        if (activa) {
          setErrorCatalogo(mensajeDeError(error));
        }
      } finally {
        if (activa) {
          setCargandoCatalogo(false);
        }
      }
    }

    void cargarCatalogo();
    return () => {
      activa = false;
    };
  }, [dignidad, resetFormulario]);

  const recibirNitidez = useCallback(
    (resultado: number | null, error: string | null) => {
      setVarianza(resultado);
      setErrorFoto(error);
      setAnalizandoFoto(false);
    },
    [],
  );

  async function tomarFoto(): Promise<void> {
    if (!camaraRef.current || !ubicacion) {
      return;
    }

    setErrorFoto(null);
    setErrorHash(null);
    setFotoConfirmada(false);
    setFotoHash(null);
    setVarianza(null);
    setAnalizandoFoto(true);

    let fotoUriLocal: string;
    try {
      const foto = await camaraRef.current.takePictureAsync({ quality: 1 });
      if (!foto) {
        throw new Error("La cámara no devolvió una fotografía.");
      }

      fotoUriLocal = foto.uri;
      setFotoUri(foto.uri);
      setFotoAncho(foto.width);
      setFotoAlto(foto.height);
      setFotoCapturadaEn(new Date().toISOString());
    } catch (error) {
      setAnalizandoFoto(false);
      setErrorFoto(`No se pudo tomar la foto: ${mensajeDeError(error)}`);
      return;
    }

    try {
      const hash = await evidencia.calcularHashSha256(fotoUriLocal);
      setFotoHash(hash);
    } catch (error) {
      setErrorHash(`No se pudo calcular el hash de la foto: ${mensajeDeError(error)}`);
    }
  }

  function repetirFoto(): void {
    setFotoUri(null);
    setFotoHash(null);
    setFotoCapturadaEn(null);
    setVarianza(null);
    setErrorFoto(null);
    setErrorHash(null);
    setFotoConfirmada(false);
  }

  async function guardarActa(valores: FormularioActaValida): Promise<void> {
    if (
      !mesa ||
      !dignidad ||
      !fotoUri ||
      !fotoHash ||
      !fotoCapturadaEn ||
      !fotoConfirmada ||
      !ubicacion
    ) {
      setMensajeGuardado({
        estado: "error",
        texto: "Completa la ubicación y confirma una foto nítida antes de guardar.",
      });
      return;
    }

    setMensajeGuardado(null);
    let guardadaEnCola = false;
    try {
      const resultadoUbicacion = await consultaUbicacion.refetch();
      if (resultadoUbicacion.error || !resultadoUbicacion.data) {
        throw resultadoUbicacion.error ?? new Error("No se obtuvo una ubicación GPS.");
      }
      const ubicacionActual = resultadoUbicacion.data;

      const capturadaEn = fotoCapturadaEn;
      const actaId = actaIdRecaptura ?? Crypto.randomUUID();
      await actas.guardarOffline({
        p_acta_id: actaId,
        p_mesa_id: mesa.mesa_id,
        p_dignidad: dignidad,
        p_total_sufragantes: valores.total_sufragantes,
        p_votos_nulos: valores.votos_nulos,
        p_votos_blancos: valores.votos_blancos,
        p_capturada_en: capturadaEn,
        p_votos: valores.votos,
        p_evidencia: {
          latitud: ubicacionActual.latitud,
          longitud: ubicacionActual.longitud,
          precision_m: ubicacionActual.precision_m,
          capturada_en: capturadaEn,
        },
        ruta_foto_local: fotoUri,
        distancia_metros: ubicacionActual.distancia_metros,
        hash_sha256: fotoHash,
        modo_recaptura: actaIdRecaptura !== null,
        id_recaptura: actaIdRecaptura ? Crypto.randomUUID() : undefined,
      });
      guardadaEnCola = true;
      setActaGuardada(true);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actas-pendientes"] }),
        queryClient.invalidateQueries({
          queryKey: ["mesas-asignadas-veedor"],
        }),
      ]);

      if (!conexion.enLinea) {
        setMensajeGuardado({
          estado: "sinConexion",
          texto:
            "Acta guardada localmente. Se enviará automáticamente cuando vuelva la conexión a internet.",
        });
        return;
      }

      let resultado = await sincronizacion.sincronizarPendientes();
      if (
        !resultado.sincronizadas.includes(actaId) &&
        !resultado.errores.some((error) => error.acta_id === actaId)
      ) {
        resultado = await sincronizacion.sincronizarPendientes();
      }

      const errorEnvio = resultado.errores.find((error) => error.acta_id === actaId);
      const sincronizada = resultado.sincronizadas.includes(actaId);
      setMensajeGuardado({
        estado: sincronizada ? "exito" : "error",
        texto: sincronizada
          ? actaIdRecaptura
            ? "Recaptura guardada y enviada para una nueva revisión."
            : "Acta guardada y sincronizada."
          : errorEnvio
            ? `Acta guardada en la cola. No se pudo enviar: ${errorEnvio.mensaje}`
            : "Acta guardada en la cola. Se enviará al recuperar la conexión.",
      });
    } catch (error) {
      setMensajeGuardado({
        estado: "error",
        texto: guardadaEnCola
          ? `Acta guardada en la cola, pero no se pudo completar la operación: ${mensajeDeError(error)}`
          : `No se pudo guardar el acta: ${mensajeDeError(error)}`,
      });
    }
  }

  const distanciaFuera =
    ubicacion !== null &&
    ubicacion.distancia_metros > MARGEN_GEOVALLA_METROS;
  const puedeAvanzarAFotografia =
    formulario.formState.isValid &&
    !cargandoCatalogo &&
    !errorCatalogo &&
    organizaciones.length === 5;
  const puedeAvanzarARevision = Boolean(
    ubicacion &&
      fotoUri &&
      fotoHash &&
      fotoCapturadaEn &&
      fotoConfirmada &&
      !analizandoFoto &&
      !errorFoto &&
      !errorHash,
  );

  if (!mesaId || !dignidad) {
    return (
      <View className="flex-1 justify-center gap-4 bg-fondo p-5">
        <ClayCard className="gap-4">
          <Text className="text-lg text-error">
            No se recibió una mesa o dignidad de acta válida.
          </Text>
          <ClayButton title="Volver a mis mesas" onPress={() => router.back()} />
        </ClayCard>
      </View>
    );
  }

  if (consultaMesas.isLoading || !mesa) {
    return (
      <View className="flex-1 justify-center gap-4 bg-fondo p-5">
        <ClayCard className="gap-4">
          <Text className="text-lg text-texto">
            {consultaMesas.isError
              ? mensajeDeError(consultaMesas.error)
              : consultaMesas.isLoading
                ? "Cargando los datos de la mesa…"
                : "Esta mesa ya no aparece entre tus asignaciones activas."}
          </Text>
          <ClayButton title="Volver a mis mesas" onPress={() => router.back()} />
        </ClayCard>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerClassName="gap-5 p-5"
      keyboardShouldPersistTaps="handled"
    >
      <ClayButton title="Volver a mis mesas" onPress={() => router.back()} />
      <ClayHeader
        titulo={`Acta de ${etiquetaDignidad(dignidad)}`}
        descripcion={`Mesa ${String(mesa.numero).padStart(3, "0")} · ${mesa.recinto}`}
      />

      <ClayCard className="gap-3">
        <Text className="text-base font-semibold text-texto-suave">
          Paso {pasoActual + 1} de {pasosCaptura.length}
        </Text>
        <View className="flex-row gap-2">
          {pasosCaptura.map((paso, indice) => (
            <View
              key={paso}
              accessibilityLabel={paso}
              className={`h-2 flex-1 rounded-full ${
                indice <= pasoActual ? "bg-primario" : "bg-fondo"
              }`}
            />
          ))}
        </View>
        <Text className="text-xl font-bold text-texto">
          {pasosCaptura[pasoActual]}
        </Text>
      </ClayCard>

      {pasoActual === 1 ? (
        <>
          <ClayCard className="gap-4">
            <Text className="text-xl font-bold text-texto">Ubicación de captura</Text>
            {ubicacion ? (
              <>
                <Text className="text-base text-texto">
                  Distancia al recinto: {ubicacion.distancia_metros.toFixed(2)} m
                </Text>
                <Text className="text-base text-texto-suave">
                  Precisión GPS: {ubicacion.precision_m.toFixed(1)} m
                </Text>
                {distanciaFuera ? (
                  <ClayChip
                    label="Fuera de 200 m: se enviará para revisión"
                    icono="warning-outline"
                    tono="alerta"
                  />
                ) : (
                  <ClayChip
                    label="Dentro del margen del recinto"
                    icono="checkmark-circle-outline"
                    tono="exito"
                  />
                )}
              </>
            ) : (
              <Text className="text-base text-texto-suave">
                La captura y el envío se habilitan cuando el GPS entregue una ubicación válida.
              </Text>
            )}
            {consultaUbicacion.error ? (
              <EstadoOperacion
                estado="error"
                mensaje={mensajeDeError(consultaUbicacion.error)}
              />
            ) : null}
            <ClayButton
              title="Reintentar lectura GPS"
              loading={consultaUbicacion.isFetching}
              loadingLabel="Leyendo ubicación…"
              onPress={() => void consultaUbicacion.refetch()}
            />
          </ClayCard>

          <ClayCard className="gap-4">
            <Text className="text-xl font-bold text-texto">Fotografía del acta</Text>
            {!fotoUri ? (
              permisoCamara?.granted ? (
                <View className="h-72 overflow-hidden rounded-tarjeta bg-texto">
                  <CameraView
                    ref={camaraRef}
                    facing="back"
                    mode="picture"
                    style={{ flex: 1 }}
                    onMountError={(evento) =>
                      setErrorFoto(`No se pudo iniciar la cámara: ${evento.message}`)
                    }
                  />
                  <View
                    pointerEvents="none"
                    className="absolute inset-5 rounded-campo border-4 border-superficie"
                  />
                  <Text className="absolute bottom-3 self-center rounded-full bg-texto/70 px-4 py-2 text-base font-semibold text-superficie">
                    Alinea el acta dentro del marco
                  </Text>
                </View>
              ) : (
                <Text className="text-base text-texto-suave">
                  Se requiere permiso de cámara. No se permite escoger fotos de la galería.
                </Text>
              )
            ) : (
              <Image
                accessibilityLabel="Vista previa de la fotografía del acta"
                className="h-72 w-full rounded-tarjeta"
                resizeMode="contain"
                source={{ uri: fotoUri }}
              />
            )}

            {errorFoto && !fotoUri ? (
              <EstadoOperacion estado="error" mensaje={errorFoto} />
            ) : null}
            {permisoCamara && !permisoCamara.granted && !fotoUri ? (
              <ClayButton
                title="Permitir cámara"
                onPress={() => void solicitarPermisoCamara()}
              />
            ) : null}
            {!fotoUri ? (
              <ClayButton
                title="Tomar foto del acta"
                disabled={
                  !ubicacion ||
                  consultaUbicacion.isFetching ||
                  !permisoCamara?.granted
                }
                loading={analizandoFoto}
                loadingLabel="Tomando la foto…"
                onPress={() => void tomarFoto()}
              />
            ) : (
              <View className="gap-3">
                {analizandoFoto ? (
                  <EstadoOperacion
                    estado="procesando"
                    mensaje="Revisando la nitidez de la foto…"
                  />
                ) : null}
                {errorFoto ? (
                  <EstadoOperacion estado="error" mensaje={errorFoto} />
                ) : null}
                {errorHash ? (
                  <EstadoOperacion estado="error" mensaje={errorHash} />
                ) : null}
                {varianza !== null ? (
                  esFotoNitida(varianza) ? (
                    <EstadoOperacion
                      estado="exito"
                      mensaje={`Foto nítida. Puntaje de nitidez: ${varianza.toFixed(1)}.`}
                    />
                  ) : (
                    <EstadoOperacion
                      estado="error"
                      mensaje={`Foto borrosa (puntaje ${varianza.toFixed(1)}). Tómala nuevamente.`}
                    />
                  )
                ) : null}
                {fotoHash ? (
                  <Text className="text-sm text-texto-suave">
                    Huella SHA-256 calculada y guardada localmente.
                  </Text>
                ) : null}
                {varianza !== null && esFotoNitida(varianza) && fotoHash ? (
                  <ClayButton
                    title={
                      fotoConfirmada
                        ? "Foto confirmada"
                        : "Confirmar foto nítida"
                    }
                    disabled={fotoConfirmada}
                    onPress={() => setFotoConfirmada(true)}
                  />
                ) : null}
                <ClayButton title="Repetir fotografía" onPress={repetirFoto} />
              </View>
            )}
          </ClayCard>
          <View className="gap-3">
            <ClayButton
              title="Continuar a la revisión"
              disabled={!puedeAvanzarARevision}
              onPress={() => setPasoActual(2)}
            />
            <Pressable
              accessibilityRole="button"
              className="min-h-[56px] items-center justify-center"
              onPress={() => setPasoActual(0)}
            >
              <Text className="text-base font-semibold text-primario">
                Volver a los resultados
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {pasoActual === 0 ? (
        <ClayCard className="gap-4">
          <Text className="text-xl font-bold text-texto">
            Votos según el acta física
          </Text>
          {cargandoCatalogo ? (
            <Text className="text-base text-texto-suave">
              Cargando organizaciones y candidatos…
            </Text>
          ) : null}
          {errorCatalogo ? (
            <EstadoOperacion estado="error" mensaje={errorCatalogo} />
          ) : null}
          {!cargandoCatalogo && !errorCatalogo && organizaciones.length === 0 ? (
            <EstadoOperacion
              estado="error"
              mensaje="No hay candidatos cargados para esta dignidad. Conéctate para descargar el catálogo antes de registrar el acta."
            />
          ) : null}
          {organizaciones.map((organizacion, indice) => (
            <Controller
              key={organizacion.id}
              control={formulario.control}
              name={`votos.${indice}.votos`}
              render={({ field, fieldState }) => (
                <ClayInput
                  label={`${organizacion.candidato} (${organizacion.sigla})`}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  keyboardType="number-pad"
                  error={fieldState.error?.message}
                />
              )}
            />
          ))}
          <Controller
            control={formulario.control}
            name="votos_nulos"
            render={({ field, fieldState }) => (
              <ClayInput
                label="Votos nulos"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={formulario.control}
            name="votos_blancos"
            render={({ field, fieldState }) => (
              <ClayInput
                label="Votos blancos"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={formulario.control}
            name="total_sufragantes"
            render={({ field, fieldState }) => (
              <ClayInput
                label="Total de sufragantes"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
          <Text className="text-base text-texto-suave">
            La suma de los votos de las cinco organizaciones, los nulos y los blancos debe ser igual al total de sufragantes.
          </Text>
          {formulario.formState.errors.votos?.root?.message ? (
            <Text accessibilityRole="alert" className="text-base text-error">
              {formulario.formState.errors.votos.root.message}
            </Text>
          ) : null}
          <ClayButton
            title="Continuar a la fotografía"
            disabled={!puedeAvanzarAFotografia}
            onPress={() => setPasoActual(1)}
          />
        </ClayCard>
      ) : null}

      {pasoActual === 2 ? (
        <>
          <ClayCard className="gap-4">
            <Text className="text-xl font-bold text-texto">
              Revisa los resultados
            </Text>
            <Text className="text-base leading-6 text-texto-suave">
              Comprueba los valores antes de guardar el acta.
            </Text>
            {organizaciones.map((organizacion, indice) => (
              <View
                key={organizacion.id}
                className="flex-row items-start justify-between gap-3 border-b border-primario/10 py-2"
              >
                <Text className="flex-1 text-base text-texto">
                  {organizacion.candidato} · {organizacion.sigla}
                </Text>
                <Text className="text-base font-bold text-texto">
                  {votosActuales[indice]?.votos || "—"}
                </Text>
              </View>
            ))}
            <View className="gap-2 border-t border-primario/10 pt-3">
              <Text className="text-base text-texto">
                Votos nulos: {valoresFormulario.votos_nulos || "—"}
              </Text>
              <Text className="text-base text-texto">
                Votos blancos: {valoresFormulario.votos_blancos || "—"}
              </Text>
              <Text className="text-lg font-bold text-texto">
                Total de sufragantes:{" "}
                {valoresFormulario.total_sufragantes || "—"}
              </Text>
            </View>
          </ClayCard>
          <ClayCard className="gap-4">
            <Text className="text-xl font-bold text-texto">
              Evidencia del acta
            </Text>
            {fotoUri ? (
              <Image
                accessibilityLabel="Vista previa de la fotografía confirmada"
                className="h-72 w-full rounded-tarjeta"
                resizeMode="contain"
                source={{ uri: fotoUri }}
              />
            ) : null}
            <ClayChip
              label={
                fotoConfirmada
                  ? "Fotografía nítida y confirmada"
                  : "Fotografía pendiente de confirmar"
              }
              icono={
                fotoConfirmada
                  ? "checkmark-circle-outline"
                  : "camera-outline"
              }
              tono={fotoConfirmada ? "exito" : "alerta"}
            />
            {ubicacion ? (
              <>
                <Text className="text-base text-texto">
                  Distancia al recinto: {ubicacion.distancia_metros.toFixed(2)} m
                </Text>
                <Text className="text-base text-texto-suave">
                  Precisión GPS: {ubicacion.precision_m.toFixed(1)} m
                </Text>
                <ClayChip
                  label={
                    distanciaFuera
                      ? "Fuera de 200 m: se enviará para revisión"
                      : "Dentro del margen del recinto"
                  }
                  icono={
                    distanciaFuera
                      ? "warning-outline"
                      : "checkmark-circle-outline"
                  }
                  tono={distanciaFuera ? "alerta" : "exito"}
                />
              </>
            ) : (
              <Text className="text-base text-error">
                No hay una ubicación GPS válida para guardar el acta.
              </Text>
            )}
          </ClayCard>
          <ClayButton
            title="Guardar acta"
            loading={formulario.formState.isSubmitting}
            loadingLabel="Guardando acta…"
            disabled={
              !formulario.formState.isValid ||
              formulario.formState.isSubmitting ||
              cargandoCatalogo ||
              organizaciones.length !== 5 ||
              !fotoConfirmada ||
              !ubicacion ||
              !fotoHash ||
              actaGuardada ||
              mensajeGuardado?.estado === "exito"
            }
            onPress={() => void formulario.handleSubmit(guardarActa)()}
          />
          <Pressable
            accessibilityRole="button"
            className="min-h-[56px] items-center justify-center"
            onPress={() => setPasoActual(1)}
          >
            <Text className="text-base font-semibold text-primario">
              Volver a la fotografía
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="min-h-[56px] items-center justify-center"
            onPress={() => setPasoActual(0)}
          >
            <Text className="text-base font-semibold text-primario">
              Volver a los resultados
            </Text>
          </Pressable>
        </>
      ) : null}

      {formulario.formState.isSubmitting && !mensajeGuardado ? (
        <EstadoOperacion
          estado="procesando"
          mensaje="Guardando el acta en este teléfono…"
          presentacion="flotante"
          visible
        />
      ) : null}
      {mensajeGuardado ? (
        <EstadoOperacion
          estado={mensajeGuardado.estado}
          mensaje={mensajeGuardado.texto}
          onDismiss={() => setMensajeGuardado(null)}
          presentacion="flotante"
          visible
        />
      ) : null}

      {fotoUri ? (
        <AnalizadorNitidez
          uri={fotoUri}
          ancho={fotoAncho}
          alto={fotoAlto}
          onResultado={recibirNitidez}
        />
      ) : null}
    </ScrollView>
  );
}
