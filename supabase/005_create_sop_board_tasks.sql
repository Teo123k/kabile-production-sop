-- ============================================================
-- SCHEMA: sop_board_tasks
-- Purpose: Dedicated table for Kitchen Command Board checklists.
-- Separates operational tasks from presentation data.
-- ============================================================

CREATE TABLE IF NOT EXISTS sop_board_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    dish_name TEXT NOT NULL,
    tasks_json JSONB NOT NULL, -- Stores Weekly, Daily, Service arrays
    staff_role TEXT DEFAULT 'js', -- j (junior), s (senior), js (both)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (client_id, dish_name)
);

-- Enable RLS (Assuming public read for simplicity in this demo, adjust for prod)
ALTER TABLE sop_board_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON sop_board_tasks FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update" ON sop_board_tasks FOR ALL USING (true);
