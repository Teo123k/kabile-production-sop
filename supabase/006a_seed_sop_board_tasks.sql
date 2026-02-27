-- ============================================================
-- SEED: sop_board_tasks — KABILE (Recipes 1–11)
-- ============================================================

-- 1. MAGIC SOY
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Magic Soy', 'js', $$
{
  "weekly": ["Batch 1 (40L)", "Batch 2 (40L)", "Aromatic Base Puree", "Liquid Soy Foundation"],
  "morning": {
    "tasks": ["[PREP] Main Pot Prep (50L)", "[PREP] Blend Aromatic Base", "[PREP] Strain & Quality Check", "[PREP] Bottling & Labelling"],
    "forward": ["Tomorrow Liquid Prep Ready", "Station Backup Fill"]
  },
  "service": ["Bulgogi Station Bottle Load", "BBQ Station Bottle Load", "Salinity & Clarity Test"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 2. BULGOGI SAUCE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Bulgogi Sauce', 'js', $$
{
  "weekly": ["Marrow Render 1", "Marrow Render 2", "Base Sauce Batch 1", "Base Sauce Batch 2"],
  "morning": {
    "tasks": [
      "[PREP] Aromatic Fresh Blend", 
      "[PREP] Warm Marrow Incorporation", 
      "[PREP] Emulsion Quality Test", 
      "[STATION] Service Bottle Fill",
      "[BUTCHERY] Marinate {{qty}} {{unit}} Beef with Sauces"
    ],
    "forward": ["Beef Marinate Ready (12h)", "Next Day Protein Allocation"]
  },
  "service": ["Grill Station Load", "Extra Squeeze Bottles ready", "Gloss & Texture Check"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 3. DAKGALBI SAUCE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Dakgalbi Sauce', 'js', $$
{
  "weekly": ["Paste Blend Batch 1", "Paste Blend Batch 2", "Secret Spice Dry Mix", "Liquid Mix Batch"],
  "morning": {
    "tasks": [
      "Fresh Aromatic Puree", 
      "Final Blend Incorporation", 
      "Portion Heat Level Check", 
      "Service Station Fill",
      "Marinate {{qty}} {{unit}} Chicken with Dak Sauce"
    ],
    "forward": ["Chicken Marinate Ready (12h)", "Tomorrow Portion Prep"]
  },
  "service": ["Wok Station Load", "Basting Sauce Squeeze Bottles", "Portion Weight Verification"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 4. UDON BASE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Udon Base', 'j', $$
{
  "weekly": ["Udon Dry Stock Order", "Oil Blend Prep", "Portion Bag Stock Check"],
  "morning": {
    "tasks": ["Main Water Boil Start", "AM Batch Boil & Rinse", "Portioning & Oiling (200 cakes)", "PM Batch Prep Load"],
    "forward": ["Tomorrow Dough Check", "Water Filter System Monitor"]
  },
  "service": ["Regen Station Active", "Timer Calibration", "Bowl Warmer On"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 5. CURRY VEGE BASE
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Curry Vege Base', 'js', $$
{
  "weekly": ["Batch 1 (15kg)", "Batch 2 (15kg)", "Batch 3 (15kg)", "Caramelization Check"],
  "morning": {
    "tasks": ["Onion Sweat Start", "Carrot & Apple Puree Prep", "Main Blend & Sift", "Portion Block Casting"],
    "forward": ["Tomorrow Veg Stock Check", "Peeled Onion Backup"]
  },
  "service": ["Sauce Station Block Load", "Liquid Stock Station Full", "Viscosity Test"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 6. CURRY ROUX
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Curry Roux', 'js', $$
{
  "weekly": ["Roux Block Batch 1", "Roux Block Batch 2", "Roux Block Batch 3", "Spice Ratio Verification"],
  "morning": {
    "tasks": ["Butter Melt Low Heat", "Flour Incorporation (Slow Whisk)", "Spice Profile Integration", "Block Cooling & Slicing"],
    "forward": ["Dry Spice Pre-mix Packets", "Butter Inventory Check"]
  },
  "service": ["Station Block Ready", "Stock Thaw Check", "Whisk & Pan Station Clear"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 7. BULGOGI (BEEF DISH)
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Bulgogi (Beef)', 'js', $$
{
  "weekly": ["Slicing 1 (50kg)", "Slicing 2 (50kg)", "Slicing 3 (50kg)", "Knife Sharpening Cycle"],
  "morning": {
    "tasks": ["Marinade Bath Setup", "Beef Tempering (15m)", "Portioning (200 portions)", "Labelling & Dating"],
    "forward": ["Tomorrow Beef Thaw", "Marinade Batch Ready"]
  },
  "service": ["Grill Temp Check (200°C)", "Line Pan Load (Portioned)", "Drizzle Bottle Full"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 8. DAKGALBI (CHICKEN DISH)
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Dakgalbi (Chicken)', 'js', $$
{
  "weekly": ["Dicing 1 (50kg)", "Dicing 2 (50kg)", "Dicing 3 (50kg)", "Uniformity Check"],
  "morning": {
    "tasks": ["Friction Marinade Massage", "Tempering & Quality Check", "Portioning (200 portions)", "Station Clear & Sanitize"],
    "forward": ["Tomorrow Chicken Thaw", "Marinade Base Ready"]
  },
  "service": ["Wok Station Active", "Toss Bowl Clean", "Baste Sauce Ready"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 9. KATSU CURRY
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Katsu Curry', 'js', $$
{
  "weekly": ["Panko Stock Order (Bulk)", "Spice Mix Verification", "Oil Filter Cycle (Heavy)", "Equipment Calibration"],
  "morning": {
    "tasks": [
      "[BUTCHERY] Flatten {{qty}} Chicken Breasts", 
      "[STATION] Setup Breading Line (Flour/Egg/Panko)", 
      "[PREP] Curry Sauce Base Assembly", 
      "[FRYER] First-Batch Test Fry"
    ],
    "forward": ["Tomorrow Crumb Stock Check", "Panko Sift Cycle ready"]
  },
  "service": ["Fryer 175°C Steady", "Noodle Regen Active", "Ladle Viscosity Test"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 10. KOREAN FRIED CHICKEN
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Korean Fried Chicken', 'js', $$
{
  "weekly": [
    "Coating Mix (8kg Bulk)", 
    "Starch Mix (1:1 Ratio)", 
    "Dry Ingredient Sift",
    {"label": "Flour Mix Prep", "anchor": "Bulk Flour", "ratio": 0.06, "unit": "kg", "resultLabel": "Corn Starch"}
  ],
  "morning": {
    "tasks": [
      "[STATION] Breading Station Setup", 
      "[BUTCHERY] Chicken Thigh Portioning ({{qty}} portions)", 
      "[FRYER] Oil Quality Reset",
      "[STATION] KFC Breading: {{qty}} {{unit}} Flour/Starch Mix"
    ],
    "forward": ["Tomorrow Thigh Allocation", "Next Day Brine Prep"]
  },
  "service": ["First Fry 175°C Active", "Resting Rack Station", "Second Fry 165°C Active"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;

-- 11. TTEOKBOKKI
INSERT INTO sop_board_tasks (client_id, dish_name, staff_role, tasks_json)
VALUES ('kabile', 'Tteokbokki', 'js', $$
{
  "weekly": ["Rice Cake Sep 1 (20kg)", "Rice Cake Sep 2 (20kg)", "Rice Cake Sep 3 (20kg)", "Sauce Mix 15L"],
  "morning": {
    "tasks": ["Anchovy Stock Simmer Start", "Paste & Seasoning Add", "Rice Cake Soaking Cycle", "Fish Cake Slicing Setup"],
    "forward": ["Tomorrow Stock Water Prep", "Sauce Base Prep Ready"]
  },
  "service": ["Hot Sauce Bain Marie (75°C)", "Active Cook Pot Ready", "Station Skimmer Clear"]
}
$$)
ON CONFLICT (client_id, dish_name) DO UPDATE SET tasks_json = EXCLUDED.tasks_json, staff_role = EXCLUDED.staff_role;
