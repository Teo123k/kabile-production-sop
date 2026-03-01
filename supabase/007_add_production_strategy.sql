-- =====================================================
-- MIGRATION: ADD PRODUCTION STRATEGY COLUMNS
-- Adds production strategy classification for BOM engine
-- =====================================================

-- Add production_strategy column with default to 'dynamic_daily'
ALTER TABLE public.consulting_sops
ADD COLUMN IF NOT EXISTS production_strategy TEXT DEFAULT 'dynamic_daily';

-- Add production_batch_size for fixed_batch and foundational strategies
ALTER TABLE public.consulting_sops
ADD COLUMN IF NOT EXISTS production_batch_size NUMERIC;

-- Create an index for faster lookup by production strategy
CREATE INDEX IF NOT EXISTS idx_sop_recipes_strategy ON public.consulting_sops(production_strategy);
