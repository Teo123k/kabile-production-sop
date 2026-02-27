-- ============================================================
-- SEED: sop_presentations — KABILE (Recipes 12–23)
-- Style: 'Component-Ready' Punchy Tasks for Command Board
-- ============================================================

-- 12. SWEET SPICY SAUCE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Sweet Spicy Sauce', '{
  "meta": "GLAZE // BRIGADE_SOP",
  "title": "Sweet Spicy Sauce",
  "weekly": {
    "batch": ["Batch 1 (40L)", "Batch 2 (40L)", "Dry Spice Pre-mix", "Cold Base Whisk"],
    "buffer": ["10L Thai Spicy Allocation", "8L Service Reserve"]
  },
  "morning": {
    "tasks": ["AM Base Assembly", "Garlic Dispersion Check", "Viscosity Test", "500ml Bottle Fill"],
    "forward": ["Tomorrow Liquid Stock Ready", "Label Cycle Check"]
  },
  "service": {
    "setup": ["Cold station check", "Toss bowl clean", "Sesame pot full"],
    "garnish": ["Radish Pickle ready"]
  },
  "strategy": {
    "method": "No-cook cold blend",
    "temp": "Apply cold",
    "tips": "Whisk hard for even garlic.",
    "note": "Most used chicken glaze."
  },
  "mission": [
    "Core high-volume chicken glaze",
    "Must be emulsified daily",
    "Ensures consistent garlic dispersion"
  ],
  "holding": {
    "temp": "2-4°C",
    "limit": "4 Days",
    "method": "Sealed Squeeze Bottles",
    "note": "Discard if sour."
  },
  "maintenance": "Re-whisk every session.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 13. HONEY BUTTER
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Honey Butter', '{
  "meta": "GLAZE // BRIGADE_SOP",
  "title": "Honey Butter",
  "weekly": {
    "batch": ["Batch 1 (15L)", "Batch 2 (15L)", "Honey Mix Batch", "Garlic Butter Render"],
    "buffer": ["Emulsion Stability Check", "2L Cold Backup"]
  },
  "morning": {
    "tasks": ["Slow Butter Melt", "Garlic Infusion (90s)", "Honey/Soy Integration", "Service Temp Check"],
    "forward": ["Tomorrow Butter Thaw", "Honey Inventory Check"]
  },
  "service": {
    "setup": ["Warm Hold 58°C Active", "Stirring whisk ready", "Toss Bowl Heat Check"],
    "garnish": ["Sea salt flakes ready"]
  },
  "strategy": {
    "method": "Low-temp emulsion",
    "temp": "Hold 55-60°C",
    "tips": "Never exceed 70°C.",
    "note": "Sensitive to overheating."
  },
  "mission": [
    "Delicate honey-butter emulsion",
    "Requires strict temperature management",
    "Discard immediately if blackened"
  ],
  "holding": {
    "temp": "55-60°C (Warm)",
    "limit": "2h Warm | 3d Cold",
    "method": "Bain Marie (Covered)",
    "note": "Discard if darkened."
  },
  "maintenance": "Check temp every 30m.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 14. BBQ SAUCE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'BBQ Sauce', '{
  "meta": "SAUCE // BRIGADE_SOP",
  "title": "House BBQ Sauce",
  "weekly": {
    "batch": ["Batch 1 (25L)", "Batch 2 (25L)", "Smoked Base Mix", "Magic Soy Allocation"],
    "buffer": ["Gloss Confirmation", "5L Sealed Backup"]
  },
  "morning": {
    "tasks": ["Simmer & Reduce Start", "Honey/Syrup Integration", "Cold Shock & Store", "Bottle Fill Cycle"],
    "forward": ["Tomorrow Base Prep Ready", "Spice Allocation Check"]
  },
  "service": {
    "setup": ["Ambient station load", "Extra squeeze bottles", "Ladle Clean Check"],
    "garnish": ["Smoked paprika ready"]
  },
  "strategy": {
    "method": "Reduced gloss sauce",
    "temp": "Hold 2-4°C",
    "tips": "Reduce 20% for texture.",
    "note": "Main cross-use glaze."
  },
  "mission": [
    "Signature smoky reduction",
    "Gloss level is critical for plating",
    "Primary cross-use sauce for sides"
  ],
  "holding": {
    "temp": "2-4°C",
    "limit": "4 Days",
    "method": "Airtight Containers",
    "note": "Discard if vinegar sharpens."
  },
  "maintenance": "Monitor Magic Soy levels AM.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 15. THAI SPICY
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Thai Spicy', '{
  "meta": "SAUCE // BRIGADE_SOP",
  "title": "Thai Spicy Sauce",
  "weekly": {
    "batch": ["Base Blend Batch 1", "Base Blend Batch 2", "Sriracha Mix Check", "Sweet Spicy Allocation"],
    "buffer": ["Heat Rating Verification", "5L Sealed Reserve"]
  },
  "morning": {
    "tasks": ["Fresh Lime Squeeze (Bulk)", "Base Sauce Assembly", "Spice Intensity Test", "Dispenser Load"],
    "forward": ["Tomorrow Lime Stock", "BBQ Base Check"]
  },
  "service": {
    "setup": ["Cool station check", "Spicy Label Cycle", "Toss Bowl Warm"],
    "garnish": ["Fresh Lime Wedge ready"]
  },
  "strategy": {
    "method": "Cold-assembled blend",
    "temp": "Hold 2-4°C",
    "tips": "Fresh lime mandatory.",
    "note": "Fast rebuild item."
  },
  "mission": [
    "Acid-forward spicy glaze",
    "Fresh citrus burst is mandatory",
    "High-speed rebuild if supply drops"
  ],
  "holding": {
    "temp": "2-4°C",
    "limit": "3 Days",
    "method": "Sealed Bottles",
    "note": "Lime acid fades after 3d."
  },
  "maintenance": "Smell check AM.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 16. BLUE CHEESE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Blue Cheese', '{
  "meta": "SAUCE // BRIGADE_SOP",
  "title": "Blue Cheese Dip",
  "weekly": {
    "batch": ["Batch 1 (10L)", "Batch 2 (10L)", "Cheese Crumble Cycle", "Dairy Base Whisk"],
    "buffer": ["Texture Consistency Check", "2L Reserve Cold"]
  },
  "morning": {
    "tasks": ["Fine Cheese Crumble", "Fold and Taste AM", "Portioning Cycle (Cups)", "Cold Storage Move"],
    "forward": ["Tomorrow Dairy Order", "Cheese Stock Check"]
  },
  "service": {
    "setup": ["Cold well load", "Portion cup count", "Dip Tray Clean"],
    "garnish": ["Smoked paprika dust ready"]
  },
  "strategy": {
    "method": "Cold emulsion dip",
    "temp": "Hold 2-4°C strictly",
    "tips": "No chunks allowed.",
    "note": "Highly perishable dairy."
  },
  "mission": [
    "Premium dairy-based binding dip",
    "Zero-tolerance for dairy temp abuse",
    "Smooth texture defines product quality"
  ],
  "holding": {
    "temp": "2-4°C",
    "limit": "3 Days",
    "method": "Sealed Squeeze Bottles",
    "note": "Discard if aroma turns."
  },
  "maintenance": "Check dairy temp every 2h.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 17. ASIAN COLESLAW
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Asian Coleslaw', '{
  "meta": "SIDE // BRIGADE_SOP",
  "title": "Asian Coleslaw",
  "weekly": {
    "batch": ["Veg Shred Batch 1", "Veg Shred Batch 2", "Dressing Batch 10L", "Sesame Toast Cycle"],
    "buffer": ["Undressed Veg Buffer 8kg", "Dressing Reserve 2L"]
  },
  "morning": {
    "tasks": ["Salt-Cure Veg Cycle (30m)", "Squeeze & Drain Dry", "Portioning Undressed", "Dressing Allocation AM"],
    "forward": ["Tomorrow Veg Stock (40kg)", "Carrot Shred Prep ready"]
  },
  "service": {
    "setup": ["Dress-on-Demand Load", "Portion Cup Count", "Station Ice Check"],
    "garnish": ["Toasted sesame ready"]
  },
  "strategy": {
    "method": "Dry-shred salt cure",
    "temp": "Keep cold 4°C",
    "tips": "Squeeze veg until dry.",
    "note": "Wet slaw = Soggy KFC."
  },
  "mission": [
    "Signature crunchy side texture",
    "Ultra-dry veg base prevents sogginess",
    "Dress-on-demand for maximum freshness"
  ],
  "holding": {
    "temp": "2-4°C",
    "limit": "Undressed 2d | Dressed 2h",
    "method": "Drained GN Pans",
    "note": "Discard if soggy."
  },
  "maintenance": "Drainage check every session.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 18. TTEOKKOCHI SAUCE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Tteokkochi Sauce', '{
  "meta": "SAUCE // BRIGADE_SOP",
  "title": "Tteokkochi Sauce",
  "weekly": {
    "batch": ["Glaze Batch 1 (10L)", "Glaze Batch 2 (10L)", "Spice Dry Pre-mix", "Magic Soy Allocation"],
    "buffer": ["Gloss Stability Check", "2L Sealed Reserve"]
  },
  "morning": {
    "tasks": ["Low-Heat Garlic Sweat", "Gochujang Mix AM", "Simmer & Thicken", "Skewer Station Fill"],
    "forward": ["Tomorrow Spice Packet", "Syrup Inventory Check"]
  },
  "service": {
    "setup": ["Warm Hold 65°C Active", "Brush clean cycle", "Water-Thin Pot Ready"],
    "garnish": ["Gochugaru dust ready"]
  },
  "strategy": {
    "method": "Simmered basting glaze",
    "temp": "Hold 65°C warm",
    "tips": "Thin with water if thick.",
    "note": "Double as dip sauce."
  },
  "mission": [
    "Traditional Korean Gochujang glaze",
    "Must maintain warm viscosity for basting",
    "Balance of heat and gloss is critical"
  ],
  "holding": {
    "temp": "65°C (Warm)",
    "limit": "Warm 2h | Cold 4d",
    "method": "Bain Marie (Covered)",
    "note": "Discard if caramelized."
  },
  "maintenance": "Check viscosity every 30m.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 19. RADISH PICKLE
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Radish Pickle', '{
  "meta": "SIDE // BRIGADE_SOP",
  "title": "Radish Pickle",
  "weekly": {
    "batch": ["Cubic Batch 1 (25kg)", "Cubic Batch 2 (25kg)", "Cubic Batch 3 (25kg)", "Brine Preparation Cycle"],
    "buffer": ["24h Maturation Check", "5kg Ready-to-Serve Reserve"]
  },
  "morning": {
    "tasks": ["Radish 2cm Cube Cycle", "Salt-Draw Rest (30m)", "Brine Pour & Seal", "AM Portioning Cycle"],
    "forward": ["Tomorrow Radish Order", "Brine Prep Ready"]
  },
  "service": {
    "setup": ["Cold well cup load", "Portion spoon clean", "Crisp Texture Test"],
    "garnish": ["As-is condiment"]
  },
  "strategy": {
    "method": "Salt-draw acid cure",
    "temp": "Hold 2-4°C",
    "tips": "Wait 24h for max crunch.",
    "note": "Absolute dependency for KFC."
  },
  "mission": [
    "Essential KFC palate cleanser",
    "24-hour cure cycle for cell structure",
    "Acoustic crunch is the target KPI"
  ],
  "holding": {
    "temp": "2-4°C",
    "limit": "4 Days (In Brine)",
    "method": "Sealed Liquid GN",
    "note": "Discard if soft."
  },
  "maintenance": "FIFO rotation daily.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 20. KIMCHI
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Kimchi', '{
  "meta": "SIDE // BRIGADE_SOP",
  "title": "Kimchi",
  "weekly": {
    "batch": ["Cabbage Wilt 1 (40kg)", "Cabbage Wilt 2 (40kg)", "Porridge Base Prep", "Aromatic Blend Cycle"],
    "buffer": ["Fermentation Peak Check", "8kg Reserve Sealed"]
  },
  "morning": {
    "tasks": ["Wilt Rinse & Squeeze", "Paste Coating Cycle (Hand)", "Tight-Pack GN Seal", "Aged Stock Allocation"],
    "forward": ["Tomorrow Cabbage Order", "Chili Paste Prep ready"]
  },
  "service": {
    "setup": ["Cold cup portioning", "Aroma check AM", "Fridge temp monitor"],
    "garnish": ["Toasted sesame ready"]
  },
  "strategy": {
    "method": "Hand-coat ferment",
    "temp": "Hold 2-4°C (Post-Ferment)",
    "tips": "Zero air pockets in pack.",
    "note": "Aged for fried rice/soup."
  },
  "mission": [
    "Artisan fermentation management",
    "Strict anaerobic packing required",
    "Flavor profile evolves with aging"
  ],
  "holding": {
    "temp": "2-4°C",
    "limit": "10 Days Optimal",
    "method": "Sealed tight-packed GN",
    "note": "Use for cooking if sour."
  },
  "maintenance": "Gas-vent check daily.",
  "staff": "js"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 21. FLOUR MIX
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Flour Mix', '{
  "meta": "BASE // BRIGADE_SOP",
  "title": "Flour Mix — Coating",
  "weekly": {
    "batch": ["Batch 1 (10kg)", "Batch 2 (10kg)", "Batch 3 (10kg)", "Spice Sift Cycle"],
    "buffer": ["Spice Intensity Check", "2kg Dry Reserve"]
  },
  "morning": {
    "tasks": ["AM Sift & Blend", "Breading Station Load", "Dry-to-Wet Test", "Airtight Bin Check"],
    "forward": ["Tomorrow Flour Order", "Spice Pre-mix Packet"]
  },
  "service": {
    "setup": ["Station 1 Dry Load", "Clump clearing AM", "Sifter near fryer"],
    "garnish": ["N/A Base"]
  },
  "strategy": {
    "method": "Spice-merged dry flour",
    "temp": "Room temp storage",
    "tips": "Refresh if clumping seen.",
    "note": "Main KFC foundation."
  },
  "mission": [
    "Primary binding and flavor base",
    "Sifting integrity prevents heavy coating",
    "Zero moisture contamination zone"
  ],
  "holding": {
    "temp": "Room Temp (Dry)",
    "limit": "5 Days",
    "method": "Airtight Containers",
    "note": "Discard if oily smell."
  },
  "maintenance": "Moisture check every 2h.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 22. STARCH MIX
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Starch Mix', '{
  "meta": "BASE // BRIGADE_SOP",
  "title": "Starch Mix — Final Coat",
  "weekly": {
    "batch": ["Batch 1 (10kg)", "Batch 2 (10kg)", "Starch 1:1 Blend AM", "Airtight Bin Check"],
    "buffer": ["Crunch Calibration", "2kg Reserve Ready"]
  },
  "morning": {
    "tasks": ["AM Visual Blend Check", "Station 3 Dry Load", "Panko/Starch Balance", "Equipment Check"],
    "forward": ["Tomorrow Starch Order", "Bin Clean Cycle"]
  },
  "service": {
    "setup": ["Station 3 Load", "Press pressure test", "Shake basket clear"],
    "garnish": ["N/A Base"]
  },
  "strategy": {
    "method": "1:1 Dry Starch Shell",
    "temp": "Room Temp",
    "tips": "Press firmly for crunch.",
    "note": "The final crunch layer."
  },
  "mission": [
    "The 'glass-crunch' architecture layer",
    "Correct pressing technique is vital",
    "Ensures prolonged hold time for deliveries"
  ],
  "holding": {
    "temp": "Room Temp (Dry)",
    "limit": "7 Days",
    "method": "Sealed Containers",
    "note": "Discard if wet lumps."
  },
  "maintenance": "Clump sift every session.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;

-- 23. EGG WASH
INSERT INTO sop_presentations (client_id, dish_name, presentation_json)
VALUES ('kabile', 'Egg Wash', '{
  "meta": "BASE // BRIGADE_SOP",
  "title": "Egg Wash — Binding Agent",
  "weekly": {
    "batch": ["AM Fresh Whisk Only", "Milk Stock Check", "Egg Tray Count", "Dairy Order Verification"],
    "buffer": ["5-min Rebuild Ready", "Reserve Milk 2L"]
  },
  "morning": {
    "tasks": ["Session Whisk (100 Eggs)", "Milk Emulsion Test", "Station 2 Load", "Cold Well Setup"],
    "forward": ["Tomorrow Egg Count", "Fresh Milk Order"]
  },
  "service": {
    "setup": ["Station 2 Load", "Whisk at station", "Salinity check AM"],
    "garnish": ["N/A Functional Bind"]
  },
  "strategy": {
    "method": "Fresh session emulsion",
    "temp": "Hold 2-4°C Fridge/Station",
    "tips": "Always whisk before dip.",
    "note": "Never carry over eggs."
  },
  "mission": [
    "The glue for the Kabile crust",
    "Same-day freshness only (Bio-Safety)",
    "Ensures even coating and moisture retention"
  ],
  "holding": {
    "temp": "2-4°C",
    "limit": "Same Day (Discard)",
    "method": "Covered GN at Station",
    "note": "Food safety: bin at close."
  },
  "maintenance": "Temp check every 1h.",
  "staff": "j"
}')
ON CONFLICT (client_id, dish_name) DO UPDATE SET presentation_json = EXCLUDED.presentation_json;
