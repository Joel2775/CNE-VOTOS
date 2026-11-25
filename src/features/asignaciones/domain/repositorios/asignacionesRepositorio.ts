import type {
  MesaAsignadaVeedor,
  ReemplazoVeedor,
  ResumenMesasRecinto,
} from "../entidades/asignacionVeedor";

export interface AsignacionesRepositorio {
  listarMesasRecinto(coordinadorId: string): Promise<ResumenMesasRecinto>;
  asignarVeedorMesa(mesaId: string, veedorId: string): Promise<void>;
  reemplazarVeedorEnVivo(reemplazo: ReemplazoVeedor): Promise<void>;
  listarMesasAsignadasVeedorLocal(
    veedorId: string,
  ): Promise<MesaAsignadaVeedor[]>;
  listarMesasAsignadasVeedor(veedorId: string): Promise<MesaAsignadaVeedor[]>;
}
