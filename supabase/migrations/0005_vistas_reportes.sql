CREATE OR REPLACE VIEW public.vw_progreso_mesas
WITH (security_invoker = true)
AS
SELECT
  pr.id AS provincia_id,
  pr.nombre AS provincia,
  ca.id AS canton_id,
  ca.nombre AS canton,
  pa.id AS parroquia_id,
  pa.nombre AS parroquia,
  r.id AS recinto_id,
  r.nombre AS recinto,
  m.id AS mesa_id,
  m.numero AS mesa_numero,
  d.dignidad,
  a.id IS NOT NULL AS acta_registrada,
  a.id IS NULL AS pendiente,
  a.distancia_recinto_m,
  a.fuera_margen
FROM public.mesas AS m
JOIN public.recintos AS r ON r.id = m.recinto_id
JOIN public.parroquias AS pa
  ON pa.id = r.parroquia_id
 AND pa.provincia_id = r.provincia_id
 AND pa.canton_id = r.canton_id
JOIN public.cantones AS ca
  ON ca.id = r.canton_id
 AND ca.provincia_id = r.provincia_id
JOIN public.provincias AS pr ON pr.id = r.provincia_id
CROSS JOIN (
  VALUES ('alcaldia'::text), ('prefectura'::text)
) AS d(dignidad)
LEFT JOIN public.actas AS a
  ON a.mesa_id = m.id
 AND a.dignidad = d.dignidad
WHERE EXISTS (
  SELECT 1
  FROM public.perfiles AS usuario
  WHERE usuario.id = auth.uid()
    AND usuario.rol IN ('coordinador_provincial', 'coordinador_recinto')
);

