import { Redirect } from "expo-router";
import { obtenerGrupoInicial, useSesionStore } from "@/core/store/sesionStore";

export default function Index() {
  const usuario = useSesionStore((estado) => estado.usuario);
  const perfil = useSesionStore((estado) => estado.perfil);
  const hidratado = useSesionStore((estado) => estado.hidratado);

  if (!hidratado) {
    return null;
  }

  return <Redirect href={obtenerGrupoInicial(usuario, perfil)} />;
}
