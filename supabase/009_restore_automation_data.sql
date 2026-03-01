-- ONE-TIME RESTORATION: Migrate Legacy Data to New Automation Schema (IDEMPOTENT)
-- This script moves data from consulting_sops to the flattened sop_recipes tables.

-- 1. Restore Recipes
INSERT INTO public.sop_recipes (
    client_id, 
    recipe_name, 
    recipe_id, 
    base_yield, 
    yield_unit, 
    tier, 
    dish_style, 
    ingredients, 
    method, 
    production_strategy, 
    production_batch_size,
    source
)
SELECT 
    client_id,
    COALESCE(recipe_json->>'name', dish_name) as recipe_name,
    COALESCE(recipe_json->>'id', LOWER(REPLACE(dish_name, ' ', '-'))) as recipe_id,
    COALESCE((recipe_json->>'baseYield')::NUMERIC, 1) as base_yield,
    COALESCE(recipe_json->>'unit', 'kg') as yield_unit,
    COALESCE(recipe_json->>'tier', 'Tier 2 (Daily)') as tier,
    dish_style,
    COALESCE(recipe_json->'ingredients', '[]'::jsonb) as ingredients,
    COALESCE(recipe_json->'method', '[]'::jsonb) as method,
    COALESCE(production_strategy, 'dynamic_daily'),
    production_batch_size,
    'legacy_migration'
FROM public.consulting_sops
WHERE client_id = 'kabile'
ON CONFLICT (recipe_id) DO UPDATE SET
    recipe_name = EXCLUDED.recipe_name,
    base_yield = EXCLUDED.base_yield,
    yield_unit = EXCLUDED.yield_unit,
    tier = EXCLUDED.tier,
    ingredients = EXCLUDED.ingredients,
    method = EXCLUDED.method,
    production_strategy = EXCLUDED.production_strategy,
    production_batch_size = EXCLUDED.production_batch_size;

-- 2. Restore Presentations
-- Handle the unique constraint on (client_id, dish_name) if it exists
INSERT INTO public.sop_presentations (client_id, dish_name, presentation_json)
SELECT 
    client_id,
    dish_name,
    presentation_json
FROM public.consulting_sops
WHERE client_id = 'kabile' 
  AND presentation_json IS NOT NULL 
  AND presentation_json::text <> '{}'
ON CONFLICT (client_id, dish_name) DO UPDATE SET
    presentation_json = EXCLUDED.presentation_json;

-- 3. Restore Board Tasks
INSERT INTO public.sop_board_tasks (client_id, dish_name, tasks_json, staff_role)
SELECT 
    client_id,
    dish_name,
    presentation_json as tasks_json,
    'js' as staff_role
FROM public.consulting_sops
WHERE client_id = 'kabile' 
  AND presentation_json IS NOT NULL 
  AND presentation_json::text <> '{}'
ON CONFLICT (client_id, dish_name) DO UPDATE SET
    tasks_json = EXCLUDED.tasks_json;
