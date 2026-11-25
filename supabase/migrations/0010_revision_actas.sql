ALTER TABLE public.actas
  ADD COLUMN estado_revision text NOT NULL DEFAULT 'pendiente_revision'
    CHECK (
      estado_revision IN (
        'pendiente_revision',
        'validada',
        'observada',
        'rechazada'
      )
    ),
  ADD COLUMN motivo_revision text,
  ADD COLUMN revisada_por uuid REFERENCES public.perfiles (id),
  ADD COLUMN revisada_en timestamptz,
  ADD CONSTRAINT actas_revision_motivo_consistente CHECK (
    (estado_revision IN ('observada', 'rechazada')
      AND motivo_revision IS NOT NULL AND btrim(motivo_revision) <> '')
    OR (estado_revision IN ('pendiente_revision', 'validada')
      AND motivo_revision IS NULL)
  ),
  ADD CONSTRAINT actas_revision_responsable_consistente CHECK (
    (estado_revision = 'pendiente_revision'
      AND revisada_por IS NULL AND revisada_en IS NULL)
    OR (estado_revision <> 'pendiente_revision'
      AND revisada_por IS NOT NULL AND revisada_en IS NOT NULL)
  );

CREATE TABLE public.historial_revision_actas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  acta_id uuid NOT NULL REFERENCES public.actas (id) ON DELETE RESTRICT,
  estado_revision text NOT NULL CHECK (
    estado_revision IN (
      'pendiente_revision',
      'validada',
      'observada',
      'rechazada'
    )
  ),
  motivo text,
  actor_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE RESTRICT,
  actor_cedula text NOT NULL,
  registrada_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (estado_revision IN ('observada', 'rechazada')
      AND motivo IS NOT NULL AND btrim(motivo) <> '')
    OR (estado_revision IN ('pendiente_revision', 'validada')
      AND motivo IS NULL)
  )
);

CREATE INDEX historial_revision_actas_acta_idx
  ON public.historial_revision_actas (acta_id, id);

CREATE OR REPLACE FUNCTION public.registrar_historial_revision_acta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_cedula text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesion autenticada para registrar la revision'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT p.cedula
    INTO v_actor_cedula
  FROM public.perfiles AS p
  WHERE p.id = v_actor_id;

  IF v_actor_cedula IS NULL THEN
    RAISE EXCEPTION 'No existe el perfil del autor de la revision'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  INSERT INTO public.historial_revision_actas (
    acta_id,
    estado_revision,
    motivo,
    actor_id,
    actor_cedula
  )
  VALUES (
    NEW.id,
    NEW.estado_revision,
    NEW.motivo_revision,
    v_actor_id,
    v_actor_cedula
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER actas_historial_revision_insercion
  AFTER INSERT ON public.actas
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historial_revision_acta();

CREATE TRIGGER actas_historial_revision_cambio
  AFTER UPDATE OF estado_revision ON public.actas
  FOR EACH ROW
  WHEN (OLD.estado_revision IS DISTINCT FROM NEW.estado_revision)
  EXECUTE FUNCTION public.registrar_historial_revision_acta();

CREATE OR REPLACE FUNCTION public.bloquear_cambio_historial_revision_actas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'El historial de revisiones es inmutable'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER historial_revision_actas_inmutable
  BEFORE UPDATE OR DELETE ON public.historial_revision_actas
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_cambio_historial_revision_actas();

CREATE TRIGGER historial_revision_actas_no_truncar
  BEFORE TRUNCATE ON public.historial_revision_actas
  FOR EACH STATEMENT EXECUTE FUNCTION public.bloquear_cambio_historial_revision_actas();

ALTER TABLE public.historial_revision_actas ENABLE ROW LEVEL SECURITY;

CREATE POLICY historial_revision_actas_select_por_acta
  ON public.historial_revision_actas
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_acta(acta_id));

