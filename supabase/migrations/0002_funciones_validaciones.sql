CREATE OR REPLACE FUNCTION public.validar_catalogo_organizaciones_s02()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total bigint;
  v_esperadas bigint;
BEGIN
  SELECT count(*) INTO v_total
  FROM public.organizaciones;

  SELECT count(*) INTO v_esperadas
  FROM (
    VALUES
      ('MFC', 'Movimiento Futuro Ciudadano', '#1769AA', 1::smallint),
      ('ARP', 'Alianza Renovación Popular', '#169B62', 2::smallint),
      ('MUC', 'Movimiento Unidos por el Cambio', '#E87932', 3::smallint),
      ('FDP', 'Frente Democrático Progreso', '#8054B8', 4::smallint),
      ('MNE', 'Movimiento Nueva Esperanza', '#D84A52', 5::smallint)
  ) AS esperada(sigla, nombre, color_hex, orden)
  JOIN public.organizaciones AS o
    ON o.sigla = esperada.sigla
   AND o.nombre = esperada.nombre
   AND o.color_hex = esperada.color_hex
   AND o.orden = esperada.orden;

  IF v_total <> 5 OR v_esperadas <> 5 THEN
    RAISE EXCEPTION 'El catalogo debe contener exactamente las cinco organizaciones de S-02'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_lista_votos(p_votos jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_organizaciones bigint;
  v_filas bigint;
  v_organizaciones_distintas bigint;
BEGIN
  IF jsonb_typeof(p_votos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Los votos deben enviarse como un arreglo JSON'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM public.validar_catalogo_organizaciones_s02();

  SELECT count(*) INTO v_organizaciones
  FROM public.organizaciones;

  SELECT count(*), count(DISTINCT v.organizacion_id)
    INTO v_filas, v_organizaciones_distintas
  FROM jsonb_to_recordset(p_votos)
    AS v(organizacion_id uuid, votos integer);

  IF v_filas <> v_organizaciones
    OR v_organizaciones_distintas <> v_filas
  THEN
    RAISE EXCEPTION 'Debe enviarse exactamente una fila por organizacion'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_votos)
      AS v(organizacion_id uuid, votos integer)
    LEFT JOIN public.organizaciones AS o ON o.id = v.organizacion_id
    WHERE o.id IS NULL OR v.votos IS NULL OR v.votos < 0
  ) THEN
    RAISE EXCEPTION 'Hay una organizacion desconocida o un valor de votos invalido'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_evidencia_json(p_evidencia jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ruta_foto text;
  v_latitud double precision;
  v_longitud double precision;
  v_precision_m double precision;
  v_capturada_en timestamptz;
BEGIN
  IF jsonb_typeof(p_evidencia) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'La evidencia debe enviarse como un objeto JSON'
      USING ERRCODE = 'check_violation';
  END IF;

  IF jsonb_typeof(p_evidencia -> 'ruta_foto') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_evidencia -> 'latitud') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_evidencia -> 'longitud') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_evidencia -> 'precision_m') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_evidencia -> 'capturada_en') IS DISTINCT FROM 'string'
  THEN
    RAISE EXCEPTION 'La evidencia debe incluir ruta, coordenadas, precision y fecha con sus tipos correctos'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT e.ruta_foto,
         e.latitud,
         e.longitud,
         e.precision_m,
         e.capturada_en
    INTO v_ruta_foto,
         v_latitud,
         v_longitud,
         v_precision_m,
         v_capturada_en
  FROM jsonb_to_record(p_evidencia) AS e(
    ruta_foto text,
    latitud double precision,
    longitud double precision,
    precision_m double precision,
    capturada_en timestamptz
  );

  IF v_ruta_foto IS NULL OR btrim(v_ruta_foto) = ''
    OR v_latitud IS NULL OR v_latitud NOT BETWEEN -90 AND 90
    OR v_longitud IS NULL OR v_longitud NOT BETWEEN -180 AND 180
    OR v_precision_m IS NULL
    OR v_precision_m < 0
    OR v_precision_m >= 'Infinity'::double precision
    OR v_capturada_en IS NULL
    OR NOT pg_catalog.isfinite(v_capturada_en)
  THEN
    RAISE EXCEPTION 'Los campos de evidencia no son validos'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.insertar_evidencia_acta(
  p_acta_id uuid,
  p_evidencia jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.validar_evidencia_json(p_evidencia);

  INSERT INTO public.evidencias (
    acta_id,
    ruta_foto,
    latitud,
    longitud,
    precision_m,
    capturada_en
  )
  SELECT p_acta_id,
         e.ruta_foto,
         e.latitud,
         e.longitud,
         e.precision_m,
         e.capturada_en
  FROM jsonb_to_record(p_evidencia) AS e(
    ruta_foto text,
    latitud double precision,
    longitud double precision,
    precision_m double precision,
    capturada_en timestamptz
  )
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.evidencias AS guardada
    WHERE guardada.acta_id = p_acta_id
      AND guardada.ruta_foto = e.ruta_foto
      AND guardada.latitud IS NOT DISTINCT FROM e.latitud
      AND guardada.longitud IS NOT DISTINCT FROM e.longitud
      AND guardada.precision_m IS NOT DISTINCT FROM e.precision_m
      AND guardada.capturada_en IS NOT DISTINCT FROM e.capturada_en
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_cedula_ecuatoriana(p_cedula text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provincia integer;
  v_digito integer;
  v_suma integer := 0;
  v_digito_verificador integer;
  v_indice integer;
BEGIN
  IF p_cedula IS NULL OR p_cedula !~ '^[0-9]{10}$' THEN
    RETURN false;
  END IF;

  v_provincia := substring(p_cedula FROM 1 FOR 2)::integer;
  IF v_provincia NOT BETWEEN 1 AND 24 THEN
    RETURN false;
  END IF;

  FOR v_indice IN 1..9 LOOP
    v_digito := substring(p_cedula FROM v_indice FOR 1)::integer;

    IF v_indice % 2 = 1 THEN
      v_digito := v_digito * 2;
      IF v_digito > 9 THEN
        v_digito := v_digito - 9;
      END IF;
    END IF;

    v_suma := v_suma + v_digito;
  END LOOP;

  v_digito_verificador := (10 - (v_suma % 10)) % 10;
  RETURN v_digito_verificador =
    substring(p_cedula FROM 10 FOR 1)::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_cedula_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.validar_cedula_ecuatoriana(NEW.cedula) THEN
    RAISE EXCEPTION 'La cedula no es valida segun el digito verificador modulo 10'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.acta_registro_coincide(
  p_acta_id uuid,
  p_mesa_id uuid,
  p_dignidad text,
  p_actor uuid,
  p_total_sufragantes integer,
  p_votos_nulos integer,
  p_votos_blancos integer,
  p_capturada_en timestamptz,
  p_votos jsonb,
  p_evidencia jsonb
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.actas AS a
    WHERE a.id = p_acta_id
      AND a.mesa_id = p_mesa_id
      AND a.dignidad = p_dignidad
      AND a.creada_por = p_actor
      AND a.total_sufragantes = p_total_sufragantes
      AND a.votos_nulos = p_votos_nulos
      AND a.votos_blancos = p_votos_blancos
      AND a.capturada_en = p_capturada_en
      AND (
        SELECT count(*)
        FROM public.votos_por_organizacion AS guardados
        WHERE guardados.acta_id = a.id
      ) = 5
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_votos)
          AS enviados(organizacion_id uuid, votos integer)
        LEFT JOIN public.votos_por_organizacion AS guardados
          ON guardados.acta_id = a.id
         AND guardados.organizacion_id = enviados.organizacion_id
        WHERE guardados.acta_id IS NULL
          OR guardados.votos IS DISTINCT FROM enviados.votos
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.votos_por_organizacion AS guardados
        LEFT JOIN jsonb_to_recordset(p_votos)
          AS enviados(organizacion_id uuid, votos integer)
          ON enviados.organizacion_id = guardados.organizacion_id
        WHERE guardados.acta_id = a.id
          AND enviados.organizacion_id IS NULL
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
          ON guardada.acta_id = a.id
         AND guardada.ruta_foto = enviada.ruta_foto
         AND guardada.latitud IS NOT DISTINCT FROM enviada.latitud
         AND guardada.longitud IS NOT DISTINCT FROM enviada.longitud
         AND guardada.precision_m IS NOT DISTINCT FROM enviada.precision_m
         AND guardada.capturada_en IS NOT DISTINCT FROM enviada.capturada_en
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.correccion_acta_coincide(
  p_acta_id uuid,
  p_total_sufragantes integer,
  p_votos_nulos integer,
  p_votos_blancos integer,
  p_votos jsonb,
  p_evidencia jsonb
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.actas AS a
    WHERE a.id = p_acta_id
      AND a.total_sufragantes = p_total_sufragantes
      AND a.votos_nulos = p_votos_nulos
      AND a.votos_blancos = p_votos_blancos
      AND (
        SELECT count(*)
        FROM public.votos_por_organizacion AS guardados
        WHERE guardados.acta_id = a.id
      ) = 5
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_votos)
          AS enviados(organizacion_id uuid, votos integer)
        LEFT JOIN public.votos_por_organizacion AS guardados
          ON guardados.acta_id = a.id
         AND guardados.organizacion_id = enviados.organizacion_id
        WHERE guardados.acta_id IS NULL
          OR guardados.votos IS DISTINCT FROM enviados.votos
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.votos_por_organizacion AS guardados
        LEFT JOIN jsonb_to_recordset(p_votos)
          AS enviados(organizacion_id uuid, votos integer)
          ON enviados.organizacion_id = guardados.organizacion_id
        WHERE guardados.acta_id = a.id
          AND enviados.organizacion_id IS NULL
      )
      AND (
        p_evidencia IS NULL
        OR EXISTS (
          SELECT 1
          FROM jsonb_to_record(p_evidencia) AS enviada(
            ruta_foto text,
            latitud double precision,
            longitud double precision,
            precision_m double precision,
            capturada_en timestamptz
          )
          JOIN public.evidencias AS guardada
            ON guardada.acta_id = a.id
           AND guardada.ruta_foto = enviada.ruta_foto
           AND guardada.latitud IS NOT DISTINCT FROM enviada.latitud
           AND guardada.longitud IS NOT DISTINCT FROM enviada.longitud
           AND guardada.precision_m IS NOT DISTINCT FROM enviada.precision_m
           AND guardada.capturada_en IS NOT DISTINCT FROM enviada.capturada_en
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.registrar_acta(
  p_acta_id uuid,
  p_mesa_id uuid,
  p_dignidad text,
  p_total_sufragantes integer,
  p_votos_nulos integer,
  p_votos_blancos integer,
  p_capturada_en timestamptz,
  p_votos jsonb,
  p_evidencia jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_margen integer;
  v_latitud double precision;
  v_longitud double precision;
  v_latitud_recinto double precision;
  v_longitud_recinto double precision;
  v_latitud_rad double precision;
  v_latitud_recinto_rad double precision;
  v_delta_latitud_rad double precision;
  v_delta_longitud_rad double precision;
  v_haversine double precision;
  v_distancia_recinto_m double precision;
  v_acta_insertada uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesion autenticada'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = v_actor
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Debe confirmar su correo antes de registrar actas'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM public.validar_lista_votos(p_votos);

  IF p_capturada_en IS NULL OR NOT pg_catalog.isfinite(p_capturada_en) THEN
    RAISE EXCEPTION 'Se requiere la fecha de captura del acta'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM public.validar_evidencia_json(p_evidencia);

  SELECT e.latitud,
         e.longitud
    INTO v_latitud,
         v_longitud
  FROM jsonb_to_record(p_evidencia) AS e(
    latitud double precision,
    longitud double precision
  );

  IF public.acta_registro_coincide(
    p_acta_id,
    p_mesa_id,
    p_dignidad,
    v_actor,
    p_total_sufragantes,
    p_votos_nulos,
    p_votos_blancos,
    p_capturada_en,
    p_votos,
    p_evidencia
  ) THEN
    RETURN p_acta_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.actas AS a WHERE a.id = p_acta_id
  ) THEN
    RAISE EXCEPTION 'El UUID ya existe para una operacion diferente'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.actas AS a
    WHERE a.mesa_id = p_mesa_id
      AND a.dignidad = p_dignidad
  ) THEN
    RAISE EXCEPTION 'Ya existe un acta para esta mesa y dignidad'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    JOIN public.asignaciones_veedor AS av ON av.veedor_id = p.id
    WHERE p.id = v_actor
      AND p.rol = 'veedor'
      AND av.mesa_id = p_mesa_id
      AND av.finalizado_en IS NULL
    FOR SHARE OF av
  ) THEN
    RAISE EXCEPTION 'El veedor no tiene una asignacion activa para esta mesa'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT r.latitud,
         r.longitud,
         c.margen_ubicacion_m
    INTO v_latitud_recinto,
         v_longitud_recinto,
         v_margen
  FROM public.mesas AS m
  JOIN public.recintos AS r ON r.id = m.recinto_id
  CROSS JOIN public.configuracion AS c
  WHERE m.id = p_mesa_id
    AND c.unica
  FOR SHARE OF r, c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe la mesa o la configuracion de ubicacion'
      USING ERRCODE = 'check_violation';
  END IF;

  v_latitud_rad := radians(v_latitud);
  v_latitud_recinto_rad := radians(v_latitud_recinto);
  v_delta_latitud_rad := radians(v_latitud - v_latitud_recinto);
  v_delta_longitud_rad := radians(v_longitud - v_longitud_recinto);
  v_haversine :=
    power(sin(v_delta_latitud_rad / 2.0), 2)
    + cos(v_latitud_rad) * cos(v_latitud_recinto_rad)
      * power(sin(v_delta_longitud_rad / 2.0), 2);
  v_distancia_recinto_m :=
    2.0::double precision * 6371008.8::double precision
    * asin(sqrt(least(
        1.0::double precision,
        greatest(0.0::double precision, v_haversine)
      )));

  BEGIN
    INSERT INTO public.actas (
      id,
      mesa_id,
      dignidad,
      creada_por,
      total_sufragantes,
      votos_nulos,
      votos_blancos,
      capturada_en,
      distancia_recinto_m,
      fuera_margen
    )
    VALUES (
      p_acta_id,
      p_mesa_id,
      p_dignidad,
      v_actor,
      p_total_sufragantes,
      p_votos_nulos,
      p_votos_blancos,
      p_capturada_en,
      v_distancia_recinto_m,
      v_distancia_recinto_m > v_margen
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_acta_insertada;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Ya existe un acta para esta mesa y dignidad'
        USING ERRCODE = 'unique_violation';
  END;

  IF v_acta_insertada IS NULL THEN
    IF public.acta_registro_coincide(
      p_acta_id,
      p_mesa_id,
      p_dignidad,
      v_actor,
      p_total_sufragantes,
      p_votos_nulos,
      p_votos_blancos,
      p_capturada_en,
      p_votos,
      p_evidencia
    ) THEN
      RETURN p_acta_id;
    END IF;

    RAISE EXCEPTION 'El UUID ya existe para una operacion diferente'
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.votos_por_organizacion (acta_id, organizacion_id, votos)
  SELECT p_acta_id, v.organizacion_id, v.votos
  FROM jsonb_to_recordset(p_votos)
    AS v(organizacion_id uuid, votos integer);

  PERFORM public.insertar_evidencia_acta(p_acta_id, p_evidencia);

  RETURN p_acta_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.corregir_acta(
  p_acta_id uuid,
  p_total_sufragantes integer,
  p_votos_nulos integer,
  p_votos_blancos integer,
  p_votos jsonb,
  p_evidencia jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_creada_por uuid;
  v_mesa_id uuid;
  v_rol text;
  v_filas_actualizadas bigint;
  v_organizaciones bigint;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesion autenticada'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = v_actor
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Debe confirmar su correo antes de corregir actas'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT a.creada_por, a.mesa_id
    INTO v_creada_por, v_mesa_id
  FROM public.actas AS a
  WHERE a.id = p_acta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el acta solicitada'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT p.rol INTO v_rol
  FROM public.perfiles AS p
  WHERE p.id = v_actor;

  IF v_rol IS NULL OR NOT (
    (
      v_rol = 'coordinador_recinto'
      AND EXISTS (
        SELECT 1
        FROM public.mesas AS m
        JOIN public.recintos AS r ON r.id = m.recinto_id
        WHERE m.id = v_mesa_id
          AND r.coordinador_id = v_actor
      )
    )
    OR (
      v_rol = 'veedor'
      AND v_creada_por = v_actor
      AND EXISTS (
        SELECT 1
        FROM public.asignaciones_veedor AS av
        WHERE av.veedor_id = v_actor
          AND av.mesa_id = v_mesa_id
          AND av.finalizado_en IS NULL
        FOR SHARE
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tiene permiso para corregir esta acta'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM public.validar_lista_votos(p_votos);

  IF p_evidencia IS NOT NULL THEN
    PERFORM public.validar_evidencia_json(p_evidencia);
  END IF;

  IF public.correccion_acta_coincide(
    p_acta_id,
    p_total_sufragantes,
    p_votos_nulos,
    p_votos_blancos,
    p_votos,
    p_evidencia
  ) THEN
    RETURN p_acta_id;
  END IF;

  UPDATE public.actas
  SET total_sufragantes = p_total_sufragantes,
      votos_nulos = p_votos_nulos,
      votos_blancos = p_votos_blancos
  WHERE id = p_acta_id;

  UPDATE public.votos_por_organizacion AS actual
  SET votos = nuevos.votos
  FROM jsonb_to_recordset(p_votos)
    AS nuevos(organizacion_id uuid, votos integer)
  WHERE actual.acta_id = p_acta_id
    AND actual.organizacion_id = nuevos.organizacion_id;

  GET DIAGNOSTICS v_filas_actualizadas = ROW_COUNT;
  SELECT count(*) INTO v_organizaciones
  FROM public.organizaciones;

  IF v_filas_actualizadas <> v_organizaciones THEN
    RAISE EXCEPTION 'No se actualizaron los votos de todas las organizaciones'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_evidencia IS NOT NULL THEN
    PERFORM public.insertar_evidencia_acta(p_acta_id, p_evidencia);
  END IF;

  RETURN p_acta_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reemplazar_veedor(
  p_asignacion_anterior_id uuid,
  p_veedor_entrante_id uuid,
  p_motivo text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_mesa_id uuid;
  v_provincia_mesa uuid;
  v_provincia_veedor_entrante uuid;
  v_veedor_saliente_id uuid;
  v_momento timestamptz;
  v_asignacion_nueva_id uuid;
  v_reemplazo_id uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesion autenticada'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT av.mesa_id, av.veedor_id
    INTO v_mesa_id, v_veedor_saliente_id
  FROM public.asignaciones_veedor AS av
  WHERE av.id = p_asignacion_anterior_id
    AND av.finalizado_en IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La asignacion anterior no existe o ya fue finalizada'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    JOIN public.mesas AS m ON m.id = v_mesa_id
    JOIN public.recintos AS r ON r.id = m.recinto_id
    WHERE p.id = v_actor
      AND p.rol = 'coordinador_recinto'
      AND r.coordinador_id = v_actor
  ) THEN
    RAISE EXCEPTION 'Solo el coordinador del recinto puede reemplazar al veedor'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_veedor_entrante_id = v_veedor_saliente_id THEN
    RAISE EXCEPTION 'El veedor entrante debe ser distinto del saliente'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT p.provincia_id
    INTO v_provincia_veedor_entrante
  FROM public.perfiles AS p
  WHERE p.id = p_veedor_entrante_id
    AND p.rol = 'veedor'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El veedor entrante no existe o no tiene el rol de veedor'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT r.provincia_id
    INTO v_provincia_mesa
  FROM public.mesas AS m
  JOIN public.recintos AS r ON r.id = m.recinto_id
  WHERE m.id = v_mesa_id
  FOR SHARE OF r;

  IF NOT FOUND
    OR v_provincia_veedor_entrante IS DISTINCT FROM v_provincia_mesa
  THEN
    RAISE EXCEPTION 'El veedor entrante debe pertenecer a la provincia de la mesa'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.asignaciones_veedor AS av
    WHERE av.veedor_id = p_veedor_entrante_id
      AND av.mesa_id = v_mesa_id
      AND av.finalizado_en IS NULL
  ) THEN
    RAISE EXCEPTION 'El veedor entrante ya tiene una asignacion activa en esta mesa'
      USING ERRCODE = 'unique_violation';
  END IF;

  v_momento := clock_timestamp();
  v_asignacion_nueva_id := pg_catalog.gen_random_uuid();
  v_reemplazo_id := pg_catalog.gen_random_uuid();

  UPDATE public.asignaciones_veedor
  SET finalizado_por = v_actor,
      finalizado_en = v_momento
  WHERE id = p_asignacion_anterior_id;

  INSERT INTO public.asignaciones_veedor (
    id,
    veedor_id,
    mesa_id,
    asignado_por,
    asignado_en
  )
  VALUES (
    v_asignacion_nueva_id,
    p_veedor_entrante_id,
    v_mesa_id,
    v_actor,
    v_momento
  );

  INSERT INTO public.reemplazos_veedor (
    id,
    mesa_id,
    asignacion_anterior_id,
    asignacion_nueva_id,
    veedor_saliente_id,
    veedor_entrante_id,
    reemplazado_por,
    motivo,
    reemplazado_en
  )
  VALUES (
    v_reemplazo_id,
    v_mesa_id,
    p_asignacion_anterior_id,
    v_asignacion_nueva_id,
    v_veedor_saliente_id,
    p_veedor_entrante_id,
    v_actor,
    p_motivo,
    v_momento
  );

  RETURN v_reemplazo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_integridad_acta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acta_id uuid;
  v_acta_id_anterior uuid;
  v_acta_id_nuevo uuid;
  v_total integer;
  v_suma bigint;
  v_cantidad_votos bigint;
  v_cantidad_organizaciones bigint;
BEGIN
  IF TG_TABLE_NAME = 'actas' THEN
    IF TG_OP <> 'INSERT' THEN
      v_acta_id_anterior := OLD.id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_acta_id_nuevo := NEW.id;
    END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN
      v_acta_id_anterior := OLD.acta_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_acta_id_nuevo := NEW.acta_id;
    END IF;
  END IF;

  FOR v_acta_id IN
    SELECT DISTINCT ids.acta_id
    FROM unnest(ARRAY[v_acta_id_anterior, v_acta_id_nuevo]) AS ids(acta_id)
    WHERE ids.acta_id IS NOT NULL
  LOOP
    SELECT a.total_sufragantes,
           a.votos_nulos::bigint + a.votos_blancos::bigint
             + COALESCE(sum(v.votos), 0),
           count(v.organizacion_id)
      INTO v_total, v_suma, v_cantidad_votos
    FROM public.actas AS a
    LEFT JOIN public.votos_por_organizacion AS v ON v.acta_id = a.id
    WHERE a.id = v_acta_id
    GROUP BY a.id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    PERFORM public.validar_catalogo_organizaciones_s02();

    SELECT count(*) INTO v_cantidad_organizaciones
    FROM public.organizaciones;

    IF v_cantidad_votos <> v_cantidad_organizaciones THEN
      RAISE EXCEPTION 'Debe existir una fila de votos por cada organizacion'
        USING ERRCODE = 'check_violation';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.votos_por_organizacion AS v
      WHERE v.acta_id = v_acta_id AND v.votos > v_total
    ) THEN
      RAISE EXCEPTION 'Un valor de votos supera el total de sufragantes'
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_suma <> v_total THEN
      RAISE EXCEPTION 'La suma de votos debe ser igual al total de sufragantes'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.evidencias AS e
      WHERE e.acta_id = v_acta_id
    ) THEN
      RAISE EXCEPTION 'El acta debe tener al menos una evidencia'
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fijar_recepcion_acta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.recibida_en := clock_timestamp();
  ELSIF NEW.recibida_en IS DISTINCT FROM OLD.recibida_en THEN
    RAISE EXCEPTION 'recibida_en solo puede establecerla el servidor al registrar'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fijar_recepcion_evidencia()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.recibida_en := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.proteger_evidencia()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'La evidencia es inmutable; inserte una nueva version'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_asignacion_veedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_coordinador_id uuid;
  v_provincia_id uuid;
BEGIN
  SELECT r.coordinador_id, r.provincia_id
    INTO v_coordinador_id, v_provincia_id
  FROM public.mesas AS m
  JOIN public.recintos AS r ON r.id = m.recinto_id
  WHERE m.id = NEW.mesa_id;

  IF NOT FOUND OR v_coordinador_id IS NULL THEN
    RAISE EXCEPTION 'La mesa debe pertenecer a un recinto con coordinador'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS v
    WHERE v.id = NEW.veedor_id
      AND v.rol = 'veedor'
      AND v.provincia_id = v_provincia_id
  ) THEN
    RAISE EXCEPTION 'El veedor debe pertenecer a la provincia de la mesa'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.finalizado_en IS NOT NULL
      OR NEW.finalizado_por IS NOT NULL
      OR NEW.asignado_por IS DISTINCT FROM v_coordinador_id
      OR NEW.asignado_por IS DISTINCT FROM auth.uid()
    THEN
      RAISE EXCEPTION 'La asignacion inicial debe realizarla el coordinador autenticado del recinto'
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF OLD.finalizado_en IS NOT NULL
      OR NEW.finalizado_en IS NULL
      OR NEW.finalizado_por IS DISTINCT FROM v_coordinador_id
      OR NEW.finalizado_por IS DISTINCT FROM auth.uid()
      OR NEW.id IS DISTINCT FROM OLD.id
      OR NEW.veedor_id IS DISTINCT FROM OLD.veedor_id
      OR NEW.mesa_id IS DISTINCT FROM OLD.mesa_id
      OR NEW.asignado_por IS DISTINCT FROM OLD.asignado_por
      OR NEW.asignado_en IS DISTINCT FROM OLD.asignado_en
    THEN
      RAISE EXCEPTION 'Una asignacion solo puede finalizarse una vez por el coordinador del recinto'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bloquear_borrado_asignacion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Las asignaciones se conservan; finalice la asignacion en lugar de borrarla'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_reemplazo_veedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_asignacion_anterior public.asignaciones_veedor%ROWTYPE;
  v_asignacion_nueva public.asignaciones_veedor%ROWTYPE;
BEGIN
  SELECT * INTO v_asignacion_anterior
  FROM public.asignaciones_veedor
  WHERE id = NEW.asignacion_anterior_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontro la asignacion anterior'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT * INTO v_asignacion_nueva
  FROM public.asignaciones_veedor
  WHERE id = NEW.asignacion_nueva_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontro la asignacion nueva'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_asignacion_anterior.mesa_id <> NEW.mesa_id
    OR v_asignacion_anterior.veedor_id <> NEW.veedor_saliente_id
    OR v_asignacion_nueva.mesa_id <> NEW.mesa_id
    OR v_asignacion_nueva.veedor_id <> NEW.veedor_entrante_id
  THEN
    RAISE EXCEPTION 'Las asignaciones deben corresponder a la mesa y veedores del reemplazo'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_asignacion_anterior.finalizado_en IS NULL
    OR v_asignacion_anterior.finalizado_por IS DISTINCT FROM NEW.reemplazado_por
    OR v_asignacion_nueva.finalizado_en IS NOT NULL
    OR v_asignacion_nueva.finalizado_por IS NOT NULL
    OR v_asignacion_nueva.asignado_por IS DISTINCT FROM NEW.reemplazado_por
  THEN
    RAISE EXCEPTION 'El reemplazo debe cerrar la asignacion anterior e iniciar la nueva'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_asignacion_anterior.finalizado_en > NEW.reemplazado_en
    OR NEW.reemplazado_en > v_asignacion_nueva.asignado_en
  THEN
    RAISE EXCEPTION 'Las fechas del reemplazo deben quedar entre el cierre y el inicio de asignaciones'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    JOIN public.mesas AS m ON m.id = NEW.mesa_id
    JOIN public.recintos AS r ON r.id = m.recinto_id
    WHERE p.id = NEW.reemplazado_por
      AND p.rol = 'coordinador_recinto'
      AND r.coordinador_id = p.id
  ) THEN
    RAISE EXCEPTION 'El reemplazo debe realizarlo el coordinador del recinto'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.proteger_reemplazo_veedor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'El historial de reemplazos es inmutable'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER actas_fijar_recepcion_servidor
  BEFORE INSERT OR UPDATE ON public.actas
  FOR EACH ROW EXECUTE FUNCTION public.fijar_recepcion_acta();

CREATE TRIGGER perfiles_validar_cedula
  BEFORE INSERT OR UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.validar_cedula_perfil();

CREATE TRIGGER evidencias_fijar_recepcion_servidor
  BEFORE INSERT ON public.evidencias
  FOR EACH ROW EXECUTE FUNCTION public.fijar_recepcion_evidencia();

CREATE TRIGGER evidencias_solo_insercion
  BEFORE UPDATE OR DELETE ON public.evidencias
  FOR EACH ROW EXECUTE FUNCTION public.proteger_evidencia();

CREATE TRIGGER asignaciones_validar_veedor
  BEFORE INSERT OR UPDATE ON public.asignaciones_veedor
  FOR EACH ROW EXECUTE FUNCTION public.validar_asignacion_veedor();

CREATE TRIGGER asignaciones_no_borrar
  BEFORE DELETE ON public.asignaciones_veedor
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_asignacion();

CREATE CONSTRAINT TRIGGER reemplazos_validar_diferido
  AFTER INSERT ON public.reemplazos_veedor
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validar_reemplazo_veedor();

CREATE TRIGGER reemplazos_inmutables
  BEFORE UPDATE OR DELETE ON public.reemplazos_veedor
  FOR EACH ROW EXECUTE FUNCTION public.proteger_reemplazo_veedor();

CREATE CONSTRAINT TRIGGER actas_integridad_diferida
  AFTER INSERT OR UPDATE ON public.actas
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validar_integridad_acta();

CREATE CONSTRAINT TRIGGER votos_integridad_diferida
  AFTER INSERT OR UPDATE OR DELETE ON public.votos_por_organizacion
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validar_integridad_acta();

CREATE CONSTRAINT TRIGGER evidencias_integridad_diferida
  AFTER INSERT OR UPDATE OR DELETE ON public.evidencias
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validar_integridad_acta();

REVOKE ALL ON FUNCTION public.validar_catalogo_organizaciones_s02()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_lista_votos(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_evidencia_json(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.insertar_evidencia_acta(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_cedula_ecuatoriana(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_cedula_perfil()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acta_registro_coincide(
  uuid, uuid, text, uuid, integer, integer, integer, timestamptz, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.correccion_acta_coincide(
  uuid, integer, integer, integer, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_integridad_acta()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fijar_recepcion_acta()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fijar_recepcion_evidencia()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proteger_evidencia()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_asignacion_veedor()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bloquear_borrado_asignacion()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_reemplazo_veedor()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proteger_reemplazo_veedor()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_acta(
  uuid, uuid, text, integer, integer, integer, timestamptz,
  jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.corregir_acta(
  uuid, integer, integer, integer, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reemplazar_veedor(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE
  public.perfiles,
  public.actas,
  public.votos_por_organizacion,
  public.evidencias,
  public.reemplazos_veedor
FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.asignaciones_veedor
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.registrar_acta(
  uuid, uuid, text, integer, integer, integer, timestamptz,
  jsonb, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.corregir_acta(
  uuid, integer, integer, integer, jsonb, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reemplazar_veedor(uuid, uuid, text)
  TO authenticated;
