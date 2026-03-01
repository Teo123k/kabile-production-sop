-- Final Automation Schema for Hierarchical Production Engine
-- Aligned with n8n Chef_Logic_Master workflow

-- 1. Recipes Table (The Core)
CREATE TABLE IF NOT EXISTS public.sop_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id TEXT NOT NULL DEFAULT 'kabile',
    recipe_name TEXT NOT NULL,
    recipe_id TEXT UNIQUE NOT NULL, -- The slug id used in App/BOM engine
    base_yield NUMERIC DEFAULT 1,
    yield_unit TEXT DEFAULT 'kg',
    tier TEXT DEFAULT 'Tier 2 (Daily)',
    dish_style TEXT DEFAULT 'stewed',
    ingredients JSONB DEFAULT '[]'::jsonb,
    method JSONB DEFAULT '[]'::jsonb,
    bulk_method JSONB DEFAULT '[]'::jsonb,
    scaling_tips JSONB DEFAULT '[]'::jsonb,
    prep_time TEXT,
    cook_time TEXT,
    production_strategy TEXT DEFAULT 'dynamic_daily',
    production_batch_size NUMERIC,
    ai_enriched BOOLEAN DEFAULT false,
    source TEXT DEFAULT 'upload',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Presentations Table
CREATE TABLE IF NOT EXISTS public.sop_presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id TEXT NOT NULL DEFAULT 'kabile',
    dish_name TEXT NOT NULL,
    presentation_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Board Tasks Table
CREATE TABLE IF NOT EXISTS public.sop_board_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id TEXT NOT NULL DEFAULT 'kabile',
    dish_name TEXT NOT NULL,
    tasks_json JSONB DEFAULT '{}'::jsonb,
    staff_role TEXT DEFAULT 'js',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sop_recipes_client ON public.sop_recipes(client_id);
CREATE INDEX IF NOT EXISTS idx_sop_recipes_slug ON public.sop_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_sop_presentations_client ON public.sop_presentations(client_id);
CREATE INDEX IF NOT EXISTS idx_sop_board_tasks_client ON public.sop_board_tasks(client_id);
