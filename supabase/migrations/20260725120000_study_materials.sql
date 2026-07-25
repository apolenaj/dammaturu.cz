-- =============================================================================
-- DámMaturu — study_materials + Storage bucket user_materials
-- Spusť v Supabase: SQL Editor → New query → Run
-- (nebo: supabase db push, pokud používáš CLI)
-- =============================================================================

-- 1) Tabulka studijních materiálů (systémové + uživatelské)
CREATE TABLE IF NOT EXISTS public.study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  type text NOT NULL CHECK (type IN ('system', 'user')),
  file_url text,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_materials_user_type_consistency CHECK (
    (type = 'system' AND user_id IS NULL)
    OR (type = 'user' AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS study_materials_type_idx
  ON public.study_materials (type);

CREATE INDEX IF NOT EXISTS study_materials_user_id_idx
  ON public.study_materials (user_id);

CREATE INDEX IF NOT EXISTS study_materials_subject_idx
  ON public.study_materials (subject);

-- 2) Row Level Security
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_materials_select_system_and_own" ON public.study_materials;
CREATE POLICY "study_materials_select_system_and_own"
  ON public.study_materials
  FOR SELECT
  TO authenticated
  USING (
    type = 'system'
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "study_materials_insert_own" ON public.study_materials;
CREATE POLICY "study_materials_insert_own"
  ON public.study_materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'user'
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "study_materials_delete_own" ON public.study_materials;
CREATE POLICY "study_materials_delete_own"
  ON public.study_materials
  FOR DELETE
  TO authenticated
  USING (
    type = 'user'
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "study_materials_update_own" ON public.study_materials;
CREATE POLICY "study_materials_update_own"
  ON public.study_materials
  FOR UPDATE
  TO authenticated
  USING (
    type = 'user'
    AND user_id = auth.uid()
  )
  WITH CHECK (
    type = 'user'
    AND user_id = auth.uid()
  );

-- 3) Storage bucket pro uživatelské PDF / dokumenty
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_materials',
  'user_materials',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Cesta souboru: {user_id}/{filename}
DROP POLICY IF EXISTS "user_materials_select_own" ON storage.objects;
CREATE POLICY "user_materials_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user_materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user_materials_insert_own" ON storage.objects;
CREATE POLICY "user_materials_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user_materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user_materials_update_own" ON storage.objects;
CREATE POLICY "user_materials_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user_materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user_materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user_materials_delete_own" ON storage.objects;
CREATE POLICY "user_materials_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user_materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) Seed — výchozí systémové maturitní materiály (type = system)
INSERT INTO public.study_materials (id, title, subject, type, file_url, user_id)
VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    'Romantismus',
    'Český jazyk a literatura',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'Realismus',
    'Český jazyk a literatura',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'Národní obrození',
    'Český jazyk a literatura',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    'Moderní poezie 20. století',
    'Český jazyk a literatura',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000005',
    'Slohové útvary',
    'Český jazyk a literatura',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000006',
    'Rovnice a nerovnice',
    'Matematika',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000007',
    'Funkce',
    'Matematika',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000008',
    'Planimetrie a stereometrie',
    'Matematika',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000009',
    'Poslech a porozumění',
    'Angličtina',
    'system',
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-00000000000a',
    'Gramatika a slovní zásoba',
    'Angličtina',
    'system',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;
