import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";

import { inicializarBaseLocal } from "@/core/offline/sqliteDb";
import { encolarActaOffline } from "@/core/offline/syncService";
import type { Database } from "@/core/supabase/database.types";
import type {
  ActaOffline,
  CatalogoActas,
  DignidadActa,
  OrganizacionConCandidato,
} from "../domain/entidades/acta";
import type { ActasRepositorio } from "../domain/repositorios/actasRepositorio";

type OrganizacionFila = Database["public"]["Tables"]["organizaciones"]["Row"];
type CandidatoFila = Database["public"]["Tables"]["candidatos"]["Row"];
type CatalogoPorDignidad = Pick<CatalogoActas, "alcaldia" | "prefectura">;

function esOnline(estado: Awaited<ReturnType<typeof NetInfo.fetch>>): boolean {
  return estado.isInternetReachable ?? estado.isConnected ?? false;
}

function mapearCatalogo(
  organizaciones: OrganizacionFila[],
  candidatos: CandidatoFila[],
  dignidad: DignidadActa,
): OrganizacionConCandidato[] {
  const candidatosPorOrganizacion = new Map(
    candidatos
      .filter((candidato) => candidato.dignidad === dignidad)
      .map((candidato) => [candidato.organizacion_id, candidato.nombre]),
  );
  const catalogo = organizaciones
    .map((organizacion) => {
      const candidato = candidatosPorOrganizacion.get(organizacion.id);
      if (!candidato) {
        return null;
      }

      return {
        id: organizacion.id,
        sigla: organizacion.sigla,
        nombre: organizacion.nombre,
        color_hex: organizacion.color_hex,
        orden: organizacion.orden,
        candidato,
      };
    })
    .filter((organizacion) => organizacion !== null)
    .sort((a, b) => a.orden - b.orden);

  return catalogo;
}

function catalogoCompleto(
  catalogo: CatalogoPorDignidad,
): boolean {
  return catalogo.alcaldia.length === 5 && catalogo.prefectura.length === 5;
}

function mapearCatalogos(
  organizaciones: OrganizacionFila[],
  candidatos: CandidatoFila[],
): CatalogoPorDignidad | null {
  if (organizaciones.length !== 5 || candidatos.length !== 10) {
    return null;
  }

  const catalogo = {
    alcaldia: mapearCatalogo(organizaciones, candidatos, "alcaldia"),
    prefectura: mapearCatalogo(organizaciones, candidatos, "prefectura"),
  };

  return catalogoCompleto(catalogo) ? catalogo : null;
}

export class SQLiteActasRepositorio implements ActasRepositorio {
  constructor(private readonly cliente: SupabaseClient<Database>) {}

  async precargarCatalogos(): Promise<CatalogoActas> {
    let enLinea = false;
    let advertencia: string | null = null;

    try {
      enLinea = esOnline(await NetInfo.fetch());
    } catch (error) {
      const detalle =
        error instanceof Error ? error.message : "Error desconocido.";
      advertencia = `No se pudo comprobar la conexión: ${detalle}`;
    }

    if (enLinea) {
      let datosRemotos: {
        organizaciones: OrganizacionFila[];
        candidatos: CandidatoFila[];
        catalogo: CatalogoPorDignidad;
      } | null = null;

      try {
        const [respuestaOrganizaciones, respuestaCandidatos] =
          await Promise.all([
            this.cliente
              .from("organizaciones")
              .select("id, sigla, nombre, color_hex, orden")
              .order("orden"),
            this.cliente
              .from("candidatos")
              .select("id, organizacion_id, dignidad, nombre")
              .order("nombre"),
          ]);

        const errorRemoto =
          respuestaOrganizaciones.error ?? respuestaCandidatos.error;
        if (errorRemoto) {
          advertencia = `No se pudo actualizar el catálogo desde Supabase: ${errorRemoto.message}`;
        } else {
          const organizaciones = respuestaOrganizaciones.data ?? [];
          const candidatos = respuestaCandidatos.data ?? [];
          const catalogo = mapearCatalogos(organizaciones, candidatos);

          if (catalogo) {
            datosRemotos = { organizaciones, candidatos, catalogo };
          } else {
            advertencia =
              "El catálogo de Supabase está vacío o incompleto; se intentarán usar los datos guardados en este teléfono.";
          }
        }
      } catch (error) {
        const detalle =
          error instanceof Error ? error.message : "Error desconocido.";
        advertencia = `No se pudo actualizar el catálogo desde Supabase: ${detalle}`;
      }

      if (datosRemotos) {
        await this.guardarCatalogoLocal(
          datosRemotos.organizaciones,
          datosRemotos.candidatos,
        );
        return { ...datosRemotos.catalogo, advertencia: null };
      }
    }

    const catalogoLocal = await this.leerCatalogoLocal();
    if (catalogoCompleto(catalogoLocal)) {
      return {
        ...catalogoLocal,
        advertencia:
          advertencia ??
          (enLinea
            ? null
            : "Sin conexión: se está usando el catálogo guardado en este teléfono."),
      };
    }

    return {
      alcaldia: [],
      prefectura: [],
      advertencia:
        advertencia
          ? `${advertencia} No hay un catálogo completo guardado en este teléfono.`
          : "No hay candidatos guardados en este teléfono. Conéctate para descargar el catálogo antes de capturar actas.",
    };
  }

