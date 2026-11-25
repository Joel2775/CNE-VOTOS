import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";

import { actasRevision } from "@/core/di/revisionActas";
import { useEstadoConectividad } from "@/core/red/useEstadoConectividad";
import { useSesionStore } from "@/core/store/sesionStore";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import type {
  ActaRevision,
  DecisionRevisionActa,
  EstadoRevisionActa,
} from "@/features/actas/domain/entidades/revisionActa";
import { FormularioCorreccionActa } from "@/features/actas/presentation/componentes/FormularioCorreccionActa";
import {
  useBandejaRevisionActas,
  useDecidirRevisionActa,
  useDetalleRevisionActa,
} from "@/features/actas/presentation/hooks/useBandejaRevisionActas";
import { useCerrarSesion } from "@/features/cuentas/presentation/hooks/useCerrarSesion";
import { useContadorActasPendientes } from "@/features/sincronizacion/presentation/hooks/useContadorActasPendientes";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";
import { CabeceraSesion } from "@/ui/componentes/CabeceraSesion";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { ClayChip } from "@/ui/componentes/ClayChip";
import { ClayHeader } from "@/ui/componentes/ClayHeader";
import { ClayInput } from "@/ui/componentes/ClayInput";

type EstadoFiltro = EstadoRevisionActa | "todas";
type DignidadFiltro = DignidadActa | "todas";

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo completar la revisión.";
}

function etiquetaEstado(estado: EstadoRevisionActa): string {
  switch (estado) {
    case "pendiente_revision":
      return "Pendiente de revisión";
    case "validada":
      return "Validada";
    case "observada":
      return "Observada";
    case "rechazada":
      return "Rechazada";
  }
}

function tonoEstado(
  estado: EstadoRevisionActa,
): "alerta" | "exito" | "error" {
  if (estado === "validada") {
    return "exito";
  }
  if (estado === "rechazada") {
    return "error";
  }
  return "alerta";
}

function etiquetaDignidad(dignidad: DignidadActa): string {
  return dignidad === "alcaldia" ? "Alcaldía" : "Prefectura";
}

function botonFiltro<T extends string>(
  valor: T,
  seleccionado: T,
  etiqueta: string,
  onPress: (valor: T) => void,
) {
  return (
    <Pressable
      key={valor}
      accessibilityRole="tab"
      accessibilityState={{ selected: valor === seleccionado }}
      className={`min-h-[52px] items-center justify-center rounded-full px-4 ${
        valor === seleccionado ? "bg-primario" : "bg-superficie"
      }`}
      onPress={() => onPress(valor)}
    >
      <Text
        className={`text-base font-semibold ${
          valor === seleccionado ? "text-superficie" : "text-texto"
        }`}
      >
        {etiqueta}
      </Text>
    </Pressable>
  );
}