CREATE OR REPLACE VIEW public.vw_resultados_preliminares
WITH (security_invoker = true)
AS
WITH votos_por_acta AS (
  SELECT
    v.acta_id,
    SUM(v.votos)::bigint AS total_votos_validos
  FROM public.votos_por_organizacion AS v
  GROUP BY v.acta_id
),
actas_base AS (
  SELECT
    pr.id AS provincia_id,
    pr.nombre AS provincia,
    ca.id AS canton_id,
    ca.nombre AS canton,
    pa.id AS parroquia_id,
    pa.nombre AS parroquia,
    r.id AS recinto_id,
    r.nombre AS recinto,
    a.id AS acta_id,
    a.dignidad,
    a.votos_blancos,
    a.votos_nulos,
    a.total_sufragantes,
    COALESCE(vpa.total_votos_validos, 0)::bigint
      AS total_votos_validos_acta
  FROM public.actas AS a
  JOIN public.mesas AS m ON m.id = a.mesa_id
  JOIN public.recintos AS r ON r.id = m.recinto_id
  JOIN public.parroquias AS pa
    ON pa.id = r.parroquia_id
   AND pa.provincia_id = r.provincia_id
   AND pa.canton_id = r.canton_id
  JOIN public.cantones AS ca
    ON ca.id = r.canton_id
   AND ca.provincia_id = r.provincia_id
  JOIN public.provincias AS pr ON pr.id = r.provincia_id
  LEFT JOIN votos_por_acta AS vpa ON vpa.acta_id = a.id
  WHERE EXISTS (
    SELECT 1
    FROM public.perfiles AS usuario
    WHERE usuario.id = auth.uid()
      AND usuario.rol IN ('coordinador_provincial', 'coordinador_recinto')
  )
),
base_votos AS (
  SELECT
    b.provincia_id,
    b.provincia,
    b.canton_id,
    b.canton,
    b.parroquia_id,
    b.parroquia,
    b.recinto_id,
    b.recinto,
    b.dignidad,
    o.id AS organizacion_id,
    o.sigla AS organizacion_sigla,
    o.nombre AS organizacion,
    caa.id AS candidato_id,
    caa.nombre AS candidato,
    v.votos
  FROM actas_base AS b
  JOIN public.votos_por_organizacion AS v ON v.acta_id = b.acta_id
  JOIN public.organizaciones AS o ON o.id = v.organizacion_id
  JOIN public.candidatos AS caa
    ON caa.organizacion_id = o.id
   AND caa.dignidad = b.dignidad
),
votos_agregados AS (
  SELECT
    CASE
      WHEN GROUPING(b.recinto_id) = 0 THEN 'recinto'
      WHEN GROUPING(b.parroquia_id) = 0 THEN 'parroquia'
      WHEN GROUPING(b.canton_id) = 0 THEN 'canton'
      ELSE 'provincia'
    END AS nivel_territorial,
    b.provincia_id,
    b.provincia,
    b.canton_id,
    b.canton,
    b.parroquia_id,
    b.parroquia,
    b.recinto_id,
    b.recinto,
    b.dignidad,
    b.organizacion_id,
    b.organizacion_sigla,
    b.organizacion,
    b.candidato_id,
    b.candidato,
    SUM(b.votos)::bigint AS votos_validos_organizacion
  FROM base_votos AS b
  GROUP BY GROUPING SETS (
    (
      b.provincia_id, b.provincia, b.dignidad,
      b.organizacion_id, b.organizacion_sigla, b.organizacion,
      b.candidato_id, b.candidato
    ),
    (
      b.provincia_id, b.provincia,
      b.canton_id, b.canton, b.dignidad,
      b.organizacion_id, b.organizacion_sigla, b.organizacion,
      b.candidato_id, b.candidato
    ),
    (
      b.provincia_id, b.provincia,
      b.canton_id, b.canton,
      b.parroquia_id, b.parroquia, b.dignidad,
      b.organizacion_id, b.organizacion_sigla, b.organizacion,
      b.candidato_id, b.candidato
    ),
    (
      b.provincia_id, b.provincia,
      b.canton_id, b.canton,
      b.parroquia_id, b.parroquia,
      b.recinto_id, b.recinto, b.dignidad,
      b.organizacion_id, b.organizacion_sigla, b.organizacion,
      b.candidato_id, b.candidato
    )
  )
),
totales_agregados AS (
  SELECT
    CASE
      WHEN GROUPING(b.recinto_id) = 0 THEN 'recinto'
      WHEN GROUPING(b.parroquia_id) = 0 THEN 'parroquia'
      WHEN GROUPING(b.canton_id) = 0 THEN 'canton'
      ELSE 'provincia'
    END AS nivel_territorial,
    b.provincia_id,
    b.provincia,
    b.canton_id,
    b.canton,
    b.parroquia_id,
    b.parroquia,
    b.recinto_id,
    b.recinto,
    b.dignidad,
    SUM(b.total_votos_validos_acta)::bigint AS total_votos_validos,
    SUM(b.votos_blancos)::bigint AS votos_blancos,
    SUM(b.votos_nulos)::bigint AS votos_nulos,
    SUM(b.total_sufragantes)::bigint AS total_sufragantes
  FROM actas_base AS b
  GROUP BY GROUPING SETS (
    (b.provincia_id, b.provincia, b.dignidad),
    (
      b.provincia_id, b.provincia,
      b.canton_id, b.canton, b.dignidad
    ),
    (
      b.provincia_id, b.provincia,
      b.canton_id, b.canton,
      b.parroquia_id, b.parroquia, b.dignidad
    ),
    (
      b.provincia_id, b.provincia,
      b.canton_id, b.canton,
      b.parroquia_id, b.parroquia,
      b.recinto_id, b.recinto, b.dignidad
    )
  )
)
SELECT
  v.nivel_territorial,
  v.provincia_id,
  v.provincia,
  v.canton_id,
  v.canton,
  v.parroquia_id,
  v.parroquia,
  v.recinto_id,
  v.recinto,
  v.dignidad,
  v.organizacion_id,
  v.organizacion_sigla,
  v.organizacion,
  v.candidato_id,
  v.candidato,
  v.votos_validos_organizacion,
  t.total_votos_validos,
  t.votos_blancos,
  t.votos_nulos,
  t.total_sufragantes,
  ROUND(
    100.0 * v.votos_validos_organizacion::numeric
      / NULLIF(t.total_votos_validos, 0),
    2
  ) AS porcentaje_votos_validos,
  ROUND(
    100.0 * v.votos_validos_organizacion::numeric
      / NULLIF(t.total_sufragantes, 0),
    2
  ) AS porcentaje_sufragantes
