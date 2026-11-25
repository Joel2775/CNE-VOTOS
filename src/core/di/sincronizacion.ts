import { SQLiteSincronizacionRepositorio } from "@/features/sincronizacion/data/sqliteSincronizacionRepositorio";
import {
  contarActasPendientes,
  sincronizarActasPendientes,
} from "@/features/sincronizacion/domain/casos-uso/contarActasPendientes";

const repositorio = new SQLiteSincronizacionRepositorio();

export const sincronizacion = {
  contarActasPendientes() {
    return contarActasPendientes(repositorio);
  },
  sincronizarPendientes() {
    return sincronizarActasPendientes(repositorio);
  },
};
