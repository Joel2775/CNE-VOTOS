import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useEstadoConectividad } from "@/core/red/useEstadoConectividad";
import { esErrorSinConexion } from "@/core/red/verificarConexionObligatoria";
import { useSesionStore } from "@/core/store/sesionStore";
import { useCerrarSesion } from "@/features/cuentas/presentation/hooks/useCerrarSesion";
import { useContadorActasPendientes } from "@/features/sincronizacion/presentation/hooks/useContadorActasPendientes";
import type { MesaAsignable } from "@/features/asignaciones/domain/entidades/asignacionVeedor";
import { useAsignacionesRecinto } from "@/features/asignaciones/presentation/hooks/useAsignaciones";
import { AvisoSinConexionLottie } from "@/ui/componentes/AvisoSinConexionLottie";
import { CabeceraSesion } from "@/ui/componentes/CabeceraSesion";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { ClayChip } from "@/ui/componentes/ClayChip";
import { ClayHeader } from "@/ui/componentes/ClayHeader";
import { ClayInput } from "@/ui/componentes/ClayInput";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";

type ModoMesa = "asignar" | "reemplazar";

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la acción.";
}

export default function CoordinacionRecintoPantalla() {
  const usuario = useSesionStore((estado) => estado.usuario);
  const perfil = useSesionStore((estado) => estado.perfil);
  const conexion = useEstadoConectividad();
  const contador = useContadorActasPendientes();
  const cierreSesion = useCerrarSesion();
  const consultaAsignaciones = useAsignacionesRecinto(
    perfil?.id ?? null,
    conexion.enLinea === true,
  );
  const [mesaSeleccionada, setMesaSeleccionada] =
    useState<MesaAsignable | null>(null);
  const [modo, setModo] = useState<ModoMesa>("asignar");
  const [veedorSeleccionado, setVeedorSeleccionado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [avisoDesconexionCerrado, setAvisoDesconexionCerrado] =
    useState(false);
  const [estadoOperacion, setEstadoOperacion] = useState<
    "procesando" | "exito" | "error" | null
  >(null);

  useEffect(
    () =>
      NetInfo.addEventListener((estado) => {
        const enLinea =
          estado.isInternetReachable ?? estado.isConnected ?? false;
        if (enLinea) {
          setSinConexion(false);
          setAvisoDesconexionCerrado(false);
        }
      }),
    [],
  );

  function seleccionarMesa(mesa: MesaAsignable, nuevoModo: ModoMesa) {
    setMesaSeleccionada(mesa);
    setModo(nuevoModo);
    setVeedorSeleccionado("");
    setMotivo("");
    setMensaje(null);
    setErrorAccion(null);
  }

  function cerrarSeleccion() {
    setMesaSeleccionada(null);
    setVeedorSeleccionado("");
    setMotivo("");
  }

  async function asignarVeedor() {
    if (!mesaSeleccionada || !veedorSeleccionado) {
      setErrorAccion("Selecciona un veedor para esta mesa.");
      setEstadoOperacion("error");
      return;
    }

    setEstadoOperacion("procesando");
    setErrorAccion(null);
    setMensaje(null);
    setSinConexion(false);
    try {
      await consultaAsignaciones.asignar.mutateAsync({
        mesa_id: mesaSeleccionada.id,
        veedor_id: veedorSeleccionado,
      });
      setMensaje("Veedor asignado correctamente.");
      setEstadoOperacion("exito");
      cerrarSeleccion();
    } catch (error) {
      setSinConexion(esErrorSinConexion(error));
      setErrorAccion(mensajeDeError(error));
      setEstadoOperacion("error");
    }
  }

  async function reemplazarVeedor() {
    if (!mesaSeleccionada?.asignacion) {
      setErrorAccion("Esta mesa ya no tiene una asignación activa.");
      setEstadoOperacion("error");
      return;
    }
    if (!veedorSeleccionado) {
      setErrorAccion("Selecciona el veedor que reemplazará al actual.");
      setEstadoOperacion("error");
      return;
    }
    if (motivo.trim().length < 3) {
      setErrorAccion("Describe el motivo con al menos 3 caracteres.");
      setEstadoOperacion("error");
      return;
    }

    setEstadoOperacion("procesando");
    setErrorAccion(null);
    setMensaje(null);
    setSinConexion(false);
    try {
      await consultaAsignaciones.reemplazar.mutateAsync({
        asignacion_anterior_id: mesaSeleccionada.asignacion.id,
        veedor_entrante_id: veedorSeleccionado,
        motivo: motivo.trim(),
      });
      setMensaje("Reemplazo guardado y registrado en el historial.");
      setEstadoOperacion("exito");
      cerrarSeleccion();
    } catch (error) {
      setSinConexion(esErrorSinConexion(error));
      setErrorAccion(mensajeDeError(error));
      setEstadoOperacion("error");
    }
  }

  const resumen = consultaAsignaciones.consulta.data;
  const totalMesas = resumen?.mesas.length ?? 0;
  const mesasConVeedor =
    resumen?.mesas.filter((mesa) => Boolean(mesa.asignacion)).length ?? 0;
  const porcentajeAsignacion =
    totalMesas === 0 ? 0 : Math.round((mesasConVeedor / totalMesas) * 100);
  const operacionPendiente =
    consultaAsignaciones.asignar.isPending ||
    consultaAsignaciones.reemplazar.isPending;

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerClassName="gap-5 p-5">
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
        titulo="Gestión de mesas"
        descripcion="Asigna un veedor a cada mesa y revisa las asignaciones cuando sea necesario."
      />

      {estadoOperacion ? (
        <EstadoOperacion
          estado={estadoOperacion}
          mensaje={errorAccion ?? mensaje ?? "Guardando los cambios…"}
        />
      ) : null}
      {!conexion.enLinea ? (
        <ClayCard>
          <Text className="text-base text-alerta">
            La administración de asignaciones requiere conexión a internet.
          </Text>
        </ClayCard>
      ) : null}
      {consultaAsignaciones.consulta.isError ? (
        <ClayCard>
          <Text className="text-base text-error">
            {mensajeDeError(consultaAsignaciones.consulta.error)}
          </Text>
        </ClayCard>
      ) : null}

      {resumen ? (
        <>
          <ClayCard className="gap-4">
            <View className="gap-1">
              <Text className="text-xl font-bold text-texto">
                {resumen.recinto.nombre}
              </Text>
              <Text className="text-base text-texto-suave">
                Resumen de asignaciones
              </Text>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                <Text className="text-sm font-semibold text-texto-suave">
                  Con veedor
                </Text>
                <Text className="text-lg font-bold text-texto">
                  {mesasConVeedor} / {totalMesas}
                </Text>
              </View>
              <View className="flex-1 gap-1 rounded-campo bg-fondo p-3">
                <Text className="text-sm font-semibold text-texto-suave">
                  Pendientes
                </Text>
                <Text className="text-lg font-bold text-texto">
                  {totalMesas - mesasConVeedor}
                </Text>
              </View>
            </View>
            <View
              accessibilityLabel="Mesas con veedor asignado"
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: porcentajeAsignacion,
              }}
              className="h-3 overflow-hidden rounded-full bg-fondo"
            >
              <View
                className="h-full rounded-full bg-primario"
                style={{ width: `${porcentajeAsignacion}%` }}
              />
            </View>
          </ClayCard>
          <View className="gap-4">
            {resumen.mesas.map((mesa) => (
              <ClayCard key={mesa.id} className="gap-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-xl font-bold text-texto">
                    Mesa {String(mesa.numero).padStart(3, "0")}
                  </Text>
                  {mesa.asignacion ? (
                    <ClayChip
                      label="Asignada"
                      icono="checkmark-circle-outline"
                      tono="exito"
                    />
                  ) : (
                    <ClayChip
                      label="Pendiente"
                      icono="alert-circle-outline"
                      tono="alerta"
                    />
                  )}
                </View>
                {mesa.asignacion ? (
                  <Text className="text-lg font-semibold text-texto">
                    {mesa.asignacion.veedor.nombres}{" "}
                    {mesa.asignacion.veedor.apellidos}
                  </Text>
                ) : null}
                <ClayButton
                  title={
                    mesa.asignacion
                      ? "Reemplazar veedor"
                      : "Asignar veedor"
                  }
                  disabled={!conexion.enLinea}
                  onPress={() =>
                    seleccionarMesa(
                      mesa,
                      mesa.asignacion ? "reemplazar" : "asignar",
                    )
                  }
                />
                {mesaSeleccionada?.id === mesa.id ? (
                  <View className="gap-3">
                    <Text className="text-lg font-semibold text-texto">
                      {modo === "reemplazar"
                        ? "Elige el veedor que reemplazará al actual."
                        : "Elige un veedor registrado para esta mesa."}
                    </Text>
                    <Text className="text-base leading-6 text-texto-suave">
                      Un veedor puede cubrir varias mesas.
                    </Text>
                    {modo === "reemplazar" ? (
                      <Text className="text-base leading-6 text-texto-suave">
                        El cambio quedará registrado en el historial.
                      </Text>
                    ) : null}
                    {resumen.veedores.filter(
                      (veedor) =>
                        modo === "asignar" ||
                        veedor.id !== mesa.asignacion?.veedor_id,
                    ).length === 0 ? (
                      <Text className="text-base leading-6 text-texto-suave">
                        No hay veedores disponibles para esta acción. Registra
                        uno desde la sección de veedores y vuelve aquí.
                      </Text>
                    ) : null}
                    {resumen.veedores
                      .filter(
                        (veedor) =>
                          modo === "asignar" ||
                          veedor.id !== mesa.asignacion?.veedor_id,
                      )
                      .map((veedor) => (
                        <Pressable
                          key={veedor.id}
                          accessibilityRole="radio"
                          accessibilityState={{
                            selected: veedorSeleccionado === veedor.id,
                          }}
                          className={`min-h-[56px] justify-center rounded-campo px-4 ${
                            veedorSeleccionado === veedor.id
                              ? "bg-primario"
                              : "bg-superficie"
                          }`}
                          onPress={() => setVeedorSeleccionado(veedor.id)}
                        >
                          <Text
                            className={`text-base ${
                              veedorSeleccionado === veedor.id
                                ? "font-semibold text-superficie"
                                : "text-texto"
                            }`}
                          >
                            {veedor.nombres} {veedor.apellidos}
                          </Text>
                          <Text
                            className={`text-sm ${
                              veedorSeleccionado === veedor.id
                                ? "text-superficie"
                                : "text-texto-suave"
                            }`}
                          >
                            {veedor.correo}
                          </Text>
                        </Pressable>
                      ))}
                    {modo === "reemplazar" ? (
                      <ClayInput
                        label="Motivo del reemplazo"
                        value={motivo}
                        onChangeText={setMotivo}
                        multiline
                        error={
                          motivo.trim().length > 0 && motivo.trim().length < 3
                            ? "Describe el motivo con al menos 3 caracteres."
                            : undefined
                        }
                      />
                    ) : null}
                    <ClayButton
                      title={
                        modo === "reemplazar"
                          ? "Confirmar reemplazo"
                          : "Guardar asignación"
                      }
                      loading={operacionPendiente}
                      loadingLabel="Guardando…"
                      disabled={!conexion.enLinea || !veedorSeleccionado}
                      onPress={() =>
                        modo === "reemplazar"
                          ? void reemplazarVeedor()
                          : void asignarVeedor()
                      }
                    />
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-[48px] items-center justify-center"
                      onPress={cerrarSeleccion}
                    >
                      <Text className="text-base font-semibold text-texto-suave">
                        Cancelar
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </ClayCard>
            ))}
          </View>
        </>
      ) : consultaAsignaciones.consulta.isLoading ? (
        <Text className="text-base text-texto-suave">
          Cargando las mesas de tu recinto…
        </Text>
      ) : null}

      <AvisoSinConexionLottie
        visible={
          sinConexion ||
          (conexion.enLinea === false && !avisoDesconexionCerrado)
        }
        onDismiss={() => {
          setSinConexion(false);
          setAvisoDesconexionCerrado(true);
        }}
      />
    </ScrollView>
  );
}