FROM votos_agregados AS v
JOIN totales_agregados AS t
  ON t.nivel_territorial = v.nivel_territorial
 AND t.provincia_id = v.provincia_id
 AND t.canton_id IS NOT DISTINCT FROM v.canton_id
 AND t.parroquia_id IS NOT DISTINCT FROM v.parroquia_id
 AND t.recinto_id IS NOT DISTINCT FROM v.recinto_id
 AND t.dignidad = v.dignidad;

CREATE OR REPLACE VIEW public.vw_exportacion_actas
WITH (security_invoker = true)
AS
WITH votos_por_acta AS (
  SELECT
    v.acta_id,
    MAX(v.votos) FILTER (WHERE o.sigla = 'MFC') AS votos_mfc,
    MAX(v.votos) FILTER (WHERE o.sigla = 'ARP') AS votos_arp,
    MAX(v.votos) FILTER (WHERE o.sigla = 'MUC') AS votos_muc,
    MAX(v.votos) FILTER (WHERE o.sigla = 'FDP') AS votos_fdp,
    MAX(v.votos) FILTER (WHERE o.sigla = 'MNE') AS votos_mne
  FROM public.votos_por_organizacion AS v
  JOIN public.organizaciones AS o ON o.id = v.organizacion_id
  GROUP BY v.acta_id
)
SELECT
  pr.id AS provincia_id,
  pr.nombre AS provincia,
  ca.id AS canton_id,
  ca.nombre AS canton,
  pa.id AS parroquia_id,
  pa.nombre AS parroquia,
  r.id AS recinto_id,
  r.nombre AS recinto,
  m.id AS mesa_id,
  m.numero AS mesa_numero,
  a.id AS acta_id,
  a.dignidad,
  a.total_sufragantes,
  a.votos_blancos,
  a.votos_nulos,
  va.votos_mfc,
  va.votos_arp,
  va.votos_muc,
  va.votos_fdp,
  va.votos_mne,
  p.nombres AS veedor_nombres,
  p.apellidos AS veedor_apellidos,
  p.cedula AS veedor_cedula,
  a.capturada_en,
  a.recibida_en,
  a.distancia_recinto_m,
  a.fuera_margen,
  e.id AS evidencia_id,
  e.ruta_foto AS ruta_foto_evidencia,
  e.latitud AS evidencia_latitud,
  e.longitud AS evidencia_longitud,
  e.precision_m AS evidencia_precision_m,
  e.capturada_en AS evidencia_capturada_en,
  e.recibida_en AS evidencia_recibida_en
FROM public.actas AS a
JOIN public.mesas AS m ON m.id = a.mesa_id
JOIN public.recintos AS r ON r.id = m.recinto_id
JOIN public.parroquias AS pa
  ON pa.id = r.parroquia_id
 AND pa.provincia_id = r.provincia_id
 AND pa.canton_id = r.canton_id
JOIN public.cantones AS ca
  ON ca.id = r.canton_id
 AND ca.provincia_id = r.provincia_id
JOIN public.provincias AS pr ON pr.id = r.provincia_id
LEFT JOIN public.perfiles AS p ON p.id = a.creada_por
LEFT JOIN votos_por_acta AS va ON va.acta_id = a.id
LEFT JOIN public.evidencias AS e ON e.acta_id = a.id
WHERE EXISTS (
  SELECT 1
  FROM public.perfiles AS usuario
  WHERE usuario.id = auth.uid()
    AND usuario.rol IN ('coordinador_provincial', 'coordinador_recinto')
);

REVOKE ALL ON TABLE
  public.vw_progreso_mesas,
  public.vw_resultados_preliminares,
  public.vw_exportacion_actas
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.vw_progreso_mesas,
  public.vw_resultados_preliminares,
  public.vw_exportacion_actas
TO authenticated;
