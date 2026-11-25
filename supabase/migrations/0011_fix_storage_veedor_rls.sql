DROP POLICY IF EXISTS storage_actas_insert_territorial ON storage.objects;

CREATE POLICY storage_actas_insert_territorial
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'actas'
    AND owner_id = (SELECT auth.uid()::text)
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

CREATE POLICY storage_actas_select_propietario_reintento
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND owner_id = (SELECT auth.uid()::text)
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

CREATE POLICY storage_actas_update_propietario_territorial
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND owner_id = (SELECT auth.uid()::text)
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
  )
  WITH CHECK (
    bucket_id = 'actas'
    AND owner_id = (SELECT auth.uid()::text)
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
