import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { ScrollView, Text } from "react-native";

import { useEstadoConectividad } from "@/core/red/useEstadoConectividad";
import { esErrorSinConexion } from "@/core/red/verificarConexionObligatoria";
import { useSesionStore } from "@/core/store/sesionStore";
import { useCerrarSesion } from "@/features/cuentas/presentation/hooks/useCerrarSesion";
import { useCrearVeedor } from "@/features/cuentas/presentation/hooks/useCrearVeedor";
import {
  nuevoVeedorSchema,
  type NuevoVeedor,
} from "@/features/cuentas/domain/esquemas/cuentasEsquemas";
import { useContadorActasPendientes } from "@/features/sincronizacion/presentation/hooks/useContadorActasPendientes";
import { AvisoSinConexionLottie } from "@/ui/componentes/AvisoSinConexionLottie";
import { CabeceraSesion } from "@/ui/componentes/CabeceraSesion";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { ClayHeader } from "@/ui/componentes/ClayHeader";
import { ClayInput } from "@/ui/componentes/ClayInput";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";

export default function RegistroVeedoresPantalla() {
  const usuario = useSesionStore((estado) => estado.usuario);
  const perfil = useSesionStore((estado) => estado.perfil);
  const conexion = useEstadoConectividad();
  const contador = useContadorActasPendientes();
  const cierreSesion = useCerrarSesion();
  const crearCuenta = useCrearVeedor();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [estadoOperacion, setEstadoOperacion] = useState<
    "procesando" | "exito" | "error" | null
  >(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<NuevoVeedor>({
    resolver: zodResolver(nuevoVeedorSchema),
    mode: "onChange",
    defaultValues: {
      nombres: "",
      apellidos: "",
      cedula: "",
      telefono: "",
      correo: "",
    },
  });

  async function registrarVeedor(datos: NuevoVeedor) {
    setMensaje(null);
    setErrorAccion(null);
    setSinConexion(false);
    setEstadoOperacion("procesando");
    try {
      await crearCuenta.mutateAsync(datos);
      reset();
      setMensaje(
        "Invitación enviada. El veedor debe verificar su correo antes de iniciar sesión.",
      );
      setEstadoOperacion("exito");
    } catch (error) {
      setSinConexion(esErrorSinConexion(error));
      setErrorAccion(
        error instanceof Error
          ? error.message
          : "No se pudo registrar al veedor.",
      );
      setEstadoOperacion("error");
    }
  }

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
        titulo="Registrar veedor"
        descripcion="Crea una cuenta nueva. Después podrás asignarla desde la pestaña Mesas."
      />

      {estadoOperacion ? (
        <EstadoOperacion
          estado={estadoOperacion}
          mensaje={errorAccion ?? mensaje ?? "Enviando invitación…"}
          onDismiss={
            estadoOperacion === "error" ? () => setEstadoOperacion(null) : undefined
          }
        />
      ) : null}
      {!conexion.enLinea ? (
        <ClayCard>
          <Text className="text-base text-alerta">
            El registro de cuentas requiere conexión a internet.
          </Text>
        </ClayCard>
      ) : null}

      <ClayCard className="gap-4">
        <Controller
          control={control}
          name="nombres"
          render={({ field }) => (
            <ClayInput
              label="Nombres"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.nombres?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="apellidos"
          render={({ field }) => (
            <ClayInput
              label="Apellidos"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.apellidos?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="cedula"
          render={({ field }) => (
            <ClayInput
              label="Cédula"
              value={field.value}
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.cedula?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="telefono"
          render={({ field }) => (
            <ClayInput
              label="Teléfono"
              value={field.value}
              keyboardType="phone-pad"
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.telefono?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="correo"
          render={({ field }) => (
            <ClayInput
              label="Correo electrónico"
              value={field.value}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.correo?.message}
            />
          )}
        />
        <ClayButton
          title="Enviar invitación"
          loading={crearCuenta.isPending}
          loadingLabel="Registrando…"
          disabled={!conexion.enLinea || !isValid || crearCuenta.isPending}
          onPress={handleSubmit(registrarVeedor)}
        />
      </ClayCard>
      <AvisoSinConexionLottie
        visible={sinConexion}
        onDismiss={() => setSinConexion(false)}
      />
    </ScrollView>
  );
}
