CREATE OR REPLACE FUNCTION public.rls_provincia_actual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.provincia_id
  FROM public.perfiles AS p
  WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_gestionar_provincia(
  p_provincia_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    WHERE p.id = auth.uid()
      AND p.rol = 'coordinador_provincial'
      AND p.provincia_id = p_provincia_id
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_ver_recinto(p_recinto_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recintos AS r
    JOIN public.perfiles AS p ON p.id = auth.uid()
    WHERE r.id = p_recinto_id
      AND (
        (
          p.rol = 'coordinador_provincial'
          AND r.provincia_id = p.provincia_id
        )
        OR (
          p.rol = 'coordinador_recinto'
          AND r.coordinador_id = p.id
        )
        OR (
          p.rol = 'veedor'
          AND (
            EXISTS (
              SELECT 1
              FROM public.mesas AS m
              JOIN public.asignaciones_veedor AS av
                ON av.mesa_id = m.id
              WHERE m.recinto_id = r.id
                AND av.veedor_id = p.id
                AND av.finalizado_en IS NULL
            )
            OR EXISTS (
              SELECT 1
              FROM public.actas AS a
              JOIN public.mesas AS m ON m.id = a.mesa_id
              WHERE m.recinto_id = r.id
                AND a.creada_por = p.id
            )
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_ver_canton(p_canton_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cantones AS c
    JOIN public.perfiles AS p ON p.id = auth.uid()
    WHERE c.id = p_canton_id
      AND (
        (
          p.rol = 'coordinador_provincial'
          AND c.provincia_id = p.provincia_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.recintos AS r
          WHERE r.canton_id = c.id
            AND public.rls_puede_ver_recinto(r.id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_ver_parroquia(
  p_parroquia_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parroquias AS pa
    JOIN public.perfiles AS p ON p.id = auth.uid()
    WHERE pa.id = p_parroquia_id
      AND (
        (
          p.rol = 'coordinador_provincial'
          AND pa.provincia_id = p.provincia_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.recintos AS r
          WHERE r.parroquia_id = pa.id
            AND public.rls_puede_ver_recinto(r.id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_gestionar_recinto(
  p_recinto_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recintos AS r
    WHERE r.id = p_recinto_id
      AND public.rls_puede_gestionar_provincia(r.provincia_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_ver_mesa(p_mesa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mesas AS m
    JOIN public.recintos AS r ON r.id = m.recinto_id
    JOIN public.perfiles AS p ON p.id = auth.uid()
    WHERE m.id = p_mesa_id
      AND (
        (
          p.rol = 'coordinador_provincial'
          AND r.provincia_id = p.provincia_id
        )
        OR (
          p.rol = 'coordinador_recinto'
          AND r.coordinador_id = p.id
        )
        OR (
          p.rol = 'veedor'
          AND (
            EXISTS (
              SELECT 1
              FROM public.asignaciones_veedor AS av
              WHERE av.mesa_id = m.id
                AND av.veedor_id = p.id
                AND av.finalizado_en IS NULL
            )
            OR EXISTS (
              SELECT 1
              FROM public.actas AS a
              WHERE a.mesa_id = m.id
                AND a.creada_por = p.id
            )
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_gestionar_mesa(
  p_mesa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mesas AS m
    JOIN public.recintos AS r ON r.id = m.recinto_id
    JOIN public.perfiles AS p ON p.id = auth.uid()
    WHERE m.id = p_mesa_id
      AND p.rol = 'coordinador_recinto'
      AND r.coordinador_id = p.id
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_ver_perfil(p_perfil_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles AS actual
    JOIN public.perfiles AS objetivo ON objetivo.id = p_perfil_id
    WHERE actual.id = auth.uid()
      AND (
        objetivo.id = actual.id
        OR (
          actual.rol = 'coordinador_provincial'
          AND objetivo.provincia_id = actual.provincia_id
        )
        OR (
          actual.rol = 'coordinador_recinto'
          AND (
            (
              objetivo.rol = 'veedor'
              AND objetivo.creado_por = actual.id
            )
            OR EXISTS (
              SELECT 1
              FROM public.asignaciones_veedor AS av
              JOIN public.mesas AS m ON m.id = av.mesa_id
              JOIN public.recintos AS r ON r.id = m.recinto_id
              WHERE av.veedor_id = objetivo.id
                AND r.coordinador_id = actual.id
                AND objetivo.rol = 'veedor'
            )
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_ver_asignacion(
  p_asignacion_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.asignaciones_veedor AS av
    JOIN public.mesas AS m ON m.id = av.mesa_id
    JOIN public.recintos AS r ON r.id = m.recinto_id
    JOIN public.perfiles AS p ON p.id = auth.uid()
    WHERE av.id = p_asignacion_id
      AND (
        av.veedor_id = p.id
        OR (
          p.rol = 'coordinador_recinto'
          AND r.coordinador_id = p.id
        )
        OR (
          p.rol = 'coordinador_provincial'
          AND r.provincia_id = p.provincia_id
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_ver_reemplazo(
  p_reemplazo_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reemplazos_veedor AS rv
    JOIN public.mesas AS m ON m.id = rv.mesa_id
    JOIN public.recintos AS r ON r.id = m.recinto_id
    JOIN public.perfiles AS p ON p.id = auth.uid()
    WHERE rv.id = p_reemplazo_id
      AND (
        (
          p.rol = 'coordinador_recinto'
          AND r.coordinador_id = p.id
        )
        OR (
          p.rol = 'coordinador_provincial'
          AND r.provincia_id = p.provincia_id
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.rls_puede_ver_acta(p_acta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.actas AS a
    JOIN public.mesas AS m ON m.id = a.mesa_id
    JOIN public.recintos AS r ON r.id = m.recinto_id
    JOIN public.perfiles AS p ON p.id = auth.uid()
    WHERE a.id = p_acta_id
      AND (
        (
          p.rol = 'coordinador_provincial'
          AND r.provincia_id = p.provincia_id
        )
        OR (
          p.rol = 'coordinador_recinto'
          AND r.coordinador_id = p.id
        )
        OR (
          p.rol = 'veedor'
          AND a.creada_por = p.id
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.validar_coordinador_recinto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.coordinador_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    WHERE p.id = NEW.coordinador_id
      AND p.rol = 'coordinador_recinto'
      AND p.provincia_id = NEW.provincia_id
  ) THEN
    RAISE EXCEPTION 'El coordinador debe tener el rol coordinador_recinto y pertenecer a la provincia del recinto'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recintos_validar_coordinador
  BEFORE INSERT OR UPDATE ON public.recintos
  FOR EACH ROW EXECUTE FUNCTION public.validar_coordinador_recinto();

REVOKE ALL ON FUNCTION public.rls_provincia_actual()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_gestionar_provincia(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_ver_canton(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_ver_parroquia(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_ver_recinto(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_gestionar_recinto(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_ver_mesa(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_gestionar_mesa(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_ver_perfil(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_ver_asignacion(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_ver_reemplazo(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_puede_ver_acta(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_coordinador_recinto()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rls_provincia_actual()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_gestionar_provincia(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_ver_canton(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_ver_parroquia(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_ver_recinto(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_gestionar_recinto(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_ver_mesa(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_gestionar_mesa(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_ver_perfil(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_ver_asignacion(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_ver_reemplazo(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_puede_ver_acta(uuid)
  TO authenticated;

ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provincias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cantones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parroquias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_veedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reemplazos_veedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votos_por_organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY configuracion_select_autenticados
  ON public.configuracion
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY provincias_select_mi_provincia
  ON public.provincias
  FOR SELECT TO authenticated
  USING (id = (SELECT public.rls_provincia_actual()));

CREATE POLICY cantones_select_mi_provincia
  ON public.cantones
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_canton(id));

CREATE POLICY parroquias_select_mi_provincia
  ON public.parroquias
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_parroquia(id));

CREATE POLICY perfiles_select_por_rol_y_territorio
  ON public.perfiles
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_perfil(id));

CREATE POLICY recintos_select_por_rol_y_territorio
  ON public.recintos
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_recinto(id));

CREATE POLICY recintos_insert_provincia
  ON public.recintos
  FOR INSERT TO authenticated
  WITH CHECK (public.rls_puede_gestionar_provincia(provincia_id));

CREATE POLICY recintos_update_provincia
  ON public.recintos
  FOR UPDATE TO authenticated
  USING (public.rls_puede_gestionar_provincia(provincia_id))
  WITH CHECK (public.rls_puede_gestionar_provincia(provincia_id));

CREATE POLICY mesas_select_por_rol_y_territorio
  ON public.mesas
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_mesa(id));

CREATE POLICY mesas_insert_provincia
  ON public.mesas
  FOR INSERT TO authenticated
  WITH CHECK (public.rls_puede_gestionar_recinto(recinto_id));

CREATE POLICY organizaciones_select_catalogo
  ON public.organizaciones
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY candidatos_select_catalogo
  ON public.candidatos
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY asignaciones_select_por_rol_y_territorio
  ON public.asignaciones_veedor
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_asignacion(id));

CREATE POLICY asignaciones_insert_coordinador_recinto
  ON public.asignaciones_veedor
  FOR INSERT TO authenticated
  WITH CHECK (
    asignado_por = auth.uid()
    AND finalizado_en IS NULL
    AND finalizado_por IS NULL
    AND public.rls_puede_gestionar_mesa(mesa_id)
  );

CREATE POLICY reemplazos_select_coordinadores
  ON public.reemplazos_veedor
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_reemplazo(id));

CREATE POLICY actas_select_por_rol_y_territorio
  ON public.actas
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_acta(id));

CREATE POLICY votos_select_por_acta
  ON public.votos_por_organizacion
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_acta(acta_id));

CREATE POLICY evidencias_select_por_acta
  ON public.evidencias
  FOR SELECT TO authenticated
  USING (public.rls_puede_ver_acta(acta_id));

REVOKE ALL ON TABLE
  public.configuracion,
  public.provincias,
  public.cantones,
  public.parroquias,
  public.perfiles,
  public.recintos,
  public.mesas,
  public.organizaciones,
  public.candidatos,
  public.asignaciones_veedor,
  public.reemplazos_veedor,
  public.actas,
  public.votos_por_organizacion,
  public.evidencias
FROM anon;

REVOKE ALL ON TABLE
  public.configuracion,
  public.provincias,
  public.cantones,
  public.parroquias,
  public.perfiles,
  public.recintos,
  public.mesas,
  public.organizaciones,
  public.candidatos,
  public.asignaciones_veedor,
  public.reemplazos_veedor,
  public.actas,
  public.votos_por_organizacion,
  public.evidencias
FROM authenticated;

GRANT SELECT ON TABLE
  public.configuracion,
  public.provincias,
  public.cantones,
  public.parroquias,
  public.perfiles,
  public.recintos,
  public.mesas,
  public.organizaciones,
  public.candidatos,
  public.asignaciones_veedor,
  public.reemplazos_veedor,
  public.actas,
  public.votos_por_organizacion,
  public.evidencias
TO authenticated;

GRANT INSERT, UPDATE ON TABLE public.recintos TO authenticated;
GRANT INSERT ON TABLE public.mesas TO authenticated;
GRANT INSERT ON TABLE public.asignaciones_veedor TO authenticated;
