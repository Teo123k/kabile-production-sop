-- =====================================================
-- SOP RECIPES TABLE
-- Stores structured recipe data for the SOP App
-- Source: n8n AI Pipeline (Telegram/Upload → AI → Supabase)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sop_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'kabile',
  recipe_name TEXT NOT NULL,
  recipe_id TEXT NOT NULL UNIQUE,           -- slug: 'magic-soy', 'bulgogi'
  sort_order INT DEFAULT 0,

  -- YIELD
  base_yield NUMERIC NOT NULL,              -- e.g. 11, 2, 1
  yield_unit TEXT NOT NULL,                 -- e.g. 'L', 'kg Beef', 'Batch', 'Portions'

  -- CLASSIFICATION
  tier TEXT,                                -- 'Tier 1 (3-4 Days)', 'Tier 2 (Daily)'
  dish_style TEXT,                          -- 'sauce', 'marinade', 'glaze', 'side'

  -- SCALING
  bulk_threshold NUMERIC,                   -- yield at which bulk method kicks in
  portion_size NUMERIC,                     -- e.g. 0.15 (150ml per person)
  density_note TEXT,                        -- e.g. 'Ratio: 450g Sauce per 1kg Meat'

  -- INGREDIENTS (JSONB array)
  ingredients JSONB NOT NULL DEFAULT '[]',
  /*  Each item shape:
      {
        "cat": "MEAT",
        "name": "Raw Beef (Sliced)",
        "qty": 2,
        "unit": "kg",
        "sku": "MT-BEEF-SLI",
        "isMain": true
      }
  */

  -- INSTRUCTIONS
  method JSONB DEFAULT '[]',                -- standard method steps (string array)
  bulk_method JSONB DEFAULT '[]',           -- large-scale method steps
  note TEXT,                                -- chef's critical note

  -- SCALING INTELLIGENCE (AI-generated)
  scaling_tips JSONB DEFAULT '{}',
  /*  { "regular": "...", "largeScale": "..." } */

  -- SUB-RECIPE MAPPING
  sub_recipe_map JSONB DEFAULT '{}',
  /*  Maps internal SKUs to recipe_ids for recursive flattening
      { "INT-MAG-SOY": "magic-soy", "INT-BBQ-SCE": "bbq-sauce" }
  */

  -- IMAGES
  image_url TEXT,
  dish_image_url TEXT,

  -- PREP/COOK
  prep_time TEXT,                           -- e.g. '20 mins'
  cook_time TEXT,                           -- e.g. '15 mins'

  -- META
  source TEXT DEFAULT 'manual',             -- 'telegram', 'upload', 'manual'
  ai_enriched BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_sop_recipes_client ON public.sop_recipes(client_id);
CREATE INDEX IF NOT EXISTS idx_sop_recipes_tier ON public.sop_recipes(tier);
CREATE INDEX IF NOT EXISTS idx_sop_recipes_sort ON public.sop_recipes(client_id, sort_order);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_sop_recipes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sop_recipes_updated
  BEFORE UPDATE ON public.sop_recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_sop_recipes_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE public.sop_recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read for the SOP App
CREATE POLICY "Allow public read" ON public.sop_recipes
  FOR SELECT USING (true);

-- Policy: Allow authenticated insert/update (n8n service role)
CREATE POLICY "Allow service write" ON public.sop_recipes
  FOR ALL USING (true) WITH CHECK (true);
