DROP FUNCTION public.corregir_acta(
  uuid, integer, integer, integer, jsonb, jsonb
);

CREATE OR REPLACE FUNCTION public.corregir_acta(
  p_acta_id uuid,
  p_total_sufragantes integer,
  p_votos_nulos integer,
  p_votos_blancos integer,
  p_votos jsonb,
  p_motivo text,
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
  v_provincia_id uuid;
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

  IF p_motivo IS NULL OR pg_catalog.char_length(pg_catalog.btrim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'El motivo de auditoria debe tener al menos 10 caracteres'
      USING ERRCODE = 'check_violation';
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

  SELECT p.rol, p.provincia_id
    INTO v_rol, v_provincia_id
  FROM public.perfiles AS p
  WHERE p.id = v_actor;

  IF v_rol IS NULL OR NOT (
    (
      v_rol = 'coordinador_provincial'
      AND EXISTS (
        SELECT 1
        FROM public.mesas AS m
        JOIN public.recintos AS r ON r.id = m.recinto_id
        WHERE m.id = v_mesa_id
          AND r.provincia_id = v_provincia_id
      )
    )
    OR (
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

  PERFORM pg_catalog.set_config(
    'app.motivo_correccion',
    pg_catalog.btrim(p_motivo),
    true
  );

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

REVOKE ALL ON FUNCTION public.corregir_acta(
  uuid, integer, integer, integer, jsonb, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.corregir_acta(
  uuid, integer, integer, integer, jsonb, text, jsonb
) TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_historial_acta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_cedula text;
  v_acta_id uuid;
  v_mesa_id uuid;
  v_recinto_id uuid;
  v_entidad text;
  v_valores_anteriores jsonb;
  v_valores_nuevos jsonb;
  v_motivo text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesion autenticada para registrar el historial'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT p.cedula
    INTO v_actor_cedula
  FROM public.perfiles AS p
  WHERE p.id = v_actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el perfil del autor de la correccion'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF TG_TABLE_NAME = 'actas' THEN
    v_acta_id := NEW.id;
    v_mesa_id := NEW.mesa_id;
    v_entidad := 'acta';

    SELECT m.recinto_id
      INTO v_recinto_id
    FROM public.mesas AS m
    WHERE m.id = v_mesa_id;

    v_valores_nuevos := pg_catalog.jsonb_build_object(
      'total_sufragantes', NEW.total_sufragantes,
      'votos_nulos', NEW.votos_nulos,
      'votos_blancos', NEW.votos_blancos
    );

    IF TG_OP = 'INSERT' THEN
      v_valores_anteriores := '{}'::jsonb;
    ELSE
      v_valores_anteriores := pg_catalog.jsonb_build_object(
        'total_sufragantes', OLD.total_sufragantes,
        'votos_nulos', OLD.votos_nulos,
        'votos_blancos', OLD.votos_blancos
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'votos_por_organizacion' THEN
    v_acta_id := NEW.acta_id;
    v_entidad := 'voto';

    SELECT a.mesa_id, m.recinto_id
      INTO v_mesa_id, v_recinto_id
    FROM public.actas AS a
    JOIN public.mesas AS m ON m.id = a.mesa_id
    WHERE a.id = v_acta_id;

    v_valores_nuevos := pg_catalog.jsonb_build_object(
      'organizacion_id', NEW.organizacion_id,
      'votos', NEW.votos
    );

    IF TG_OP = 'INSERT' THEN
      v_valores_anteriores := '{}'::jsonb;
    ELSE
      v_valores_anteriores := pg_catalog.jsonb_build_object(
        'organizacion_id', OLD.organizacion_id,
        'votos', OLD.votos
      );
    END IF;
  ELSE
    RAISE EXCEPTION 'Tabla no soportada para registrar historial: %', TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_mesa_id IS NULL OR v_recinto_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar el territorio del acta'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  v_motivo := nullif(
    pg_catalog.current_setting('app.motivo_correccion', true),
    ''
  );
  IF v_motivo IS NOT NULL THEN
    v_valores_nuevos := v_valores_nuevos
      || pg_catalog.jsonb_build_object('motivo', v_motivo);
  END IF;

  INSERT INTO public.historial_actas (
    acta_id,
    entidad,
    actor_id,
    actor_cedula,
    mesa_id,
    recinto_id,
    valores_anteriores,
    valores_nuevos
  )
  VALUES (
    v_acta_id,
    v_entidad,
    v_actor_id,
    v_actor_cedula,
    v_mesa_id,
    v_recinto_id,
    v_valores_anteriores,
    v_valores_nuevos
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_historial_acta()
  FROM PUBLIC, anon, authenticated;
