import type {
  NuevoRecinto,
  OpcionesRecinto,
  Recinto,
} from "../entidades/recinto";

export interface RecintosRepositorio {
  listarPorProvincia(provinciaId: string): Promise<Recinto[]>;
  obtenerOpcionesFormulario(provinciaId: string): Promise<OpcionesRecinto>;
  crear(recinto: NuevoRecinto): Promise<string>;
  asignarCoordinador(recintoId: string, coordinadorId: string): Promise<void>;
}
