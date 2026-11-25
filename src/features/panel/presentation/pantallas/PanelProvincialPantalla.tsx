import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { actasRevision } from "@/core/di/revisionActas";
import { useEstadoConectividad } from "@/core/red/useEstadoConectividad";
import { useSesionStore } from "@/core/store/sesionStore";
import {
  useDetalleRevisionActa,
} from "@/features/actas/presentation/hooks/useBandejaRevisionActas";
import { useCerrarSesion } from "@/features/cuentas/presentation/hooks/useCerrarSesion";
import { useContadorActasPendientes } from "@/features/sincronizacion/presentation/hooks/useContadorActasPendientes";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import type { ActaRevision } from "@/features/actas/domain/entidades/revisionActa";
import { FormularioCorreccionActa } from "@/features/actas/presentation/componentes/FormularioCorreccionActa";
import type {
  AlertaActa,
  ModoResultados,
} from "@/features/panel/domain/entidades/panelProvincial";
import { usePanelProvincial } from "@/features/panel/presentation/hooks/usePanelProvincial";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";
import { BarraResultado } from "@/ui/componentes/BarraResultado";
import { CabeceraSesion } from "@/ui/componentes/CabeceraSesion";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { ClayChip } from "@/ui/componentes/ClayChip";
import { ClayHeader } from "@/ui/componentes/ClayHeader";
import { ClayInput } from "@/ui/componentes/ClayInput";

type SeccionPanel = "avance" | "resultados";

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la acción.";
}