REVOKE ALL ON TABLE public.historial_revision_actas
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.historial_revision_actas TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_historial_revision_acta()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bloquear_cambio_historial_revision_actas()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.revisar_acta(
  p_acta_id uuid,
  p_estado_revision text,
  p_motivo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_mesa_id uuid;
  v_estado_actual text;
  v_motivo text := NULLIF(btrim(p_motivo), '');
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesion autenticada'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_estado_revision NOT IN ('validada', 'observada', 'rechazada') THEN
    RAISE EXCEPTION 'La decision de revision no es valida'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_estado_revision IN ('observada', 'rechazada')
    AND v_motivo IS NULL
  THEN
    RAISE EXCEPTION 'Escribe el motivo de la observacion o rechazo'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT a.mesa_id, a.estado_revision
    INTO v_mesa_id, v_estado_actual
  FROM public.actas AS a
  WHERE a.id = p_acta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el acta solicitada'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT public.rls_puede_gestionar_mesa(v_mesa_id) THEN
    RAISE EXCEPTION 'Solo el coordinador asignado al recinto puede revisar esta acta'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_estado_actual <> 'pendiente_revision' THEN
    RAISE EXCEPTION 'Solo se pueden revisar actas pendientes de revision'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.actas
  SET estado_revision = p_estado_revision,
      motivo_revision = CASE
        WHEN p_estado_revision IN ('observada', 'rechazada') THEN v_motivo
        ELSE NULL
      END,
      revisada_por = v_actor_id,
      revisada_en = clock_timestamp()
  WHERE id = p_acta_id;

  RETURN p_acta_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recapturar_acta_rechazada(
  p_acta_id uuid,
  p_total_sufragantes integer,
  p_votos_nulos integer,
  p_votos_blancos integer,
  p_votos jsonb,
  p_evidencia jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_mesa_id uuid;
  v_estado_actual text;
  v_latitud double precision;
  v_longitud double precision;
  v_latitud_recinto double precision;
  v_longitud_recinto double precision;
  v_margen integer;
  v_delta_latitud double precision;
  v_delta_longitud double precision;
  v_haversine double precision;
  v_distancia double precision;
  v_ruta_foto text;
  v_filas_actualizadas bigint;
  v_cantidad_organizaciones bigint;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesion autenticada'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = v_actor_id
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Debe confirmar su correo antes de recapturar actas'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT a.mesa_id, a.estado_revision
    INTO v_mesa_id, v_estado_actual
  FROM public.actas AS a
  WHERE a.id = p_acta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el acta solicitada'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    JOIN public.asignaciones_veedor AS av ON av.veedor_id = p.id
    WHERE p.id = v_actor_id
      AND p.rol = 'veedor'
      AND av.mesa_id = v_mesa_id
      AND av.finalizado_en IS NULL
    FOR SHARE OF av
  ) THEN
    RAISE EXCEPTION 'El veedor no tiene una asignacion activa para esta mesa'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM public.validar_lista_votos(p_votos);
  PERFORM public.validar_evidencia_json(p_evidencia);

  SELECT e.latitud, e.longitud, e.ruta_foto
    INTO v_latitud, v_longitud, v_ruta_foto
  FROM jsonb_to_record(p_evidencia) AS e(
    latitud double precision,
    longitud double precision,
    ruta_foto text
  );

  IF v_ruta_foto !~ (
    '^' || v_mesa_id::text || '/' || p_acta_id::text || '/[^/]+$'
  ) THEN
    RAISE EXCEPTION 'La foto debe quedar en la carpeta privada de esta acta'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_estado_actual = 'pendiente_revision' AND EXISTS (
    SELECT 1
    FROM public.actas AS a
    WHERE a.id = p_acta_id
      AND a.total_sufragantes = p_total_sufragantes
      AND a.votos_nulos = p_votos_nulos
      AND a.votos_blancos = p_votos_blancos
      AND (
        SELECT count(*)
        FROM public.votos_por_organizacion AS guardados
        WHERE guardados.acta_id = p_acta_id
      ) = 5
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_votos)
          AS enviados(organizacion_id uuid, votos integer)
        LEFT JOIN public.votos_por_organizacion AS guardados
          ON guardados.acta_id = p_acta_id
         AND guardados.organizacion_id = enviados.organizacion_id
        WHERE guardados.acta_id IS NULL
          OR guardados.votos IS DISTINCT FROM enviados.votos
      )
      AND EXISTS (
        SELECT 1
        FROM jsonb_to_record(p_evidencia) AS enviada(
          ruta_foto text,
          latitud double precision,
          longitud double precision,
          precision_m double precision,
          capturada_en timestamptz
        )
        JOIN public.evidencias AS guardada
          ON guardada.acta_id = p_acta_id
         AND guardada.ruta_foto = enviada.ruta_foto
         AND guardada.latitud IS NOT DISTINCT FROM enviada.latitud
         AND guardada.longitud IS NOT DISTINCT FROM enviada.longitud
         AND guardada.precision_m IS NOT DISTINCT FROM enviada.precision_m
         AND guardada.capturada_en IS NOT DISTINCT FROM enviada.capturada_en
      )
  ) THEN
    RETURN p_acta_id;
  END IF;

  IF v_estado_actual <> 'rechazada' THEN
    RAISE EXCEPTION 'Solo se puede recapturar un acta rechazada'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.evidencias AS e
    WHERE e.acta_id = p_acta_id
      AND e.ruta_foto = v_ruta_foto
  ) THEN
    RAISE EXCEPTION 'La recaptura debe usar una ruta de fotografia nueva para esta acta'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT r.latitud, r.longitud, c.margen_ubicacion_m
    INTO v_latitud_recinto, v_longitud_recinto, v_margen
  FROM public.mesas AS m
  JOIN public.recintos AS r ON r.id = m.recinto_id
  CROSS JOIN public.configuracion AS c
  WHERE m.id = v_mesa_id
    AND c.unica;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe la mesa o la configuracion de ubicacion'
      USING ERRCODE = 'check_violation';
  END IF;

  v_delta_latitud := radians(v_latitud - v_latitud_recinto);
  v_delta_longitud := radians(v_longitud - v_longitud_recinto);
  v_haversine :=
    power(sin(v_delta_latitud / 2.0), 2)
    + cos(radians(v_latitud)) * cos(radians(v_latitud_recinto))
      * power(sin(v_delta_longitud / 2.0), 2);
  v_distancia :=
    2.0::double precision * 6371008.8::double precision
    * asin(sqrt(least(
        1.0::double precision,
        greatest(0.0::double precision, v_haversine)
      )));

  UPDATE public.actas
  SET total_sufragantes = p_total_sufragantes,
      votos_nulos = p_votos_nulos,
      votos_blancos = p_votos_blancos,
      distancia_recinto_m = v_distancia,
      fuera_margen = v_distancia > v_margen,
      estado_revision = 'pendiente_revision',
      motivo_revision = NULL,
      revisada_por = NULL,
      revisada_en = NULL
  WHERE id = p_acta_id;

  UPDATE public.votos_por_organizacion AS actual
  SET votos = nuevos.votos
  FROM jsonb_to_recordset(p_votos)
    AS nuevos(organizacion_id uuid, votos integer)
  WHERE actual.acta_id = p_acta_id
    AND actual.organizacion_id = nuevos.organizacion_id;

  GET DIAGNOSTICS v_filas_actualizadas = ROW_COUNT;
  SELECT count(*) INTO v_cantidad_organizaciones
  FROM public.organizaciones;
  IF v_filas_actualizadas <> v_cantidad_organizaciones THEN
    RAISE EXCEPTION 'No se actualizaron los votos de todas las organizaciones'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM public.insertar_evidencia_acta(p_acta_id, p_evidencia);
  RETURN p_acta_id;
