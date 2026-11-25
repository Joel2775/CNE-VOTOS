CREATE TABLE public.historial_actas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaccion_id bigint NOT NULL DEFAULT pg_catalog.txid_current(),
  acta_id uuid NOT NULL REFERENCES public.actas (id) ON DELETE RESTRICT,
  entidad text NOT NULL CHECK (entidad IN ('acta', 'voto')),
  actor_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE RESTRICT,
  actor_cedula text NOT NULL,
  mesa_id uuid NOT NULL REFERENCES public.mesas (id) ON DELETE RESTRICT,
  recinto_id uuid NOT NULL REFERENCES public.recintos (id) ON DELETE RESTRICT,
  registrada_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  valores_anteriores jsonb NOT NULL
    CHECK (jsonb_typeof(valores_anteriores) = 'object'),
  valores_nuevos jsonb NOT NULL
    CHECK (jsonb_typeof(valores_nuevos) = 'object')
);

CREATE INDEX historial_actas_acta_idx
  ON public.historial_actas (acta_id, id);

CREATE INDEX historial_actas_transaccion_idx
  ON public.historial_actas (transaccion_id, acta_id, id);

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

CREATE OR REPLACE FUNCTION public.bloquear_modificacion_historial_actas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'El historial es inmutable'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER actas_historial_insercion
  AFTER INSERT ON public.actas
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historial_acta();

CREATE TRIGGER actas_historial_actualizacion
  AFTER UPDATE OF total_sufragantes, votos_nulos, votos_blancos
  ON public.actas
  FOR EACH ROW
  WHEN (
    OLD.total_sufragantes IS DISTINCT FROM NEW.total_sufragantes
    OR OLD.votos_nulos IS DISTINCT FROM NEW.votos_nulos
    OR OLD.votos_blancos IS DISTINCT FROM NEW.votos_blancos
  )
  EXECUTE FUNCTION public.registrar_historial_acta();

CREATE TRIGGER votos_historial_insercion
  AFTER INSERT ON public.votos_por_organizacion
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historial_acta();

CREATE TRIGGER votos_historial_actualizacion
  AFTER UPDATE OF votos
  ON public.votos_por_organizacion
  FOR EACH ROW
  WHEN (OLD.votos IS DISTINCT FROM NEW.votos)
  EXECUTE FUNCTION public.registrar_historial_acta();

CREATE TRIGGER historial_actas_inmutable
  BEFORE UPDATE OR DELETE ON public.historial_actas
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_modificacion_historial_actas();

CREATE TRIGGER historial_actas_no_truncar
  BEFORE TRUNCATE ON public.historial_actas
  FOR EACH STATEMENT EXECUTE FUNCTION public.bloquear_modificacion_historial_actas();

REVOKE ALL ON FUNCTION public.registrar_historial_acta()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bloquear_modificacion_historial_actas()
  FROM PUBLIC, anon, authenticated;

ALTER TABLE public.historial_actas ENABLE ROW LEVEL SECURITY;

CREATE POLICY historial_actas_select_por_acta
  ON public.historial_actas
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_acta(acta_id));

REVOKE ALL ON TABLE public.historial_actas
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.historial_actas
  TO authenticated;
