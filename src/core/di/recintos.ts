import { supabase } from "@/core/supabase/client";
import { SupabaseRecintosRepositorio } from "@/features/recintos/data/supabaseRecintosRepositorio";
import { asignarCoordinadorRecinto } from "@/features/recintos/domain/casos-uso/asignarCoordinadorRecinto";
import { crearRecinto } from "@/features/recintos/domain/casos-uso/crearRecinto";
import type { NuevoRecintoValidado } from "@/features/recintos/domain/esquemas/recintoEsquemas";
import { listarRecintosProvincia } from "@/features/recintos/domain/casos-uso/listarRecintosProvincia";
import { obtenerOpcionesRecinto } from "@/features/recintos/domain/casos-uso/obtenerOpcionesRecinto";

const repositorio = new SupabaseRecintosRepositorio(supabase);

export const recintos = {
  listarPorProvincia(provinciaId: string) {
    return listarRecintosProvincia(repositorio, provinciaId);
  },
  obtenerOpciones(provinciaId: string) {
    return obtenerOpcionesRecinto(repositorio, provinciaId);
  },
  crear(datos: NuevoRecintoValidado) {
    return crearRecinto(repositorio, datos);
  },
  asignarCoordinador(recintoId: string, coordinadorId: string) {
    return asignarCoordinadorRecinto(repositorio, recintoId, coordinadorId);
  },
};