END;
$$;

REVOKE ALL ON FUNCTION public.revisar_acta(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_acta(uuid, text, text)
  TO authenticated;

REVOKE ALL ON FUNCTION public.recapturar_acta_rechazada(
  uuid, integer, integer, integer, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recapturar_acta_rechazada(
  uuid, integer, integer, integer, jsonb, jsonb
) TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_historial_revision_acta()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.vw_actas_revision
WITH (security_invoker = true)
AS
SELECT
  a.id AS acta_id,
  a.mesa_id,
  m.numero AS mesa_numero,
  a.dignidad,
  a.estado_revision,
  a.motivo_revision,
  a.total_sufragantes,
  a.votos_nulos,
  a.votos_blancos,
  a.capturada_en,
  a.recibida_en,
  a.distancia_recinto_m,
  a.fuera_margen,
  r.id AS recinto_id,
  r.nombre AS recinto,
  r.provincia_id,
  r.coordinador_id,
  pa.id AS parroquia_id,
  pa.nombre AS parroquia,
  a.creada_por AS veedor_id,
  p.nombres AS veedor_nombres,
  p.apellidos AS veedor_apellidos,
  e.ruta_foto,
  e.latitud AS evidencia_latitud,
  e.longitud AS evidencia_longitud,
  e.precision_m AS evidencia_precision_m,
  e.capturada_en AS evidencia_capturada_en
FROM public.actas AS a
JOIN public.mesas AS m ON m.id = a.mesa_id
JOIN public.recintos AS r ON r.id = m.recinto_id
JOIN public.parroquias AS pa ON pa.id = r.parroquia_id
LEFT JOIN public.perfiles AS p ON p.id = a.creada_por
LEFT JOIN LATERAL (
  SELECT ev.ruta_foto, ev.latitud, ev.longitud, ev.precision_m, ev.capturada_en
  FROM public.evidencias AS ev
  WHERE ev.acta_id = a.id
  ORDER BY ev.recibida_en DESC, ev.id DESC
  LIMIT 1
) AS e ON true;

CREATE OR REPLACE VIEW public.vw_detalle_votos_revision
WITH (security_invoker = true)
AS
SELECT
  v.acta_id,
  v.organizacion_id,
  c.id AS candidato_id,
  o.sigla AS organizacion_sigla,
  o.nombre AS organizacion,
  o.color_hex,
  o.orden AS organizacion_orden,
  c.nombre AS candidato,
  v.votos
FROM public.votos_por_organizacion AS v
JOIN public.organizaciones AS o ON o.id = v.organizacion_id
JOIN public.actas AS a ON a.id = v.acta_id
JOIN public.candidatos AS c
  ON c.organizacion_id = o.id
 AND c.dignidad = a.dignidad;

CREATE OR REPLACE VIEW public.vw_avance_revision_recintos
WITH (security_invoker = true)
AS
WITH actas_por_mesa AS (
  SELECT
    r.provincia_id,
    r.id AS recinto_id,
    r.nombre AS recinto,
    pa.id AS parroquia_id,
    pa.nombre AS parroquia,
    m.id AS mesa_id,
    count(a.id)::bigint AS actas_recibidas,
    count(a.id) FILTER (
      WHERE a.estado_revision = 'validada'
    )::bigint AS actas_validadas,
    count(a.id) FILTER (
      WHERE a.fuera_margen
    )::bigint AS alertas_geovalla,
    count(a.id) FILTER (
      WHERE a.estado_revision = 'rechazada'
    )::bigint AS actas_rechazadas
  FROM public.recintos AS r
  JOIN public.parroquias AS pa ON pa.id = r.parroquia_id
  JOIN public.mesas AS m ON m.recinto_id = r.id
  CROSS JOIN (
    VALUES ('alcaldia'::text), ('prefectura'::text)
  ) AS dignidades(dignidad)
  LEFT JOIN public.actas AS a
    ON a.mesa_id = m.id
   AND a.dignidad = dignidades.dignidad
  GROUP BY r.provincia_id, r.id, r.nombre, pa.id, pa.nombre, m.id
)
SELECT
  provincia_id,
  recinto_id,
  recinto,
  parroquia_id,
  parroquia,
  count(*)::bigint AS mesas_esperadas,
  count(*) FILTER (WHERE actas_recibidas = 2)::bigint AS mesas_reportadas,
  count(*) FILTER (WHERE actas_validadas = 2)::bigint AS mesas_validadas,
  (count(*) * 2)::bigint AS actas_esperadas,
  sum(actas_recibidas)::bigint AS actas_recibidas,
  sum(actas_validadas)::bigint AS actas_validadas,
  sum(alertas_geovalla)::bigint AS alertas_geovalla,
  sum(actas_rechazadas)::bigint AS actas_rechazadas
FROM actas_por_mesa
GROUP BY provincia_id, recinto_id, recinto, parroquia_id, parroquia;

CREATE OR REPLACE VIEW public.vw_historial_revision_actas
WITH (security_invoker = true)
AS
SELECT
  h.id,
  h.acta_id,
  h.estado_revision,
  h.motivo,
  h.actor_cedula,
  p.nombres AS actor_nombres,
  p.apellidos AS actor_apellidos,
  h.registrada_en
FROM public.historial_revision_actas AS h
JOIN public.perfiles AS p ON p.id = h.actor_id;

REVOKE ALL ON TABLE
  public.vw_actas_revision,
  public.vw_detalle_votos_revision,
  public.vw_avance_revision_recintos,
  public.vw_historial_revision_actas
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE
  public.vw_actas_revision,
  public.vw_detalle_votos_revision,
  public.vw_avance_revision_recintos,
  public.vw_historial_revision_actas
TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'actas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.actas;
  END IF;
END;
$$;
