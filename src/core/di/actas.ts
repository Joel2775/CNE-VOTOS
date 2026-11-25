import { supabase } from "@/core/supabase/client";
import { SQLiteActasRepositorio } from "@/features/actas/data/sqliteActasRepositorio";
import type {
  ActaOffline,
  DignidadActa,
} from "@/features/actas/domain/entidades/acta";
import { guardarActaOffline } from "@/features/actas/domain/casos-uso/guardarActaOffline";
import { listarCatalogoActa } from "@/features/actas/domain/casos-uso/listarCatalogoActa";
import { precargarCatalogosActas } from "@/features/actas/domain/casos-uso/precargarCatalogosActas";

const repositorio = new SQLiteActasRepositorio(supabase);

export const actas = {
  listarCatalogo(dignidad: DignidadActa) {
    return listarCatalogoActa(repositorio, dignidad);
  },
  precargarCatalogos() {
    return precargarCatalogosActas(repositorio);
  },
  guardarOffline(acta: ActaOffline) {
    return guardarActaOffline(repositorio, acta);
  },
};
