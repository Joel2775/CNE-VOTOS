export type ResultadoSincronizacion = {
  sincronizadas: string[];
  errores: { acta_id: string; mensaje: string }[];
};
