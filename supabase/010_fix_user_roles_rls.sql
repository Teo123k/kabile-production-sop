-- Fix recursive RLS policies involving public.user_roles.
-- The goal is:
-- 1. users can read only their own role rows
-- 2. admins can update/read recipe rows for their client
-- 3. no policy on user_roles queries user_roles again

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow users to read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role self read" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read roles" ON public.user_roles;

CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read sop_recipes" ON public.sop_recipes;
DROP POLICY IF EXISTS "Admins can update sop_recipes" ON public.sop_recipes;
DROP POLICY IF EXISTS "Admins can insert sop_recipes" ON public.sop_recipes;
DROP POLICY IF EXISTS "Admins can delete sop_recipes" ON public.sop_recipes;

CREATE POLICY "Admins can read sop_recipes"
ON public.sop_recipes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.client_id = sop_recipes.client_id
      AND ur.role IN ('admin', 'owner', 'superadmin', 'super_admin')
  )
);

CREATE POLICY "Admins can update sop_recipes"
ON public.sop_recipes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.client_id = sop_recipes.client_id
      AND ur.role IN ('admin', 'owner', 'superadmin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.client_id = sop_recipes.client_id
      AND ur.role IN ('admin', 'owner', 'superadmin', 'super_admin')
  )
);

CREATE POLICY "Admins can insert sop_recipes"
ON public.sop_recipes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.client_id = sop_recipes.client_id
      AND ur.role IN ('admin', 'owner', 'superadmin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete sop_recipes"
ON public.sop_recipes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.client_id = sop_recipes.client_id
      AND ur.role IN ('admin', 'owner', 'superadmin', 'super_admin')
  )
);

COMMIT;
