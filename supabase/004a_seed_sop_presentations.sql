-- ============================================================
-- SEED: sop_presentations — KABILE (Recipes 1–11)
-- Style: 'Component-Ready' Punchy Tasks for Command Board
-- ============================================================

-- 1. MAGIC SOY
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Magic Soy', '{
  "meta": "BASE // BRIGADE_SOP",
  "title": "Magic Soy",
  "weekly": {
    "batch": ["Batch 1 (40L)", "Batch 2 (40L)", "Aromatic Base Puree", "Liquid Soy Foundation"],
    "buffer": ["80L Total Stock Confirmation", "Sealed Backup Check (10L)"]
  },
  "morning": {
    "tasks": ["Main Pot Prep (50L)", "Blend Aromatic Base", "Strain & Quality Check", "Bottling & Labelling"],
    "forward": ["Tomorrow Liquid Prep Ready", "Station Backup Fill"]
  },
  "service": {
    "setup": ["Bulgogi Station Bottle Load", "BBQ Station Bottle Load", "Salinity & Clarity Test"],
    "garnish": ["N/A Base Component"]
  },
  "strategy": {
    "method": "Cold-mix bulk base",
    "temp": "Hold 2-4°C",
    "tips": "Filter twice for maximum clarity.",
    "note": "Critical dependency for all sauces."
  },
  "holding": {
    "temp": "2-4°C",
    "limit": "5 Days",
    "method": "Sealed Containers",
    "note": "Discard if aroma turns sour."
  },
  "maintenance": "High volume. Daily inventory check.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 2. BULGOGI SAUCE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Bulgogi Sauce', '{
  "meta": "SAUCE // BRIGADE_SOP",
  "title": "Bulgogi Sauce",
  "weekly": {
    "batch": ["Marrow Render 1", "Marrow Render 2", "Base Sauce Batch 1", "Base Sauce Batch 2"],
    "buffer": ["Emulsion Stability Check", "Backup Stock (5L)"]
  },
  "morning": {
    "tasks": ["Aromatic Fresh Blend", "Warm Marrow Incorporation", "Emulsion Quality Test", "Service Bottle Fill"],
    "forward": ["Beef Marinate Ready (12h)", "Next Day Protein Allocation"]
  },
  "service": {
    "setup": ["Grill Station Load", "Extra Squeeze Bottles ready", "Gloss & Texture Check"],
    "garnish": ["Toasted Sesame Mix ready"]
  },
  "strategy": {
    "method": "Warm emulsion base",
    "temp": "Hold 2-4°C",
    "tips": "Blend warm for stable emulsion.",
    "note": "Pre-marinate system. Fast service."
  },
  "holding": {
    "temp": "2-4°C",
    "limit": "4 Days",
    "method": "Airtight Bottles",
    "note": "Re-emulsify if split."
  },
  "maintenance": "Check daily. High umami balance.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 3. DAKGALBI SAUCE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Dakgalbi Sauce', '{
  "meta": "SAUCE // BRIGADE_SOP",
  "title": "Dakgalbi Sauce",
  "weekly": {
    "batch": ["Paste Blend Batch 1", "Paste Blend Batch 2", "Secret Spice Dry Mix", "Liquid Mix Batch"],
    "buffer": ["Heat Intensity Test", "3kg Backup Confirmation"]
  },
  "morning": {
    "tasks": ["Fresh Aromatic Puree", "Final Blend Incorporation", "Portion Heat Level Check", "Service Station Fill"],
    "forward": ["Chicken Marinate Ready (12h)", "Tomorrow Portion Prep"]
  },
  "service": {
    "setup": ["Wok Station Load", "Basting Sauce Squeeze Bottles", "Portion Weight Verification"],
    "garnish": ["Spring Onion Rings ready"]
  },
  "strategy": {
    "method": "High-heat glaze",
    "temp": "Hold 2-4°C",
    "tips": "Add at final 60s for gloss.",
    "note": "Avoid burning sugars in wok."
  },
  "holding": {
    "temp": "2-4°C",
    "limit": "5 Days",
    "method": "Sealed Containers",
    "note": "High salt stability."
  },
  "maintenance": "Gochujang settling check daily.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 4. UDON BASE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Udon Base', '{
  "meta": "PREP // BRIGADE_SOP",
  "title": "Udon Base",
  "weekly": {
    "batch": ["Udon Dry Stock Order", "Oil Blend Prep", "Portion Bag Stock Check"],
    "buffer": ["20% Portion Buffer Count", "Emergency Frozen Backup"]
  },
  "morning": {
    "tasks": ["Main Water Boil Start", "AM Batch Boil & Rinse", "Portioning & Oiling (200 cakes)", "PM Batch Prep Load"],
    "forward": ["Tomorrow Dough Check", "Water Filter System Monitor"]
  },
  "service": {
    "setup": ["Regen Station Active", "Timer Calibration", "Bowl Warmer On"],
    "garnish": ["Scallion Whites ready"]
  },
  "strategy": {
    "method": "90s Flash Regen",
    "temp": "Regen 95°C+",
    "tips": "Do not skip cold rinse.",
    "note": "Texture lost if over-boiled."
  },
  "holding": {
    "temp": "2-4°C",
    "limit": "8 Hours",
    "method": "Individually Oiled Cakes",
    "note": "Discard if sticky."
  },
  "maintenance": "Water change every 50 portions.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 5. CURRY VEGE BASE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Curry Vege Base', '{
  "meta": "BASE // BRIGADE_SOP",
  "title": "Curry Vege Base",
  "weekly": {
    "batch": ["Batch 1 (15kg)", "Batch 2 (15kg)", "Batch 3 (15kg)", "Caramelization Check"],
    "buffer": ["Sweetness Level Test", "2kg Backup Sealed"]
  },
  "morning": {
    "tasks": ["Onion Sweat Start", "Carrot & Apple Puree Prep", "Main Blend & Sift", "Portion Block Casting"],
    "forward": ["Tomorrow Veg Stock Check", "Peeled Onion Backup"]
  },
  "service": {
    "setup": ["Sauce Station Block Load", "Liquid Stock Station Full", "Viscosity Test"],
    "garnish": ["N/A Base Component"]
  },
  "strategy": {
    "method": "Low-slow sweat base",
    "temp": "Hold 2-4°C",
    "tips": "Onions must be transparent.",
    "note": "Natural apple sweetness key."
  },
  "holding": {
    "temp": "2-4°C",
    "limit": "4 Days",
    "method": "Casted Blocks",
    "note": "Discard if color greys."
  },
  "maintenance": "Monitor cooling speed strictly.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 6. CURRY ROUX
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Curry Roux', '{
  "meta": "PREP // BRIGADE_SOP",
  "title": "Curry Roux",
  "weekly": {
    "batch": ["Roux Block Batch 1", "Roux Block Batch 2", "Roux Block Batch 3", "Spice Ratio Verification"],
    "buffer": ["Roux Solid Stability Check", "10 Block Reserve"]
  },
  "morning": {
    "tasks": ["Butter Melt Low Heat", "Flour Incorporation (Slow Whisk)", "Spice Profile Integration", "Block Cooling & Slicing"],
    "forward": ["Dry Spice Pre-mix Packets", "Butter Inventory Check"]
  },
  "service": {
    "setup": ["Station Block Ready", "Stock Thaw Check", "Whisk & Pan Station Clear"],
    "garnish": ["Butter Knob Finish ready"]
  },
  "strategy": {
    "method": "Blonde modular roux",
    "temp": "Hold 4°C (Solid)",
    "tips": "No raw flour taste allowed.",
    "note": "Melt in stock before vege base."
  },
  "holding": {
    "temp": "4°C",
    "limit": "6 Days",
    "method": "Parchment Wrapped Blocks",
    "note": "Discard if rancid smell."
  },
  "maintenance": "Check spices every batch.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 7. BULGOGI (BEEF DISH)
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Bulgogi (Beef)', '{
  "meta": "MAIN // BRIGADE_SOP",
  "title": "Bulgogi Beef",
  "weekly": {
    "batch": ["Slicing 1 (50kg)", "Slicing 2 (50kg)", "Slicing 3 (50kg)", "Knife Sharpening Cycle"],
    "buffer": ["Beef Stock Inventory Check", "Emergency Frozen Slices"]
  },
  "morning": {
    "tasks": ["Marinade Bath Setup", "Beef Tempering (15m)", "Portioning (200 portions)", "Labelling & Dating"],
    "forward": ["Tomorrow Beef Thaw", "Marinade Batch Ready"]
  },
  "service": {
    "setup": ["Grill Temp Check (200°C)", "Line Pan Load (Portioned)", "Drizzle Bottle Full"],
    "garnish": ["Spring Onion Julienne ready"]
  },
  "strategy": {
    "method": "High-heat flash grill",
    "temp": "Grill 200°C+",
    "tips": "No steaming — dry surface key.",
    "note": "Caramelization = Flavor."
  },
  "holding": {
    "temp": "2-4°C (Raw)",
    "limit": "24h (Marinated)",
    "method": "Covered Portion Trays",
    "note": "No cooked hold permitted."
  },
  "maintenance": "Grill scrap check every 5 orders.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 8. DAKGALBI (CHICKEN DISH)
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Dakgalbi (Chicken)', '{
  "meta": "MAIN // BRIGADE_SOP",
  "title": "Dakgalbi Chicken",
  "weekly": {
    "batch": ["Dicing 1 (50kg)", "Dicing 2 (50kg)", "Dicing 3 (50kg)", "Uniformity Check"],
    "buffer": ["Chicken Stock Check (Fresh)", "Emergency Backup Diced"]
  },
  "morning": {
    "tasks": ["Friction Marinade Massage", "Tempering & Quality Check", "Portioning (200 portions)", "Station Clear & Sanitize"],
    "forward": ["Tomorrow Chicken Thaw", "Marinade Base Ready"]
  },
  "service": {
    "setup": ["Wok Station Active", "Toss Bowl Clean", "Baste Sauce Ready"],
    "garnish": ["Cheongyang Chili sliced"]
  },
  "strategy": {
    "method": "Tensioned stir-fry",
    "temp": "Wok 220°C+",
    "tips": "Max 2 portions per wok.",
    "note": "Protein must hit 75°C internal."
  },
  "holding": {
    "temp": "2-4°C (Raw)",
    "limit": "24h (Marinated)",
    "method": "Divided GN Pans",
    "note": "Discard if color dulls."
  },
  "maintenance": "Wok seasoning check AM.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 9. KATSU CURRY
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Katsu Curry', '{
  "meta": "FLAGSHIP // BRIGADE_SOP",
  "title": "Katsu Curry",
  "weekly": {
    "batch": ["Panko Stock Order (Bulk)", "Spice Mix Verification", "Oil Filter Cycle (Heavy)", "Equipment Calibration"],
    "buffer": ["Roux Block 15 Reserve", "2kg Vege Base Buffer"]
  },
  "morning": {
    "tasks": ["Flatten Chicken Breasts (500)", "Breading Line Active (Flour/Egg/Panko)", "Curry Sauce Base Assembly", "First-Batch Test Fry"],
    "forward": ["Tomorrow Crumb Stock Check", "Panko Sift Cycle ready"]
  },
  "service": {
    "setup": ["Fryer 175°C Steady", "Noodle Regen Active", "Ladle Viscosity Test"],
    "garnish": ["Plate Dusting Mix ready"]
  },
  "strategy": {
    "method": "Parallel fire workflow",
    "temp": "Fryer 175°C",
    "tips": "45° slice for visual volume.",
    "note": "Crust integrity = 90s window."
  },
  "holding": {
    "temp": "Sauce 75°C (Warm)",
    "limit": "Sauce 2h (Bain Marie)",
    "method": "Covered Bain Marie",
    "note": "No fried hold permitted."
  },
  "maintenance": "Oil color check every session.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 10. KOREAN FRIED CHICKEN
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Korean Fried Chicken', '{
  "meta": "MAIN // BRIGADE_SOP",
  "title": "KFC — Korean Fried Chicken",
  "weekly": {
    "batch": ["Coating Mix 1 (8kg)", "Coating Mix 2 (8kg)", "Coating Mix 3 (8kg)", "Dry Ingredient Sift"],
    "buffer": ["2kg Reserve Coating", "Chicken Thigh Master Thaw"]
  },
  "morning": {
    "tasks": ["Breading Station Setup", "Chicken Thigh Portioning (500)", "Dry/Wet/Dry Line Active", "Oil Quality Reset"],
    "forward": ["Tomorrow Thigh Allocation", "Next Day Brine Prep"]
  },
  "service": {
    "setup": ["First Fry 175°C Active", "Resting Rack Station", "Second Fry 165°C Active"],
    "garnish": ["Toss Bowls Warm"]
  },
  "strategy": {
    "method": "Double-fry crunch system",
    "temp": "Fry 1 175°C | Fry 2 165°C",
    "tips": "2m rest between fries mandatory.",
    "note": "Never cover hot chicken."
  },
  "holding": {
    "temp": "Raw Coated 2-4°C",
    "limit": "Coated 2h (Station)",
    "method": "Iced Tray System",
    "note": "Discard if coating wets out."
  },
  "maintenance": "Sediment dump after 60 orders.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 11. TTEOKBOKKI
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Tteokbokki', '{
  "meta": "MAIN // BRIGADE_SOP",
  "title": "Tteokbokki",
  "weekly": {
    "batch": ["Rice Cake Sep 1 (20kg)", "Rice Cake Sep 2 (20kg)", "Rice Cake Sep 3 (20kg)", "Sauce Mix 15L"],
    "buffer": ["3L Reserve Sauce", "Fish Cake Reserve 5kg"]
  },
  "morning": {
    "tasks": ["Anchovy Stock Simmer Start", "Paste & Seasoning Add", "Rice Cake Soaking Cycle", "Fish Cake Slicing Setup"],
    "forward": ["Tomorrow Stock Water Prep", "Sauce Base Prep Ready"]
  },
  "service": {
    "setup": ["Hot Sauce Bain Marie (75°C)", "Active Cook Pot Ready", "Station Skimmer Clear"],
    "garnish": ["Sesame Oil finish ready"]
  },
  "strategy": {
    "method": "Per-order activation",
    "temp": "Sauce Hold 75°C",
    "tips": "Soak cakes for even chew.",
    "note": "Texture lost if over-simmered."
  },
  "holding": {
    "temp": "Sauce 75°C (Warm)",
    "limit": "Sauce 2h",
    "method": "Heated Well",
    "note": "Thin with stock if reduced."
  },
  "maintenance": "Bain marie water check AM.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;
