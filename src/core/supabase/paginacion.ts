const TAMANO_PAGINA = 500;

type RespuestaPagina<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function cargarTodasLasFilas<T>(
  consultarPagina: (
    desde: number,
    hasta: number,
  ) => Promise<RespuestaPagina<T>>,
  mensajeError: string,
): Promise<T[]> {
  const filas: T[] = [];

  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await consultarPagina(
      desde,
      desde + TAMANO_PAGINA - 1,
    );
    if (error) {
      throw new Error(`${mensajeError} ${error.message}`);
    }
    if (!data) {
      throw new Error(mensajeError);
    }

    filas.push(...data);
    if (data.length < TAMANO_PAGINA) {
      return filas;
    }
  }
}