function TarjetaActa({
  acta,
  onPress,
}: {
  acta: ActaRevision;
  onPress: (actaId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir acta de ${etiquetaDignidad(acta.dignidad)}, mesa ${acta.mesa_numero}`}
      className="active:scale-[0.99]"
      onPress={() => onPress(acta.acta_id)}
    >
      <ClayCard className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-lg font-bold text-texto">
              {etiquetaDignidad(acta.dignidad)} · Mesa{" "}
              {String(acta.mesa_numero).padStart(3, "0")}
            </Text>
            <Text className="text-base text-texto-suave">
              {acta.recinto} · {acta.parroquia}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} className="text-primario" />
        </View>
        <ClayChip
          label={etiquetaEstado(acta.estado_revision)}
          icono={
            acta.estado_revision === "validada"
              ? "checkmark-circle-outline"
              : acta.estado_revision === "rechazada"
                ? "close-circle-outline"
                : "time-outline"
          }
          tono={tonoEstado(acta.estado_revision)}
        />
        {acta.fuera_margen ? (
          <ClayChip
            label={`Alerta GPS · ${Math.round(acta.distancia_recinto_m)} m del recinto`}
            icono="location-outline"
            tono="alerta"
          />
        ) : null}
        <Text className="text-base text-texto-suave">
          Recibida: {new Date(acta.recibida_en).toLocaleString("es-EC")}
        </Text>
      </ClayCard>
    </Pressable>
  );
}

export default function BandejaRevisionActasPantalla() {
  const usuario = useSesionStore((estado) => estado.usuario);
  const perfil = useSesionStore((estado) => estado.perfil);
  const conexion = useEstadoConectividad();
  const contador = useContadorActasPendientes();
  const cierreSesion = useCerrarSesion();
  const [estado, setEstado] = useState<EstadoFiltro>("todas");
  const [dignidad, setDignidad] = useState<DignidadFiltro>("todas");
  const [actaSeleccionada, setActaSeleccionada] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionRevisionActa>("validada");
  const [motivo, setMotivo] = useState("");
  const [mostrarCorreccion, setMostrarCorreccion] = useState(false);
  const [mensajeCorreccion, setMensajeCorreccion] = useState<{
    estado: "exito" | "error";
    texto: string;
  } | null>(null);
  const [mostrarFotoAmpliada, setMostrarFotoAmpliada] = useState(false);
  const [ampliarFoto, setAmpliarFoto] = useState(false);
  const [mensajeAccion, setMensajeAccion] = useState<{
    estado: "exito" | "error";
    texto: string;
  } | null>(null);
  const { width, height } = useWindowDimensions();
  const coordinadorId =
    perfil?.rol === "coordinador_recinto" ? perfil.id : null;
  const bandeja = useBandejaRevisionActas(coordinadorId, estado, dignidad);
  const detalle = useDetalleRevisionActa(actaSeleccionada);
  const rutaFoto = detalle.data?.acta.ruta_foto ?? null;
  const consultaFoto = useQuery({
    queryKey: ["acta-revision-foto", rutaFoto],
    queryFn: () => {
      if (!rutaFoto) {
        throw new Error("No hay una fotografía disponible para este acta.");
      }
      return actasRevision.obtenerUrlFotoFirmada(rutaFoto);
    },
    enabled: Boolean(rutaFoto && conexion.enLinea),
    staleTime: 4 * 60 * 1000,
    retry: 1,
  });
  const mutacionRevision = useDecidirRevisionActa(
    coordinadorId,
    estado,
    dignidad,
  );

  async function guardarDecision(): Promise<void> {
    if (!actaSeleccionada || !detalle.data) {
      return;
    }
    if (
      (decision === "observada" || decision === "rechazada") &&
      !motivo.trim()
    ) {
      setMensajeAccion({
        estado: "error",
        texto: "Escribe un motivo antes de observar o rechazar el acta.",
      });
      return;
    }

    setMensajeAccion(null);
    try {
      await mutacionRevision.mutateAsync({
        actaId: actaSeleccionada,
        decision,
        motivo: decision === "validada" ? null : motivo,
      });
      setMensajeAccion({
        estado: "exito",
        texto:
          decision === "validada"
            ? "Acta validada correctamente."
            : decision === "observada"
              ? "Acta observada. El motivo quedó registrado."
              : "Acta rechazada. El veedor ya puede recapturarla.",
      });
      setMotivo("");
    } catch (error) {
      setMensajeAccion({ estado: "error", texto: mensajeDeError(error) });
    }
  }

  if (actaSeleccionada) {
    const acta = detalle.data?.acta;
    return (
      <>
        <ScrollView
          className="flex-1 bg-fondo"
          contentContainerClassName="gap-5 p-5"
        >
          <ClayButton
            title="Volver a la bandeja"
            onPress={() => {
              setActaSeleccionada(null);
              setMensajeAccion(null);
              setMostrarCorreccion(false);
              setMensajeCorreccion(null);
            }}
          />
          {detalle.isLoading ? (
            <EstadoOperacion
              estado="procesando"
              mensaje="Cargando el detalle del acta…"
            />
          ) : null}
          {detalle.isError ? (
            <EstadoOperacion
              estado="error"
              mensaje={mensajeDeError(detalle.error)}
            />
          ) : null}
          {acta ? (
            <>
              <ClayHeader
                titulo={`Acta de ${etiquetaDignidad(acta.dignidad)}`}
                descripcion={`${acta.recinto} · Mesa ${String(acta.mesa_numero).padStart(3, "0")}`}
              />
              <ClayCard className="gap-3">
                <ClayChip
                  label={etiquetaEstado(acta.estado_revision)}
                  icono={
                    acta.estado_revision === "validada"
                      ? "checkmark-circle-outline"
                      : acta.estado_revision === "rechazada"
                        ? "close-circle-outline"
                        : "time-outline"
                  }
                  tono={tonoEstado(acta.estado_revision)}
                />
                <Text className="text-base text-texto">
                  Capturada:{" "}
                  {new Date(acta.capturada_en).toLocaleString("es-EC")}
                </Text>
                <Text className="text-base text-texto">
                  Recibida: {new Date(acta.recibida_en).toLocaleString("es-EC")}
                </Text>
                <Text className="text-base text-texto">
                  Veedor: {acta.veedor_nombres ?? ""}{" "}
                  {acta.veedor_apellidos ?? ""}
                </Text>
                <Text className="text-base text-texto">
                  Distancia al recinto: {acta.distancia_recinto_m.toFixed(1)} m
                </Text>
                {acta.fuera_margen ? (
                  <ClayChip
                    label="Capturada fuera del margen GPS de 200 m"
                    icono="location-outline"
                    tono="alerta"
                  />
                ) : null}
                {acta.motivo_revision ? (
                  <Text className="text-base text-error">
                    Motivo registrado: {acta.motivo_revision}
                  </Text>
                ) : null}
              </ClayCard>

              <ClayCard className="gap-3">
                <Text className="text-xl font-bold text-texto">
                  Fotografía oficial
                </Text>
                {consultaFoto.data ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Ampliar fotografía del acta"
                      onPress={() => setMostrarFotoAmpliada(true)}
                    >
                      <Image
                        source={{ uri: consultaFoto.data }}
                        contentFit="contain"
                        cachePolicy="none"
                        style={{ width: "100%", height: 300 }}
                        accessibilityLabel="Fotografía oficial privada del acta"
                      />
                    </Pressable>
                    <ClayButton
                      title="Ampliar e inspeccionar fotografía"
                      onPress={() => setMostrarFotoAmpliada(true)}
                    />
                  </>
                ) : consultaFoto.isLoading ? (
                  <EstadoOperacion
                    estado="procesando"
                    mensaje="Generando acceso temporal a la foto privada…"
                  />
                ) : consultaFoto.isError ? (
                  <EstadoOperacion
                    estado="error"
                    mensaje={mensajeDeError(consultaFoto.error)}
                  />
                ) : (
                  <Text className="text-base text-alerta">
                    Conéctate para generar una URL firmada temporal y ver la foto
                    privada.
                  </Text>
                )}
              </ClayCard>

              <ClayCard className="gap-3">
                <Text className="text-xl font-bold text-texto">
                  Votos digitados frente al acta física
                </Text>
                {detalle.data?.votos.map((voto) => (
                  <View
                    key={voto.organizacion_id}
                    className="flex-row items-center justify-between gap-3 border-b border-primario/10 py-3"
                  >
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-semibold text-texto">
                        {voto.candidato}
                      </Text>
                      <Text className="text-base text-texto-suave">
                        {voto.organizacion_sigla} · {voto.organizacion}
                      </Text>
                    </View>
                    <Text className="text-xl font-bold text-texto">
                      {voto.votos.toLocaleString("es-EC")}
                    </Text>
                  </View>
                ))}
                <Text className="text-base text-texto">
                  Blancos: {acta.votos_blancos.toLocaleString("es-EC")} · Nulos:{" "}
                  {acta.votos_nulos.toLocaleString("es-EC")}
                </Text>
                <Text className="text-lg font-bold text-texto">
                  Total de sufragantes:{" "}
                  {acta.total_sufragantes.toLocaleString("es-EC")}
                </Text>
                {perfil?.rol === "coordinador_recinto" ? (
                  <ClayButton
                    title={
                      mostrarCorreccion
                        ? "Cerrar corrección"
                        : "Corregir votos (Auditoría)"
                    }
                    onPress={() => {
                      if (mostrarCorreccion) {
                        setMostrarCorreccion(false);
                        setMensajeCorreccion(null);
                      } else {
                        setMensajeCorreccion(null);
                        setMostrarCorreccion(true);
                      }
                    }}
                  />
                ) : null}
              </ClayCard>
              {mostrarCorreccion && detalle.data ? (
                <FormularioCorreccionActa
                  key={acta.acta_id}
                  actaId={acta.acta_id}
                  detalle={detalle.data}
                  enLinea={conexion.enLinea === true}
                  onCancelar={() => {
                    setMostrarCorreccion(false);
                    setMensajeCorreccion(null);
                  }}
                  onGuardado={() => {
                    setMostrarCorreccion(false);
                    setMensajeCorreccion({
                      estado: "exito",
                      texto: "Corrección guardada en el historial de auditoría.",
                    });
                  }}
                />
              ) : null}
              {!mostrarCorreccion && mensajeCorreccion ? (
                <EstadoOperacion
                  estado={mensajeCorreccion.estado}
                  mensaje={mensajeCorreccion.texto}
                />
              ) : null}

              <ClayCard className="gap-3">
                <Text className="text-xl font-bold text-texto">
                  Historial de revisión
                </Text>
                {detalle.data?.historial.map((registro) => (
                  <View key={registro.id} className="gap-1 border-b border-primario/10 py-3">
                    <Text className="text-base font-semibold text-texto">
                      {etiquetaEstado(registro.estado_revision)} ·{" "}
                      {new Date(registro.registrada_en).toLocaleString("es-EC")}
                    </Text>
                    <Text className="text-base text-texto-suave">
                      {registro.actor_nombres ?? ""}{" "}
                      {registro.actor_apellidos ?? ""} · Cédula{" "}
                      {registro.actor_cedula}
                    </Text>
                    {registro.motivo ? (
                      <Text className="text-base text-texto">
                        Motivo: {registro.motivo}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ClayCard>

              {acta.estado_revision === "pendiente_revision" ? (
                <ClayCard className="gap-4">
                  <Text className="text-xl font-bold text-texto">
                    Decisión de revisión
                  </Text>
                  <View className="gap-2">
                    {(
                      [
                        ["validada", "Validar acta"],
                        ["observada", "Observar acta"],
                        ["rechazada", "Rechazar acta"],
                      ] as const
                    ).map(([valor, etiqueta]) => (
                      <Pressable
                        key={valor}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: decision === valor }}
                        className={`min-h-[56px] justify-center rounded-campo px-4 ${
                          decision === valor ? "bg-primario" : "bg-superficie"
                        }`}
                        onPress={() => setDecision(valor)}
                      >
                        <Text
                          className={`text-base font-semibold ${
                            decision === valor
                              ? "text-superficie"
                              : "text-texto"
                          }`}
                        >
                          {etiqueta}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {decision !== "validada" ? (
                    <ClayInput
                      label="Motivo obligatorio"
                      placeholder="Explica qué debe corregirse"
                      value={motivo}
                      onChangeText={setMotivo}
                      multiline
                      textAlignVertical="top"
                      className="min-h-[120px] items-start py-2"
                    />
                  ) : null}
                  {mensajeAccion ? (
                    <EstadoOperacion
                      estado={mensajeAccion.estado}
                      mensaje={mensajeAccion.texto}
                    />
                  ) : null}
                  <ClayButton
                    title={
                      decision === "validada"
                        ? "Confirmar validación"
                        : decision === "observada"
                          ? "Guardar observación"
                          : "Rechazar y habilitar recaptura"
                    }
                    loading={mutacionRevision.isPending}
                    loadingLabel="Guardando decisión…"
                    disabled={
                      !conexion.enLinea ||
                      mutacionRevision.isPending ||
                      (decision !== "validada" && !motivo.trim())
                    }
                    onPress={() => void guardarDecision()}
                  />
                  {!conexion.enLinea ? (
                    <Text className="text-base text-alerta">
                      Se necesita conexión para registrar una decisión.
                    </Text>
                  ) : null}
                </ClayCard>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <Modal
          visible={mostrarFotoAmpliada}
          animationType="fade"
          onRequestClose={() => {
            setMostrarFotoAmpliada(false);
            setAmpliarFoto(false);
          }}
        >
          <View className="flex-1 bg-texto px-4 pb-6 pt-12">
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-lg font-bold text-superficie">
                Inspección de fotografía
              </Text>
              <Pressable
                accessibilityRole="button"
                className="min-h-[52px] justify-center rounded-full bg-superficie px-4"
                onPress={() => setAmpliarFoto((actual) => !actual)}
              >
                <Text className="text-base font-semibold text-primario">
                  {ampliarFoto ? "Ajustar" : "Ampliar 2×"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar fotografía ampliada"
                className="h-[52px] w-[52px] items-center justify-center rounded-full bg-superficie"
                onPress={() => {
                  setMostrarFotoAmpliada(false);
                  setAmpliarFoto(false);
                }}
              >
                <Ionicons name="close" size={28} className="text-primario" />
              </Pressable>
            </View>
            {consultaFoto.data ? (
              <ScrollView
                horizontal
                contentContainerStyle={{
                  minWidth: width,
                  minHeight: height - 130,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ScrollView
                  contentContainerStyle={{
                    width: ampliarFoto ? width * 1.8 : width - 32,
                    height: ampliarFoto ? height * 1.5 : height - 150,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source={{ uri: consultaFoto.data }}
                    contentFit="contain"
                    cachePolicy="none"
                    style={{
                      width: ampliarFoto ? width * 1.8 : width - 32,
                      height: ampliarFoto ? height * 1.5 : height - 150,
                    }}
                    accessibilityLabel="Fotografía del acta en modo de inspección"
                  />
                </ScrollView>
              </ScrollView>
            ) : (
              <Text className="text-base text-superficie">
                La fotografía ya no está disponible. Genera otra URL firmada.
              </Text>
            )}
          </View>
        </Modal>
      </>
    );
  }

  const filtrosEstado: { valor: EstadoFiltro; etiqueta: string }[] = [
    { valor: "todas", etiqueta: "Todas" },
    { valor: "pendiente_revision", etiqueta: "Pendientes" },
    { valor: "validada", etiqueta: "Validadas" },
    { valor: "observada", etiqueta: "Observadas" },
    { valor: "rechazada", etiqueta: "Rechazadas" },
  ];
  const filtrosDignidad: { valor: DignidadFiltro; etiqueta: string }[] = [
    { valor: "todas", etiqueta: "Todas" },
    { valor: "alcaldia", etiqueta: "Alcaldía" },
    { valor: "prefectura", etiqueta: "Prefectura" },
  ];

  return (
    <FlatList
      className="flex-1 bg-fondo"
      contentContainerClassName="gap-4 p-5"
      data={bandeja.data ?? []}
      keyExtractor={(acta) => acta.acta_id}
      renderItem={({ item }) => (
        <TarjetaActa
          acta={item}
          onPress={(actaId) => {
            setMensajeAccion(null);
            setMostrarCorreccion(false);
            setMensajeCorreccion(null);
            setActaSeleccionada(actaId);
          }}
        />
      )}
      ListHeaderComponent={
        <View className="gap-5">
          <CabeceraSesion
            usuario={usuario}
            perfil={perfil}
            enLinea={conexion.enLinea}
            actasPendientes={contador.data ?? null}
            cerrandoSesion={cierreSesion.cerrando}
            errorCerrarSesion={cierreSesion.error}
            errorContador={contador.error?.message ?? null}
            onCerrarSesion={() => void cierreSesion.cerrar()}
          />
          <ClayHeader
            titulo="Revisión de actas"
            descripcion="Actas recibidas en tu recinto"
          />
          <View className="gap-2">
            <Text className="text-lg font-semibold text-texto">Estado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {filtrosEstado.map((filtro) =>
                  botonFiltro(
                    filtro.valor,
                    estado,
                    filtro.etiqueta,
                    setEstado,
                  ),
                )}
              </View>
            </ScrollView>
          </View>
          <View className="gap-2">
            <Text className="text-lg font-semibold text-texto">Dignidad</Text>
            <View className="flex-row gap-2">
              {filtrosDignidad.map((filtro) =>
                botonFiltro(
                  filtro.valor,
                  dignidad,
                  filtro.etiqueta,
                  setDignidad,
                ),
              )}
            </View>
          </View>
          {conexion.enLinea === false ? (
            <ClayChip
              label="Sin conexión: mostrando la última bandeja guardada"
              icono="cloud-offline-outline"
              tono="alerta"
            />
          ) : null}
          {bandeja.isError ? (
            <EstadoOperacion
              estado="error"
              mensaje={mensajeDeError(bandeja.error)}
            />
          ) : null}
          {bandeja.isLoading ? (
            <EstadoOperacion
              estado="procesando"
              mensaje="Cargando las actas recibidas…"
            />
          ) : null}
          <Text className="text-base font-semibold text-texto">
            {bandeja.data?.length ?? 0} actas
          </Text>
        </View>
      }
      ListEmptyComponent={
        !bandeja.isLoading && !bandeja.isError ? (
          <ClayCard>
            <Text className="text-base leading-6 text-texto-suave">
              No hay actas recibidas con estos filtros.
            </Text>
          </ClayCard>
        ) : null
      }
    />
  );
}
