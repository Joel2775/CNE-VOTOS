import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { ScrollView, Text, View } from "react-native";

import { useEstadoConectividad } from "@/core/red/useEstadoConectividad";
import { useSesionStore } from "@/core/store/sesionStore";
import type { DignidadActa } from "@/features/actas/domain/entidades/acta";
import { usePrecargaCatalogoActas } from "@/features/actas/presentation/hooks/usePrecargaCatalogoActas";
import { useMesasAsignadasVeedor } from "@/features/asignaciones/presentation/hooks/useAsignaciones";
import type { EstadoActaMesa } from "@/features/asignaciones/domain/entidades/asignacionVeedor";
import { useCerrarSesion } from "@/features/cuentas/presentation/hooks/useCerrarSesion";
import { useContadorActasPendientes } from "@/features/sincronizacion/presentation/hooks/useContadorActasPendientes";
import { useSincronizacionAutomatica } from "@/features/sincronizacion/presentation/hooks/useSincronizacionAutomatica";
import { CabeceraSesion } from "@/ui/componentes/CabeceraSesion";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { ClayChip } from "@/ui/componentes/ClayChip";
import { ClayHeader } from "@/ui/componentes/ClayHeader";

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudieron cargar tus mesas.";
}

const dignidades: { valor: DignidadActa; etiqueta: string }[] = [
  { valor: "alcaldia", etiqueta: "Alcaldía" },
  { valor: "prefectura", etiqueta: "Prefectura" },
];

function mostrarEstado(estado: EstadoActaMesa): {
  texto: string;
  icono: ComponentProps<typeof Ionicons>["name"];
  tono: "alerta" | "exito" | "error";
} {
  switch (estado) {
    case "faltante":
      return { texto: "Falta capturar", icono: "camera-outline", tono: "alerta" };
    case "en_cola":
      return { texto: "Guardada en el teléfono", icono: "phone-portrait-outline", tono: "alerta" };
    case "pendiente_subida":
      return { texto: "Pendiente de subir", icono: "cloud-upload-outline", tono: "alerta" };
    case "enviada":
      return { texto: "Enviada", icono: "checkmark-circle-outline", tono: "exito" };
    case "pendiente_revision":
      return { texto: "Pendiente de revisión", icono: "time-outline", tono: "alerta" };
    case "validada":
      return { texto: "Validada", icono: "checkmark-circle-outline", tono: "exito" };
    case "observada":
      return { texto: "Observada", icono: "warning-outline", tono: "alerta" };
    case "rechazada":
      return { texto: "Rechazada: recaptura requerida", icono: "close-circle-outline", tono: "error" };
    case "error":
      return { texto: "Error de envío", icono: "alert-circle-outline", tono: "error" };
  }
}