function porcentaje(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

function etiquetaDignidad(dignidad: DignidadActa): string {
  return dignidad === "alcaldia" ? "Alcaldía" : "Prefectura";
}

function DetalleActaProvincial({
  actaId,
  onVolver,
}: {
  actaId: string;
  onVolver: () => void;
}) {
  const conexion = useEstadoConectividad();
  const detalle = useDetalleRevisionActa(actaId);
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
  const [editar, setEditar] = useState(false);
  const [mensaje, setMensaje] = useState<{
    estado: "exito" | "error";
    texto: string;
  } | null>(null);

  const acta = detalle.data?.acta;
  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerClassName="gap-5 p-5"
    >
      <ClayButton title="Volver al panel" onPress={onVolver} />
      {detalle.isLoading ? (
        <EstadoOperacion estado="procesando" mensaje="Cargando el detalle del acta…" />
      ) : null}
      {detalle.isError ? (
        <EstadoOperacion estado="error" mensaje={mensajeDeError(detalle.error)} />
      ) : null}
      {acta ? (
        <>
          <ClayHeader
            titulo={`Acta de ${etiquetaDignidad(acta.dignidad)}`}
            descripcion={`${acta.recinto} · Mesa ${String(acta.mesa_numero).padStart(3, "0")}`}
          />
          <ClayCard className="gap-3">
            <ClayChip
              label={`Revisión: ${acta.estado_revision.replace(/_/g, " ")}`}
              icono="document-text-outline"
              tono={acta.estado_revision === "rechazada" ? "error" : "alerta"}
            />
            <Text className="text-base text-texto">
              Capturada: {new Date(acta.capturada_en).toLocaleString("es-EC")}
            </Text>
            <Text className="text-base text-texto">
              Recibida: {new Date(acta.recibida_en).toLocaleString("es-EC")}
            </Text>
            <Text className="text-base text-texto">
              Veedor: {acta.veedor_nombres ?? ""} {acta.veedor_apellidos ?? ""}
            </Text>
            <Text className="text-base text-texto">
              Distancia al recinto: {acta.distancia_recinto_m.toFixed(1)} m
            </Text>
            {acta.motivo_revision ? (
              <Text className="text-base text-error">
                Observación: {acta.motivo_revision}
              </Text>
            ) : null}
          </ClayCard>

          <ClayCard className="gap-3">
            <Text className="text-xl font-bold text-texto">
              Fotografía firmada del acta
            </Text>
            {consultaFoto.data ? (
              <Image
                source={{ uri: consultaFoto.data }}
                contentFit="contain"
                cachePolicy="none"
                style={{ width: "100%", height: 300 }}
                accessibilityLabel="Fotografía firmada del acta"
              />
            ) : consultaFoto.isLoading ? (
              <EstadoOperacion
                estado="procesando"
                mensaje="Generando enlace temporal para la fotografía…"
              />
            ) : consultaFoto.isError ? (
              <EstadoOperacion
                estado="error"
                mensaje={mensajeDeError(consultaFoto.error)}
              />
            ) : (
              <Text className="text-base text-alerta">
                Conéctate para cargar la fotografía firmada.
              </Text>
            )}
          </ClayCard>

          <ClayCard className="gap-2">
            <Text className="text-xl font-bold text-texto">
              Ubicación de captura
            </Text>
            <Text className="text-base text-texto">
              Latitud: {acta.evidencia_latitud?.toFixed(6) ?? "No disponible"}
            </Text>
            <Text className="text-base text-texto">
              Longitud: {acta.evidencia_longitud?.toFixed(6) ?? "No disponible"}
            </Text>
            <Text className="text-base text-texto">
              Precisión:{" "}
              {acta.evidencia_precision_m === null
                ? "No disponible"
                : `${acta.evidencia_precision_m.toFixed(1)} m`}
            </Text>
            <Text className="text-base text-texto">
              Captura de evidencia:{" "}
              {acta.evidencia_capturada_en
                ? new Date(acta.evidencia_capturada_en).toLocaleString("es-EC")
                : "No disponible"}
            </Text>
          </ClayCard>

          <ClayCard className="gap-3">
            <Text className="text-xl font-bold text-texto">Votos registrados</Text>
            {detalle.data?.votos.map((voto) => (
              <View
                key={voto.organizacion_id}
                className="gap-2 border-b border-primario/10 py-3"
              >
                <Text className="text-base text-texto">
                  {voto.candidato} · {voto.organizacion_sigla}:{" "}
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
          </ClayCard>
          <ClayCard className="gap-3">
            <Text className="text-xl font-bold text-texto">
              Historial de revisión
            </Text>
            {detalle.data?.historial.map((registro) => (
              <View
                key={registro.id}
                className="gap-1 border-b border-primario/10 py-3"
              >
                <Text className="text-base font-semibold text-texto">
                  {registro.estado_revision.replace(/_/g, " ")} ·{" "}
                  {new Date(registro.registrada_en).toLocaleString("es-EC")}
                </Text>
                <Text className="text-base text-texto-suave">
                  {registro.actor_nombres ?? ""} {registro.actor_apellidos ?? ""} ·
                  Cédula {registro.actor_cedula}
                </Text>
                {registro.motivo ? (
                  <Text className="text-base text-texto">
                    Motivo: {registro.motivo}
                  </Text>
                ) : null}
              </View>
            ))}
            {detalle.data?.historial.length === 0 ? (
              <Text className="text-base text-texto-suave">
                No hay decisiones de revisión registradas.
              </Text>
            ) : null}
          </ClayCard>
          {mensaje ? (
            <EstadoOperacion estado={mensaje.estado} mensaje={mensaje.texto} />
          ) : null}
          {editar && detalle.data ? (
            <FormularioCorreccionActa
              key={actaId}
              actaId={actaId}
              detalle={detalle.data}
              enLinea={conexion.enLinea === true}
              onCancelar={() => {
                setEditar(false);
                setMensaje(null);
              }}
              onGuardado={() => {
                setEditar(false);
                setMensaje({
                  estado: "exito",
                  texto: "Corrección auditada correctamente.",
                });
              }}
            />
          ) : null}
          {!editar ? (
            <ClayButton
              title="Corregir votos (Auditoría)"
              onPress={() => {
                setEditar(true);
                setMensaje(null);
              }}
            />
          ) : null}
          {!conexion.enLinea ? (
            <Text className="text-base text-alerta">
              Se necesita conexión para abrir fotos y guardar correcciones.
            </Text>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

export default function PanelProvincialPantalla() {
  const usuario = useSesionStore((estado) => estado.usuario);
  const perfil = useSesionStore((estado) => estado.perfil);
  const conexion = useEstadoConectividad();
  const contador = useContadorActasPendientes();
  const cierreSesion = useCerrarSesion();
  const [seccion, setSeccion] = useState<SeccionPanel>("avance");
  const [dignidad, setDignidad] = useState<DignidadActa>("alcaldia");
  const [modo, setModo] = useState<ModoResultados>("preliminares");
  const [filtroTerritorial, setFiltroTerritorial] = useState("");
  const [recintoAbierto, setRecintoAbierto] = useState<string | null>(null);
  const [actaSeleccionada, setActaSeleccionada] = useState<string | null>(null);
  const { avance, resultados } = usePanelProvincial(
    perfil?.provincia_id ?? null,
    dignidad,
    modo,
  );

  const recintosFiltrados = useMemo(() => {
    const termino = filtroTerritorial.trim().toLocaleLowerCase("es-EC");
    const recintos = avance.data?.recintos ?? [];
    if (!termino) {
      return recintos;
    }
    return recintos.filter(
      (recinto) =>
        recinto.recinto.toLocaleLowerCase("es-EC").includes(termino) ||
        recinto.parroquia.toLocaleLowerCase("es-EC").includes(termino),
    );
  }, [avance.data?.recintos, filtroTerritorial]);

  const alertasFiltradas = useMemo(() => {
    const termino = filtroTerritorial.trim().toLocaleLowerCase("es-EC");
    const alertas = avance.data?.alertas ?? [];
    if (!termino) {
      return alertas;
    }
    return alertas.filter(
      (alerta) =>
        alerta.recinto.toLocaleLowerCase("es-EC").includes(termino) ||
        alerta.parroquia.toLocaleLowerCase("es-EC").includes(termino),
    );
  }, [avance.data?.alertas, filtroTerritorial]);

  const progresoGlobal = useMemo(() => {
    const recintos = avance.data?.recintos ?? [];
    return recintos.reduce(
      (total, recinto) => ({
        mesasEsperadas: total.mesasEsperadas + recinto.mesas_esperadas,
        mesasReportadas: total.mesasReportadas + recinto.mesas_reportadas,
        mesasValidadas: total.mesasValidadas + recinto.mesas_validadas,
        actasRecibidas: total.actasRecibidas + recinto.actas_recibidas,
        actasEsperadas: total.actasEsperadas + recinto.actas_esperadas,
      }),
      {
        mesasEsperadas: 0,
        mesasReportadas: 0,
        mesasValidadas: 0,
        actasRecibidas: 0,
        actasEsperadas: 0,
      },
    );
  }, [avance.data?.recintos]);
  const porcentajeMesasReportadas = porcentaje(
    progresoGlobal.mesasReportadas,
    progresoGlobal.mesasEsperadas,
  );
  const porcentajeMesasValidadas = porcentaje(
    progresoGlobal.mesasValidadas,
    progresoGlobal.mesasEsperadas,
  );
  const cantidadAlertas = avance.data?.alertas.length ?? 0;

  if (actaSeleccionada) {
    return (
      <DetalleActaProvincial
        actaId={actaSeleccionada}
        onVolver={() => setActaSeleccionada(null)}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerClassName="gap-5 p-5"
    >
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
        titulo="Monitoreo provincial"
        descripcion="Pichincha · resultados preliminares, no oficiales"
      />

      <View className="flex-row gap-1 rounded-full bg-superficie p-1">
        {(
          [
            ["avance", "Avance y alertas"],
            ["resultados", "Resultados"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <Pressable
            key={valor}
            accessibilityRole="tab"
            accessibilityState={{ selected: seccion === valor }}
            className={`min-h-[56px] flex-1 items-center justify-center rounded-full px-3 ${
              seccion === valor ? "bg-primario" : "bg-superficie"
            }`}
            onPress={() => setSeccion(valor)}
          >
            <Text
              className={`text-center text-base font-semibold ${
                seccion === valor ? "text-superficie" : "text-texto"
              }`}
            >
              {etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>

      {conexion.enLinea === false ? (
        <ClayChip
          label="Sin conexión: consulta la última lectura guardada"
          icono="cloud-offline-outline"
          tono="alerta"
        />
      ) : null}

      {avance.isError ? (
        <EstadoOperacion estado="error" mensaje={mensajeDeError(avance.error)} />
      ) : null}
      {resultados.isError ? (
        <EstadoOperacion
          estado="error"
          mensaje={mensajeDeError(resultados.error)}
        />
      ) : null}

      {seccion === "avance" ? (
        <View className="gap-4">
          <ClayCard className="gap-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold text-texto-suave">
                  Avance de escrutinio
                </Text>
                <Text className="text-3xl font-bold text-texto">
                  {porcentajeMesasReportadas}%
                </Text>
              </View>
              <View className="items-end gap-1 rounded-campo bg-primario/10 px-4 py-3">
                <Text className="text-sm font-semibold text-texto-suave">
                  Mesas reportadas
                </Text>
                <Text className="text-lg font-bold text-primario">
                  {progresoGlobal.mesasReportadas} /{" "}
                  {progresoGlobal.mesasEsperadas}
                </Text>
              </View>
            </View>
            <View
              accessibilityLabel="Mesas reportadas"
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: porcentajeMesasReportadas,
              }}
              className="h-3 overflow-hidden rounded-full bg-fondo"
            >
              <View
                className="h-full rounded-full bg-primario"
                style={{ width: `${porcentajeMesasReportadas}%` }}
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                <Text className="text-sm font-semibold text-texto-suave">
                  Mesas validadas
                </Text>
                <Text className="text-lg font-bold text-texto">
                  {progresoGlobal.mesasValidadas} /{" "}
                  {progresoGlobal.mesasEsperadas}
                </Text>
                <Text className="text-sm text-texto-suave">
                  {porcentajeMesasValidadas}% del total
                </Text>
              </View>
              <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                <Text className="text-sm font-semibold text-texto-suave">
                  Actas recibidas
                </Text>
                <Text className="text-lg font-bold text-texto">
                  {progresoGlobal.actasRecibidas} /{" "}
                  {progresoGlobal.actasEsperadas}
                </Text>
                <Text className="text-sm text-texto-suave">
                  de las esperadas
                </Text>
              </View>
            </View>
            <ClayChip
              label={
                cantidadAlertas > 0
                  ? `Atención: ${cantidadAlertas} actas con geovalla o rechazo`
                  : "Sin alertas de geovalla ni rechazo"
              }
              icono={
                cantidadAlertas > 0
                  ? "alert-circle-outline"
                  : "checkmark-circle-outline"
              }
              tono={cantidadAlertas > 0 ? "alerta" : "exito"}
            />
          </ClayCard>

          <ClayInput
            label="Filtrar por recinto o parroquia"
            placeholder="Escribe el nombre"
            value={filtroTerritorial}
            onChangeText={setFiltroTerritorial}
            autoCapitalize="words"
          />

          <Text className="text-xl font-bold text-texto">
            Avance por recinto
          </Text>
          {avance.isLoading ? (
            <EstadoOperacion
              estado="procesando"
              mensaje="Cargando avance de los recintos…"
            />
          ) : null}
          {recintosFiltrados.map((recinto) => (
            <View key={recinto.recinto_id} className="gap-3">
              <Pressable
                accessibilityRole="button"
                className="active:scale-[0.99]"
                accessibilityLabel={`Mostrar actas de ${recinto.recinto}`}
                accessibilityState={{
                  expanded: recintoAbierto === recinto.recinto_id,
                }}
                onPress={() =>
                  setRecintoAbierto((actual) =>
                    actual === recinto.recinto_id ? null : recinto.recinto_id,
                  )
                }
              >
                <ClayCard className="gap-2">
                  <Text className="text-lg font-bold text-texto">
                    {recinto.recinto}
                  </Text>
                  <Text className="text-base text-texto-suave">
                    Parroquia: {recinto.parroquia}
                  </Text>
                  <View className="gap-2">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-sm font-semibold text-texto-suave">
                        Mesas reportadas
                      </Text>
                      <Text className="text-base font-bold text-texto">
                        {recinto.mesas_reportadas} / {recinto.mesas_esperadas} ·{" "}
                        {porcentaje(
                          recinto.mesas_reportadas,
                          recinto.mesas_esperadas,
                        )}
                        %
                      </Text>
                    </View>
                    <View
                      accessibilityLabel={`Avance de ${recinto.recinto}`}
                      accessibilityRole="progressbar"
                      accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: porcentaje(
                          recinto.mesas_reportadas,
                          recinto.mesas_esperadas,
                        ),
                      }}
                      className="h-2 overflow-hidden rounded-full bg-fondo"
                    >
                      <View
                        className="h-full rounded-full bg-primario"
                        style={{
                          width: `${porcentaje(
                            recinto.mesas_reportadas,
                            recinto.mesas_esperadas,
                          )}%`,
                        }}
                      />
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                      <Text className="text-sm font-semibold text-texto-suave">
                        Mesas validadas
                      </Text>
                      <Text className="text-lg font-bold text-texto">
                        {recinto.mesas_validadas} / {recinto.mesas_esperadas}
                      </Text>
                    </View>
                    <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                      <Text className="text-sm font-semibold text-texto-suave">
                        Actas recibidas
                      </Text>
                      <Text className="text-lg font-bold text-texto">
                        {recinto.actas_recibidas} / {recinto.actas_esperadas}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-base text-texto-suave">
                    Alertas geovalla: {recinto.alertas_geovalla} · rechazadas:{" "}
                    {recinto.actas_rechazadas}
                  </Text>
                  <Text className="text-base font-semibold text-primario">
                    {recintoAbierto === recinto.recinto_id
                      ? "Ocultar actas"
                      : "Ver actas de este recinto"}
                  </Text>
                </ClayCard>
              </Pressable>
              {recintoAbierto === recinto.recinto_id
                ? (avance.data?.actas ?? [])
                    .filter((acta) => acta.recinto_id === recinto.recinto_id)
                    .map((acta) => (
                      <TarjetaActaProvincial
                        key={acta.acta_id}
                        acta={acta}
                        onPress={setActaSeleccionada}
                      />
                    ))
                : null}
              {recintoAbierto === recinto.recinto_id &&
              !(avance.data?.actas ?? []).some(
                (acta) => acta.recinto_id === recinto.recinto_id,
              ) ? (
                <ClayCard>
                  <Text className="text-base text-texto-suave">
                    Este recinto todavía no tiene actas recibidas.
                  </Text>
                </ClayCard>
              ) : null}
            </View>
          ))}
          {!avance.isLoading && recintosFiltrados.length === 0 ? (
            <ClayCard>
              <Text className="text-base text-texto-suave">
                No hay recintos que coincidan con ese filtro.
              </Text>
            </ClayCard>
          ) : null}

          <Text className="text-xl font-bold text-texto">
            Actas que requieren atención
          </Text>
          {alertasFiltradas.map((alerta) => (
            <TarjetaAlertaProvincial
              key={alerta.acta_id}
              alerta={alerta}
              onPress={setActaSeleccionada}
            />
          ))}
          {!avance.isLoading && alertasFiltradas.length === 0 ? (
            <ClayCard>
              <Text className="text-base text-texto-suave">
                No hay alertas para este filtro.
              </Text>
            </ClayCard>
          ) : null}
        </View>
      ) : (
        <View className="gap-4">
          <ClayCard className="gap-4">
            <Text className="text-xl font-bold text-texto">
              Resultados preliminares consolidados
            </Text>
            <Text className="text-base leading-6 text-texto-suave">
              Conteo informativo. No es oficial ni reemplaza los resultados del
              CNE.
            </Text>
            <View className="flex-row gap-1 rounded-full bg-fondo p-1">
              {(
                [
                  ["alcaldia", "Alcaldía"],
                  ["prefectura", "Prefectura"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <Pressable
                  key={valor}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: dignidad === valor }}
                  className={`min-h-[56px] flex-1 items-center justify-center rounded-full px-3 ${
                    dignidad === valor ? "bg-primario" : "bg-fondo"
                  }`}
                  onPress={() => setDignidad(valor)}
                >
                  <Text
                    className={`text-base font-semibold ${
                      dignidad === valor ? "text-superficie" : "text-texto"
                    }`}
                  >
                    {etiqueta}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row gap-1 rounded-full bg-fondo p-1">
              {(
                [
                  ["preliminares", "Todas las recibidas"],
                  ["validadas", "Solo validadas"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <Pressable
                  key={valor}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: modo === valor }}
                  className={`min-h-[56px] flex-1 items-center justify-center rounded-full px-3 ${
                    modo === valor ? "bg-primario" : "bg-fondo"
                  }`}
                  onPress={() => setModo(valor)}
                >
                  <Text
                    className={`text-center text-base font-semibold ${
                      modo === valor ? "text-superficie" : "text-texto"
                    }`}
                  >
                    {etiqueta}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ClayCard>

          {resultados.isLoading ? (
            <EstadoOperacion
              estado="procesando"
              mensaje="Consolidando los votos recibidos…"
            />
          ) : null}
          {resultados.data ? (
            <>
              <ClayCard className="gap-3">
                <Text className="text-xl font-bold text-texto">
                  Resumen de resultados
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                    <Text className="text-sm font-semibold text-texto-suave">
                      Actas consideradas
                    </Text>
                    <Text className="text-lg font-bold text-texto">
                      {resultados.data.actasRecibidas}
                    </Text>
                  </View>
                  <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                    <Text className="text-sm font-semibold text-texto-suave">
                      Actas validadas
                    </Text>
                    <Text className="text-lg font-bold text-texto">
                      {resultados.data.actasValidadas}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                    <Text className="text-sm font-semibold text-texto-suave">
                      Votos válidos
                    </Text>
                    <Text className="text-lg font-bold text-texto">
                      {resultados.data.votosValidos.toLocaleString("es-EC")}
                    </Text>
                  </View>
                  <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                    <Text className="text-sm font-semibold text-texto-suave">
                      Votos blancos
                    </Text>
                    <Text className="text-lg font-bold text-texto">
                      {resultados.data.votosBlancos.toLocaleString("es-EC")}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                    <Text className="text-sm font-semibold text-texto-suave">
                      Votos nulos
                    </Text>
                    <Text className="text-lg font-bold text-texto">
                      {resultados.data.votosNulos.toLocaleString("es-EC")}
                    </Text>
                  </View>
                  <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                    <Text className="text-sm font-semibold text-texto-suave">
                      Total sufragantes
                    </Text>
                    <Text className="text-lg font-bold text-texto">
                      {resultados.data.totalSufragantes.toLocaleString("es-EC")}
                    </Text>
                  </View>
                </View>
              </ClayCard>
              {resultados.data.candidaturas.map((candidatura) => (
                <ClayCard key={candidatura.candidatoId}>
                  <BarraResultado
                    nombre={candidatura.candidato}
                    organizacion={`${candidatura.organizacionSigla} · ${candidatura.organizacion}`}
                    votos={candidatura.votos}
                    porcentaje={candidatura.porcentaje}
                    colorHex={candidatura.colorHex}
                  />
                </ClayCard>
              ))}
              {resultados.data.candidaturas.length === 0 ? (
                <ClayCard>
                  <Text className="text-base text-texto-suave">
                    Todavía no hay votos para mostrar en esta dignidad y filtro.
                  </Text>
                </ClayCard>
              ) : null}
            </>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

function TarjetaActaProvincial({
  acta,
  onPress,
}: {
  acta: ActaRevision;
  onPress: (actaId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="active:scale-[0.99]"
      accessibilityLabel={`Abrir acta de ${etiquetaDignidad(acta.dignidad)}, mesa ${acta.mesa_numero}`}
      onPress={() => onPress(acta.acta_id)}
    >
      <ClayCard className="gap-2">
        <Text className="text-lg font-bold text-texto">
          {etiquetaDignidad(acta.dignidad)} · Mesa{" "}
          {String(acta.mesa_numero).padStart(3, "0")}
        </Text>
        <Text className="text-base text-texto-suave">
          {acta.estado_revision.replace(/_/g, " ")} · recibida{" "}
          {new Date(acta.recibida_en).toLocaleString("es-EC")}
        </Text>
        <Text className="text-base font-semibold text-primario">
          Abrir detalle del acta
        </Text>
      </ClayCard>
    </Pressable>
  );
}

function TarjetaAlertaProvincial({
  alerta,
  onPress,
}: {
  alerta: AlertaActa;
  onPress: (actaId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="active:scale-[0.99]"
      accessibilityLabel={`Abrir acta de ${etiquetaDignidad(alerta.dignidad)}, mesa ${alerta.mesa_numero}`}
      onPress={() => onPress(alerta.acta_id)}
    >
      <ClayCard className="gap-3">
        <Text className="text-lg font-bold text-texto">
          {alerta.recinto} · Mesa{" "}
          {String(alerta.mesa_numero).padStart(3, "0")}
        </Text>
        <Text className="text-base text-texto-suave">
          {alerta.parroquia} · {etiquetaDignidad(alerta.dignidad)}
        </Text>
        {alerta.fuera_margen ? (
          <ClayChip
            label={`Fuera de geovalla · ${Math.round(alerta.distancia_recinto_m)} m`}
            icono="location-outline"
            tono="alerta"
          />
        ) : null}
        {alerta.estado_revision === "rechazada" ? (
          <ClayChip
            label={`Rechazada: ${alerta.motivo_revision ?? "requiere recaptura"}`}
            icono="close-circle-outline"
            tono="error"
          />
        ) : null}
      </ClayCard>
    </Pressable>
  );
}
