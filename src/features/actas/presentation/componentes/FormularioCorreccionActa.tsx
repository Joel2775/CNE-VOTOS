import { useState } from "react";
import { Text } from "react-native";

import type { DetalleActaRevision } from "@/features/actas/domain/entidades/revisionActa";
import { formularioActaSchema } from "@/features/actas/domain/esquemas/actaEsquemas";
import { useCorregirActa } from "@/features/actas/presentation/hooks/useBandejaRevisionActas";
import { EstadoOperacion } from "@/ui/animaciones/EstadoOperacion";
import { ClayButton } from "@/ui/componentes/ClayButton";
import { ClayCard } from "@/ui/componentes/ClayCard";
import { ClayInput } from "@/ui/componentes/ClayInput";

type FormularioCorreccionActaProps = {
  actaId: string;
  detalle: DetalleActaRevision;
  onCancelar: () => void;
  onGuardado: () => void;
  enLinea: boolean;
};

export function FormularioCorreccionActa({
  actaId,
  detalle,
  onCancelar,
  onGuardado,
  enLinea,
}: FormularioCorreccionActaProps) {
  const mutacionCorreccion = useCorregirActa();
  const [votos, setVotos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      detalle.votos.map((voto) => [voto.organizacion_id, String(voto.votos)]),
    ),
  );
  const [blancos, setBlancos] = useState(String(detalle.acta.votos_blancos));
  const [nulos, setNulos] = useState(String(detalle.acta.votos_nulos));
  const [total, setTotal] = useState(
    String(detalle.acta.total_sufragantes),
  );
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function guardarCorreccion(): Promise<void> {
    const motivoAuditoria = motivo.trim();
    if (motivoAuditoria.length < 10) {
      setError(
        "El motivo obligatorio de auditoría debe tener al menos 10 caracteres.",
      );
      return;
    }

    const validacion = formularioActaSchema.safeParse({
      total_sufragantes: total,
      votos_nulos: nulos,
      votos_blancos: blancos,
      votos: detalle.votos.map((voto) => ({
        organizacion_id: voto.organizacion_id,
        votos: votos[voto.organizacion_id] ?? "",
      })),
    });
    if (!validacion.success) {
      setError(
        validacion.error.issues[0]?.message ??
          "Los valores de votos no cumplen las reglas del acta.",
      );
      return;
    }

    setError(null);
    try {
      await mutacionCorreccion.mutateAsync({
        actaId,
        totalSufragantes: validacion.data.total_sufragantes,
        votosNulos: validacion.data.votos_nulos,
        votosBlancos: validacion.data.votos_blancos,
        votos: validacion.data.votos,
        motivo: motivoAuditoria,
      });
      onGuardado();
    } catch (resultado) {
      setError(
        resultado instanceof Error
          ? resultado.message
          : "No se pudo guardar la corrección auditada.",
      );
    }
  }

  return (
    <ClayCard className="gap-4">
      <Text className="text-xl font-bold text-texto">
        Corrección de votos por auditoría
      </Text>
      {detalle.votos.map((voto) => (
        <ClayInput
          key={voto.organizacion_id}
          label={`${voto.candidato} · ${voto.organizacion_sigla}`}
          value={votos[voto.organizacion_id] ?? ""}
          onChangeText={(valor) =>
            setVotos((actuales) => ({
              ...actuales,
              [voto.organizacion_id]: valor,
            }))
          }
          keyboardType="number-pad"
        />
      ))}
      <ClayInput
        label="Votos blancos"
        value={blancos}
        onChangeText={setBlancos}
        keyboardType="number-pad"
      />
      <ClayInput
        label="Votos nulos"
        value={nulos}
        onChangeText={setNulos}
        keyboardType="number-pad"
      />
      <ClayInput
        label="Total de sufragantes"
        value={total}
        onChangeText={setTotal}
        keyboardType="number-pad"
      />
      <ClayInput
        label="Motivo obligatorio de auditoría (mínimo 10 caracteres)"
        placeholder="Explica por qué corriges los valores"
        value={motivo}
        onChangeText={setMotivo}
        multiline
        textAlignVertical="top"
        className="min-h-[120px] items-start py-2"
      />
      {error ? <EstadoOperacion estado="error" mensaje={error} /> : null}
      <ClayButton
        title="Guardar corrección auditada"
        onPress={() => void guardarCorreccion()}
        loading={mutacionCorreccion.isPending}
        loadingLabel="Guardando corrección…"
        disabled={!enLinea || mutacionCorreccion.isPending}
      />
      <ClayButton
        title="Cancelar corrección"
        onPress={onCancelar}
        disabled={mutacionCorreccion.isPending}
      />
    </ClayCard>
  );
}