  async listarCatalogo(
    dignidad: DignidadActa,
  ): Promise<OrganizacionConCandidato[]> {
    const catalogo = await this.precargarCatalogos();
    return catalogo[dignidad];
  }

  async guardarActaOffline(acta: ActaOffline): Promise<void> {
    const database = await inicializarBaseLocal();
    const duplicada = await database.getFirstAsync<{
      acta_id: string;
      estado: string;
    }>(
      `SELECT acta_id, estado
       FROM sync_queue
       WHERE mesa_id = ? AND dignidad = ?
       LIMIT 1`,
      acta.p_mesa_id,
      acta.p_dignidad,
    );
    if (
      duplicada &&
      (!acta.modo_recaptura ||
        duplicada.acta_id !== acta.p_acta_id ||
        duplicada.estado !== "enviada")
    ) {
      throw new Error(
        "Ya existe un acta guardada para esta mesa y dignidad. Revisa su estado en Mis mesas.",
      );
    }

    const remota = await database.getFirstAsync<{
      id: string;
      estado_revision: string;
    }>(
      `SELECT id, estado_revision
       FROM actas_remotas
       WHERE mesa_id = ? AND dignidad = ?
       LIMIT 1`,
      acta.p_mesa_id,
      acta.p_dignidad,
    );
    if (
      acta.modo_recaptura
        ? !remota ||
          remota.id !== acta.p_acta_id ||
          remota.estado_revision !== "rechazada"
        : Boolean(remota)
    ) {
      throw new Error(
        acta.modo_recaptura
          ? "Solo puedes recapturar el acta rechazada que aparece en Mis mesas."
          : "Esta acta ya fue enviada al servidor y no se puede volver a registrar.",
      );
    }

    await encolarActaOffline(acta);
  }

  private async guardarCatalogoLocal(
    organizaciones: OrganizacionFila[],
    candidatos: CandidatoFila[],
  ): Promise<void> {
    const database = await inicializarBaseLocal();
    await database.withTransactionAsync(async () => {
      await database.runAsync("DELETE FROM candidatos");
      await database.runAsync("DELETE FROM organizaciones");

      for (const organizacion of organizaciones) {
        await database.runAsync(
          `INSERT INTO organizaciones (id, sigla, nombre, color_hex, orden)
           VALUES (?, ?, ?, ?, ?)`,
          organizacion.id,
          organizacion.sigla,
          organizacion.nombre,
          organizacion.color_hex,
          organizacion.orden,
        );
      }

      for (const candidato of candidatos) {
        await database.runAsync(
          `INSERT INTO candidatos (id, organizacion_id, dignidad, nombre)
           VALUES (?, ?, ?, ?)`,
          candidato.id,
          candidato.organizacion_id,
          candidato.dignidad,
          candidato.nombre,
        );
      }
    });
  }

  private async leerCatalogoLocal(): Promise<CatalogoPorDignidad> {
    const database = await inicializarBaseLocal();
    const leerPorDignidad = (dignidad: DignidadActa) =>
      database.getAllAsync<OrganizacionConCandidato>(
        `SELECT o.id, o.sigla, o.nombre, o.color_hex, o.orden, c.nombre AS candidato
         FROM organizaciones AS o
         JOIN candidatos AS c ON c.organizacion_id = o.id
         WHERE c.dignidad = ?
         ORDER BY o.orden`,
        dignidad,
      );
    const [alcaldia, prefectura] = await Promise.all([
      leerPorDignidad("alcaldia"),
      leerPorDignidad("prefectura"),
    ]);

    if (alcaldia.length !== 5 || prefectura.length !== 5) {
      return { alcaldia: [], prefectura: [] };
    }

    return { alcaldia, prefectura };
  }
}