export default function VeedorPantalla() {
  const usuario = useSesionStore((estado) => estado.usuario);
  const perfil = useSesionStore((estado) => estado.perfil);
  const conexion = useEstadoConectividad();
  const contador = useContadorActasPendientes();
  const precargaCatalogo = usePrecargaCatalogoActas();
  const sincronizacionAutomatica = useSincronizacionAutomatica(conexion.enLinea);
  const cierreSesion = useCerrarSesion();
  const mesas = useMesasAsignadasVeedor(perfil?.id ?? null);
  const catalogoSinCandidatos =
    precargaCatalogo.data?.alcaldia.length === 0 &&
    precargaCatalogo.data.prefectura.length === 0;
  const avisoCatalogo =
    precargaCatalogo.data?.advertencia ??
    (catalogoSinCandidatos
      ? "No hay candidatos cargados. Conéctate para descargar el catálogo antes de registrar actas."
      : null);
  const actasFaltantes =
    mesas.data?.reduce(
      (total, mesa) =>
        total +
        dignidades.filter(
          (dignidad) => mesa.actas[dignidad.valor] === "faltante",
        ).length,
      0,
    ) ?? null;

  return (
    <View className="flex-1 bg-fondo">
      <ScrollView
        className="flex-1"
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
          titulo="Mis mesas asignadas"
          descripcion={
            conexion.enLinea
              ? "Tus mesas se actualizan desde el servidor y quedan guardadas en este teléfono."
              : "Sin conexión: estas mesas están disponibles desde el almacenamiento local."
          }
        />
        {mesas.data ? (
          <ClayCard className="gap-3">
            <Text className="text-xl font-bold text-texto">
              Resumen de trabajo
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                <Text className="text-sm font-semibold text-texto-suave">
                  Mesas asignadas
                </Text>
                <Text className="text-lg font-bold text-texto">
                  {mesas.data.length}
                </Text>
              </View>
              <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                <Text className="text-sm font-semibold text-texto-suave">
                  Actas faltantes
                </Text>
                <Text className="text-lg font-bold text-texto">
                  {actasFaltantes}
                </Text>
              </View>
            </View>
            <Text className="text-base leading-6 text-texto-suave">
              Cada mesa requiere un acta de Alcaldía y otra de Prefectura.
            </Text>
          </ClayCard>
        ) : null}
        {precargaCatalogo.error ? (
          <ClayCard>
            <Text accessibilityRole="alert" className="text-base text-error">
              No se pudo actualizar el catálogo de candidatos:{" "}
              {mensajeDeError(precargaCatalogo.error)}
            </Text>
          </ClayCard>
        ) : null}
        {avisoCatalogo ? (
          <ClayCard>
            <Text accessibilityRole="alert" className="text-base text-alerta">
              {avisoCatalogo}
            </Text>
          </ClayCard>
        ) : null}
        {sincronizacionAutomatica.error ? (
          <ClayCard className="gap-3">
            <Text accessibilityRole="alert" className="text-base text-error">
              {sincronizacionAutomatica.error}
            </Text>
            <ClayButton
              title="Reintentar envío"
              onPress={() => void sincronizacionAutomatica.reintentar()}
            />
          </ClayCard>
        ) : null}
        {mesas.isLoading ? (
          <Text className="text-base text-texto-suave">Cargando tus mesas…</Text>
        ) : null}
        {mesas.isError ? (
          <ClayCard>
            <Text className="text-base text-error">
              {mensajeDeError(mesas.error)}
            </Text>
          </ClayCard>
        ) : null}
        {mesas.data?.length === 0 ? (
          <ClayCard>
            <Text className="text-base text-texto">
              No tienes mesas asignadas. Contacta al coordinador de tu recinto.
            </Text>
          </ClayCard>
        ) : null}
        {mesas.data?.map((mesa) => (
          <ClayCard key={mesa.asignacion_id} className="gap-2">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-xl font-bold text-texto">
                Mesa {String(mesa.numero).padStart(3, "0")}
              </Text>
              <ClayChip
                label={`${dignidades.filter((dignidad) => mesa.actas[dignidad.valor] === "faltante").length} actas faltantes`}
                icono="document-text-outline"
                tono={
                  dignidades.some(
                    (dignidad) => mesa.actas[dignidad.valor] === "faltante",
                  )
                    ? "alerta"
                    : "exito"
                }
              />
            </View>
            <Text className="text-base text-texto">{mesa.recinto}</Text>
            <Text className="text-base text-texto-suave">
              Ubicación del recinto: {mesa.latitud.toFixed(5)},{" "}
              {mesa.longitud.toFixed(5)}
            </Text>
            {dignidades.map((dignidad) => {
              const estado = mesa.actas[dignidad.valor];
              const visual = mostrarEstado(estado);
              return (
                <View
                  key={dignidad.valor}
                  className="gap-2 border-t border-primario/10 pt-3"
                >
                  <View className="flex-row flex-wrap items-center justify-between gap-2">
                    <Text className="text-lg font-semibold text-texto">
                      Acta de {dignidad.etiqueta}
                    </Text>
                    <ClayChip
                      label={visual.texto}
                      icono={visual.icono}
                      tono={visual.tono}
                    />
                  </View>
                  {estado === "faltante" ? (
                    <ClayButton
                      title={`Registrar ${dignidad.etiqueta}`}
                      onPress={() =>
                        router.push({
                          pathname: "/(veedor)/capturar",
                          params: {
                            mesaId: mesa.mesa_id,
                            dignidad: dignidad.valor,
                          },
                        })
                      }
                    />
                  ) : null}
                  {estado === "rechazada" &&
                  mesa.acta_ids[dignidad.valor] ? (
                    <>
                      {mesa.motivos_revision[dignidad.valor] ? (
                        <Text className="text-base text-error">
                          Motivo: {mesa.motivos_revision[dignidad.valor]}
                        </Text>
                      ) : null}
                      <ClayButton
                        title={`Recapturar ${dignidad.etiqueta}`}
                        onPress={() =>
                          router.push({
                            pathname: "/(veedor)/capturar",
                            params: {
                              mesaId: mesa.mesa_id,
                              dignidad: dignidad.valor,
                              actaId: mesa.acta_ids[dignidad.valor]!,
                            },
                          })
                        }
                      />
                    </>
                  ) : null}
                </View>
              );
            })}
          </ClayCard>
        ))}
      </ScrollView>
    </View>
  );
}
