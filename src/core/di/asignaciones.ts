import { supabase } from "@/core/supabase/client";
import { SupabaseAsignacionesRepositorio } from "@/features/asignaciones/data/supabaseAsignacionesRepositorio";
import { asignarVeedorMesa } from "@/features/asignaciones/domain/casos-uso/asignarVeedorMesa";
import { listarMesasAsignadasVeedor } from "@/features/asignaciones/domain/casos-uso/listarMesasAsignadasVeedor";
import { listarMesasRecinto } from "@/features/asignaciones/domain/casos-uso/listarMesasRecinto";
import { reemplazarVeedorEnVivo } from "@/features/asignaciones/domain/casos-uso/reemplazarVeedorEnVivo";

const repositorio = new SupabaseAsignacionesRepositorio(supabase);

export const asignaciones = {
  listarMesasRecinto(coordinadorId: string) {
    return listarMesasRecinto(repositorio, coordinadorId);
  },
  asignarVeedor(datos: unknown) {
    return asignarVeedorMesa(repositorio, datos);
  },
  reemplazar(datos: unknown) {
    return reemplazarVeedorEnVivo(repositorio, datos);
  },
  listarMesasAsignadas(veedorId: string) {
    return listarMesasAsignadasVeedor(repositorio, veedorId);
  },
  listarMesasAsignadasLocal(veedorId: string) {
    return repositorio.listarMesasAsignadasVeedorLocal(veedorId);
  },
};
