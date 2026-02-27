-- ============================================================
-- SEED: sop_board_tasks — KABILE (Recipes 12–23)
-- ============================================================

-- 12. SWEET SPICY SAUCE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Sweet Spicy Sauce', 'j', $$
{
  "weekly": ["Batch 1 (40L)", "Batch 2 (40L)", "Dry Spice Pre-mix", "Cold Base Whisk"],
  "morning": {
    "tasks": ["AM Base Assembly", "Garlic Dispersion Check", "Viscosity Test", "500ml Bottle Fill"],
    "forward": ["Tomorrow Liquid Stock Ready", "Label Cycle Check"]
  },
  "service": ["Cold station check", "Toss bowl clean", "Sesame pot full"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 13. HONEY BUTTER
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Honey Butter', 'js', $$
{
  "weekly": ["Batch 1 (15L)", "Batch 2 (15L)", "Honey Mix Batch", "Garlic Butter Render"],
  "morning": {
    "tasks": ["Slow Butter Melt", "Garlic Infusion (90s)", "Honey/Soy Integration", "Service Temp Check"],
    "forward": ["Tomorrow Butter Thaw", "Honey Inventory Check"]
  },
  "service": ["Warm Hold 58°C Active", "Stirring whisk ready", "Toss Bowl Heat Check"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 14. BBQ SAUCE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'BBQ Sauce', 'js', $$
{
  "weekly": ["Batch 1 (25L)", "Batch 2 (25L)", "Smoked Base Mix", "Magic Soy Allocation"],
  "morning": {
    "tasks": ["Simmer & Reduce Start", "Honey/Syrup Integration", "Cold Shock & Store", "Bottle Fill Cycle"],
    "forward": ["Tomorrow Base Prep Ready", "Spice Allocation Check"]
  },
  "service": ["Ambient station load", "Extra squeeze bottles", "Ladle Clean Check"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 15. THAI SPICY
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Thai Spicy', 'j', $$
{
  "weekly": ["Base Blend Batch 1", "Base Blend Batch 2", "Sriracha Mix Check", "Sweet Spicy Allocation"],
  "morning": {
    "tasks": ["Fresh Lime Squeeze (Bulk)", "Base Sauce Assembly", "Spice Intensity Test", "Dispenser Load"],
    "forward": ["Tomorrow Lime Stock", "BBQ Base Check"]
  },
  "service": ["Cool station check", "Spicy Label Cycle", "Toss Bowl Warm"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 16. BLUE CHEESE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Blue Cheese', 'j', $$
{
  "weekly": ["Batch 1 (10L)", "Batch 2 (10L)", "Cheese Crumble Cycle", "Dairy Base Whisk"],
  "morning": {
    "tasks": ["Fine Cheese Crumble", "Fold and Taste AM", "Portioning Cycle (Cups)", "Cold Storage Move"],
    "forward": ["Tomorrow Dairy Order", "Cheese Stock Check"]
  },
  "service": ["Cold well load", "Portion cup count", "Dip Tray Clean"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 17. ASIAN COLESLAW
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Asian Coleslaw', 'j', $$
{
  "weekly": ["Veg Shred Batch 1", "Veg Shred Batch 2", "Dressing Batch 10L", "Sesame Toast Cycle"],
  "morning": {
    "tasks": ["Salt-Cure Veg Cycle (30m)", "Squeeze & Drain Dry", "Portioning Undressed", "Dressing Allocation AM"],
    "forward": ["Tomorrow Veg Stock (40kg)", "Carrot Shred Prep ready"]
  },
  "service": ["Dress-on-Demand Load", "Portion Cup Count", "Station Ice Check"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 18. TTEOKKOCHI SAUCE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Tteokkochi Sauce', 'j', $$
{
  "weekly": ["Glaze Batch 1 (10L)", "Glaze Batch 2 (10L)", "Spice Dry Pre-mix", "Magic Soy Allocation"],
  "morning": {
    "tasks": ["Low-Heat Garlic Sweat", "Gochujang Mix AM", "Simmer & Thicken", "Skewer Station Fill"],
    "forward": ["Tomorrow Spice Packet", "Syrup Inventory Check"]
  },
  "service": ["Warm Hold 65°C Active", "Brush clean cycle", "Water-Thin Pot Ready"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 19. RADISH PICKLE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Radish Pickle', 'j', $$
{
  "weekly": ["Cubic Batch 1 (25kg)", "Cubic Batch 2 (25kg)", "Cubic Batch 3 (25kg)", "Brine Preparation Cycle"],
  "morning": {
    "tasks": ["Radish 2cm Cube Cycle", "Salt-Draw Rest (30m)", "Brine Pour & Seal", "AM Portioning Cycle"],
    "forward": ["Tomorrow Radish Order", "Brine Prep Ready"]
  },
  "service": ["Cold well cup load", "Portion spoon clean", "Crisp Texture Test"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 20. KIMCHI
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Kimchi', 'js', $$
{
  "weekly": ["Cabbage Wilt 1 (40kg)", "Cabbage Wilt 2 (40kg)", "Porridge Base Prep", "Aromatic Blend Cycle"],
  "morning": {
    "tasks": ["Wilt Rinse & Squeeze", "Paste Coating Cycle (Hand)", "Tight-Pack GN Seal", "Aged Stock Allocation"],
    "forward": ["Tomorrow Cabbage Order", "Chili Paste Prep ready"]
  },
  "service": ["Cold cup portioning", "Aroma check AM", "Fridge temp monitor"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 21. FLOUR MIX
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Flour Mix', 'j', $$
{
  "weekly": ["Batch 1 (10kg)", "Batch 2 (10kg)", "Batch 3 (10kg)", "Spice Sift Cycle"],
  "morning": {
    "tasks": ["[PREP] AM Sift & Blend", "[STATION 1] Breading Station Load", "[PREP] Dry-to-Wet Test", "[PREP] Airtight Bin Check"],
    "forward": ["Tomorrow Flour Order", "Spice Pre-mix Packet"]
  },
  "service": ["[STATION 1] Dry Load", "[STATION 1] Clump clearing AM", "[STATION 1] Sifter near fryer"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 22. STARCH MIX
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Starch Mix', 'j', $$
{
  "weekly": ["Batch 1 (10kg)", "Batch 2 (10kg)", "Starch 1:1 Blend AM", "Airtight Bin Check"],
  "morning": {
    "tasks": ["[PREP] AM Visual Blend Check", "[STATION 3] Dry Load", "[PREP] Panko/Starch Balance", "[PREP] Equipment Check"],
    "forward": ["Tomorrow Starch Order", "Bin Clean Cycle"]
  },
  "service": ["[STATION 3] Load", "[STATION 3] Press pressure test", "[STATION 3] Shake basket clear"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 23. EGG WASH
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Egg Wash', 'j', $$
{
  "weekly": ["AM Fresh Whisk Only", "Milk Stock Check", "Egg Tray Count", "Dairy Order Verification"],
  "morning": {
    "tasks": ["[PREP] Session Whisk (100 Eggs)", "[PREP] Milk Emulsion Test", "[STATION 2] Load", "[PREP] Cold Well Setup"],
    "forward": ["Tomorrow Egg Count", "Fresh Milk Order"]
  },
  "service": ["[STATION 2] Load", "[STATION 2] Whisk at station", "[PREP] Salinity check AM"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;
