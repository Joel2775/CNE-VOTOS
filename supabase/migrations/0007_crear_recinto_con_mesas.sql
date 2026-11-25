CREATE OR REPLACE FUNCTION public.crear_recinto_con_mesas(
  p_provincia_id uuid,
  p_canton_id uuid,
  p_parroquia_id uuid,
  p_nombre text,
  p_latitud double precision,
  p_longitud double precision,
  p_cantidad_mesas integer,
  p_coordinador_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_recinto_id uuid;
BEGIN
  IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre del recinto es obligatorio'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_latitud IS NULL OR p_latitud NOT BETWEEN -90 AND 90
     OR p_longitud IS NULL OR p_longitud NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Las coordenadas del recinto no son válidas'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_cantidad_mesas IS NULL
     OR p_cantidad_mesas < 1
     OR p_cantidad_mesas > 32767 THEN
    RAISE EXCEPTION 'La cantidad de mesas debe estar entre 1 y 32767'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.recintos (
    provincia_id,
    canton_id,
    parroquia_id,
    nombre,
    latitud,
    longitud,
    coordinador_id
  )
  VALUES (
    p_provincia_id,
    p_canton_id,
    p_parroquia_id,
    btrim(p_nombre),
    p_latitud,
    p_longitud,
    p_coordinador_id
  )
  RETURNING id INTO v_recinto_id;

  INSERT INTO public.mesas (recinto_id, numero)
  SELECT v_recinto_id, serie.numero::smallint
  FROM generate_series(1, p_cantidad_mesas) AS serie(numero);

  RETURN v_recinto_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_recinto_con_mesas(
  uuid,
  uuid,
  uuid,
  text,
  double precision,
  double precision,
  integer,
  uuid
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.crear_recinto_con_mesas(
  uuid,
  uuid,
  uuid,
  text,
  double precision,
  double precision,
  integer,
  uuid
) TO authenticated;
