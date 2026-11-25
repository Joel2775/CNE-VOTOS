INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'actas',
  'actas',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;


CREATE POLICY storage_actas_insert_territorial
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'actas'
    AND CASE
      WHEN array_length(storage.foldername(name), 1) = 2
        AND (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (storage.foldername(name))[2] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.rls_puede_ver_mesa(
        ((storage.foldername(name))[1])::uuid
      )
      AND (
        public.rls_puede_gestionar_mesa(
          ((storage.foldername(name))[1])::uuid
        )
        OR EXISTS (
          SELECT 1
          FROM public.asignaciones_veedor AS av
          WHERE av.mesa_id = ((storage.foldername(name))[1])::uuid
            AND av.veedor_id = auth.uid()
            AND av.finalizado_en IS NULL
        )
      )
      ELSE false
    END
  );

CREATE POLICY storage_actas_select_territorial
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND CASE
      WHEN array_length(storage.foldername(name), 1) = 2
        AND (storage.foldername(name))[1] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (storage.foldername(name))[2] ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.rls_puede_ver_acta(
        ((storage.foldername(name))[2])::uuid
      )
      ELSE false
    END
  );
