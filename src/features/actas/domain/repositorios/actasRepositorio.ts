import type {
  ActaOffline,
  CatalogoActas,
  DignidadActa,
  OrganizacionConCandidato,
} from "../entidades/acta";

export interface ActasRepositorio {
  precargarCatalogos(): Promise<CatalogoActas>;
  listarCatalogo(
    dignidad: DignidadActa,
  ): Promise<OrganizacionConCandidato[]>;
  guardarActaOffline(acta: ActaOffline): Promise<void>;
}
