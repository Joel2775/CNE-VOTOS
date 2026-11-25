ALTER TABLE public.perfiles
  ADD COLUMN debe_cambiar_clave boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.marcar_primer_acceso_completado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE public.perfiles
    SET debe_cambiar_clave = false
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auth_users_marcar_primer_acceso
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.marcar_primer_acceso_completado();

REVOKE ALL ON FUNCTION public.marcar_primer_acceso_completado()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validar_primer_acceso_acta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    WHERE p.id = auth.uid()
      AND p.debe_cambiar_clave = false
  ) THEN
    RAISE EXCEPTION 'Debe definir su contraseña personal antes de operar'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER actas_exigir_primer_acceso
  BEFORE INSERT OR UPDATE ON public.actas
  FOR EACH ROW EXECUTE FUNCTION public.validar_primer_acceso_acta();

REVOKE ALL ON FUNCTION public.validar_primer_acceso_acta()
  FROM PUBLIC, anon, authenticated;
