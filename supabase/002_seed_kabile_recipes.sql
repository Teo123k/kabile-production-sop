-- =====================================================
-- SEED: Import existing MASTER_RECIPES into sop_recipes
-- Run AFTER 001_create_sop_recipes.sql
-- =====================================================

INSERT INTO public.sop_recipes (
  client_id, recipe_name, recipe_id, sort_order,
  base_yield, yield_unit, tier, dish_style,
  bulk_threshold, portion_size, density_note,
  ingredients, method, bulk_method, note,
  scaling_tips, sub_recipe_map,
  image_url, dish_image_url,
  prep_time, cook_time,
  source, ai_enriched
) VALUES

-- 1. Magic Soy
('kabile', '1. Magic Soy (Master Base)', 'magic-soy', 1,
 11, 'L', 'Tier 1 (3-4 Days)', 'sauce',
 22, 0.15, NULL,
 '[
   {"category":"liquid","name":"Dark Soy Sauce","qty":4,"unit":"L","sku":"SOY-DRK-4L","isMain":true},
   {"category":"liquid","name":"Filtered Water","qty":5,"unit":"L","sku":"WTR-FLT"},
   {"category":"liquid","name":"Mirin","qty":2,"unit":"L","sku":"MIR-JPN-2L"},
   {"category":"aromatic","name":"Garlic Puree","qty":500,"unit":"g","sku":"GAR-PUR-FR"},
   {"category":"aromatic","name":"Ginger Puree","qty":50,"unit":"g","sku":"GIN-PUR-FR"},
   {"category":"aromatic","name":"Onion Puree","qty":500,"unit":"g","sku":"ONN-PUR-FR"},
   {"category":"aromatic","name":"Pineapple Puree","qty":1,"unit":"kg","sku":"PNP-PUR-1K"},
   {"category":"spice","name":"White Sugar","qty":200,"unit":"g","sku":"SGR-WHT-KG"}
 ]'::jsonb,
 '["Puree aromatics perfectly smooth.","Combine liquids and sugar.","Incorporate aromatic puree.","Store chilled; shelf life 10 days."]'::jsonb,
 '["Use industrial immersion blender.","Mix in 50L barrels.","Verify Brix levels for consistency."]'::jsonb,
 'Mother sauce base. Essential for 80% of the menu. Ensure all aromatics are passed through a fine chinois if texture is grainy.',
 '{"regular":"Whisk vigorously to ensure sugar dissolution.","largeScale":"Use industrial immersion blender. Cold-infusion requires 24h for aromatic peak."}'::jsonb,
 '{}'::jsonb,
 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400',
 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&q=80&w=400',
 '20 mins', '0 mins',
 'manual', false),

-- 2. Bulgogi Marinade
('kabile', '2. Bulgogi Marinade', 'bulgogi', 2,
 2, 'kg Beef', 'Tier 2 (Daily)', 'marinade',
 10, 0.18, 'Ratio: 450g Sauce per 1kg Meat',
 '[
   {"cat":"MEAT","name":"Raw Beef (Sliced)","qty":2,"unit":"kg","sku":"MT-BEEF-SLI","isMain":true},
   {"cat":"BASE","name":"Magic Soy","qty":300,"unit":"g","sku":"INT-MAG-SOY"},
   {"cat":"BASE","name":"Light Soy Sauce","qty":120,"unit":"g","sku":"SOY-LGT-KG"},
   {"cat":"BASE","name":"Mirin","qty":40,"unit":"g","sku":"MIR-JPN-KG"},
   {"cat":"BASE","name":"Filtered Water","qty":40,"unit":"g","sku":"WTR-FLT"},
   {"cat":"FAT","name":"Bone Marrow","qty":150,"unit":"g","sku":"BN-MRW-FR"},
   {"cat":"AROMATIC","name":"Fresh Garlic","qty":20,"unit":"g","sku":"GAR-FR-KG"},
   {"cat":"AROMATIC","name":"Fresh Ginger","qty":5,"unit":"g","sku":"GIN-FR-KG"},
   {"cat":"AROMATIC","name":"Spring Onion","qty":80,"unit":"g","sku":"SPR-ONN-FR"},
   {"cat":"DRY","name":"White Sugar","qty":70,"unit":"g","sku":"SGR-WHT-KG"},
   {"cat":"DRY","name":"MSG","qty":4,"unit":"g","sku":"MSG-PUR-KG"},
   {"cat":"DRY","name":"Black Pepper","qty":4,"unit":"g","sku":"PEP-BLK-KG"},
   {"cat":"WET","name":"Oyster Sauce","qty":40,"unit":"g","sku":"OYS-SCE-KG"},
   {"cat":"WET","name":"Sesame Oil","qty":15,"unit":"g","sku":"SES-OIL-KG"},
   {"cat":"WET","name":"Potato Starch","qty":6,"unit":"g","sku":"POT-STCH-KG"}
 ]'::jsonb,
 '["Emulsify marrow with liquids.","Whisk in drys and starch.","Mix with beef.","Marinate 2-4 hrs."]'::jsonb,
 '["Oven Roast: 210°C / 0% Steam.","Lay meat single layer on GN trays for char.","Cook 6-8 mins."]'::jsonb,
 'Marrow reduced to 150g for stable emulsion.',
 '{"regular":"Maintain standard ratios.","largeScale":"Monitor heat levels."}'::jsonb,
 '{"INT-MAG-SOY":"magic-soy"}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 3. Dakgalbi Marinade
('kabile', '3. Dakgalbi Marinade', 'dakgalbi', 3,
 5, 'kg Chicken', 'Tier 2 (Daily)', 'marinade',
 15, 0.2, NULL,
 '[
   {"cat":"MEAT","name":"Chicken Thighs","qty":5,"unit":"kg","sku":"MT-CHK-THI","isMain":true},
   {"cat":"LIQUID","name":"Filtered Water","qty":140,"unit":"g","sku":"WTR-FLT"},
   {"cat":"LIQUID","name":"Mirin","qty":60,"unit":"g","sku":"MIR-JPN-KG"},
   {"cat":"LIQUID","name":"Light Soy Sauce","qty":70,"unit":"g","sku":"SOY-LGT-KG"},
   {"cat":"LIQUID","name":"Soju","qty":35,"unit":"g","sku":"ALC-SOJ-360"},
   {"cat":"PASTE","name":"Gochujang","qty":140,"unit":"g","sku":"GOJ-SCE-KG"},
   {"cat":"PASTE","name":"Doubanjiang","qty":30,"unit":"g","sku":"DOU-SCE-KG"},
   {"cat":"SPICE","name":"Standard Chili Pwd","qty":35,"unit":"g","sku":"CHI-PWD-STD"},
   {"cat":"SPICE","name":"Cheongyang Chili","qty":20,"unit":"g","sku":"CHI-PWD-CHY"},
   {"cat":"DRY","name":"White Sugar","qty":70,"unit":"g","sku":"SGR-WHT-KG"},
   {"cat":"DRY","name":"Corn Syrup","qty":135,"unit":"g","sku":"CRN-SYP-KG"},
   {"cat":"AROMATIC","name":"Onion Puree","qty":75,"unit":"g","sku":"ONN-PUR-FR"},
   {"cat":"AROMATIC","name":"Garlic Puree","qty":35,"unit":"g","sku":"GAR-PUR-FR"},
   {"cat":"WET","name":"Pear Juice","qty":30,"unit":"g","sku":"JCE-PEA-CAN"}
 ]'::jsonb,
 '["Blend aromatics with juices.","Whisk in pastes and syrups.","Sift in chili powders last."]'::jsonb,
 '[]'::jsonb,
 'Needs 24h rest to deepen chili color.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 4. Japanese Curry Roux
('kabile', '4. Japanese Curry Roux', 'curry-roux', 4,
 10, 'Portions', 'Tier 2 (Daily)', 'sauce',
 30, NULL, NULL,
 '[
   {"cat":"VEG","name":"Yellow Onion","qty":300,"unit":"g","sku":"PRD-ONN-FR"},
   {"cat":"VEG","name":"Carrot","qty":60,"unit":"g","sku":"PRD-CRT-FR"},
   {"cat":"VEG","name":"Fuji Apple","qty":70,"unit":"g","sku":"PRD-APL-FR"},
   {"cat":"FAT","name":"Butter (Roux)","qty":70,"unit":"g","sku":"BTR-UNS-KG"},
   {"cat":"ROUX","name":"Plain Flour","qty":120,"unit":"g","sku":"FLR-PLN-KG"},
   {"cat":"SPICE","name":"Turmeric Powder","qty":3,"unit":"g","sku":"SPI-TUR-KG"},
   {"cat":"WET","name":"White Miso","qty":15,"unit":"g","sku":"MSI-WHT-KG"},
   {"cat":"STOCK","name":"Vegetable Stock","qty":2.8,"unit":"L","sku":"STK-VEG-L"}
 ]'::jsonb,
 '["Sauté and blend veg.","Prepare roux (15m nutty).","Whisk in stock slowly."]'::jsonb,
 '[]'::jsonb,
 'Roux should be nutty and chocolate colored.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 5. Udon Base
('kabile', '5. Udon Base', 'udon-base', 5,
 1, 'Portion', 'Tier 2 (Daily)', 'main',
 NULL, NULL, NULL,
 '[
   {"cat":"NOODLE","name":"Raw Udon","qty":270,"unit":"g","sku":"UDN-NDL-RAW"},
   {"cat":"DRY","name":"Fine Salt","qty":0.5,"unit":"g","sku":"SLT-TBL-KG"},
   {"cat":"LIQUID","name":"Light Soy Sauce","qty":4,"unit":"g","sku":"SOY-LGT-KG"},
   {"cat":"LIQUID","name":"Neutral Oil","qty":4,"unit":"g","sku":"OIL-VEG-L"}
 ]'::jsonb,
 '["Boil udon 3-4 mins.","Drain and oil.","Mix seasonings hot."]'::jsonb,
 '[]'::jsonb,
 'Season while hot for maximum absorption.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 6. FC Flour Mix
('kabile', '6. FC Flour Mix', 'fc-flour', 6,
 1, 'kg Mix', 'Tier 1 (3-4 Days)', 'prep',
 NULL, NULL, NULL,
 '[
   {"cat":"BASE","name":"Plain Flour","qty":1000,"unit":"g","sku":"FLR-PLN-KG"},
   {"cat":"BASE","name":"Corn Starch","qty":60,"unit":"g","sku":"CRN-STCH-KG"},
   {"cat":"SPICE","name":"Paprika Powder","qty":10,"unit":"g","sku":"SPI-PAP-KG"},
   {"cat":"DRY","name":"Fine Salt","qty":20,"unit":"g","sku":"SLT-TBL-KG"}
 ]'::jsonb,
 '["Combine drys.","Sift twice.","Batch into 5kg bags."]'::jsonb,
 '[]'::jsonb,
 'Universal chicken coating base.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 7. Asian Coleslaw
('kabile', '7. Asian Coleslaw (Dry-Crisp)', 'coleslaw', 7,
 3.5, 'kg Veg', 'Tier 2 (Daily)', 'side',
 10, NULL, NULL,
 '[
   {"cat":"VEG","name":"White Cabbage","qty":2,"unit":"kg","sku":"VEG-CAB-WHT"},
   {"cat":"VEG","name":"Red Cabbage","qty":1,"unit":"kg","sku":"VEG-CAB-RED"},
   {"cat":"VEG","name":"Carrot","qty":0.5,"unit":"kg","sku":"PRD-CRT-FR"},
   {"cat":"DRESSING FAT","name":"Vegetable Oil","qty":250,"unit":"g","sku":"OIL-VEG-L"},
   {"cat":"DRESSING FAT","name":"White Miso Paste","qty":80,"unit":"g","sku":"MSI-WHT-KG"},
   {"cat":"DRESSING ACID","name":"White Vinegar","qty":350,"unit":"g","sku":"VIN-WHT-KG"},
   {"cat":"DRESSING SALT","name":"Magic Soy","qty":200,"unit":"g","sku":"INT-MAG-SOY"},
   {"cat":"DRESSING SALT","name":"Light Soy Sauce","qty":150,"unit":"g","sku":"SOY-LGT-KG"},
   {"cat":"DRESSING WATER","name":"Filtered Water","qty":200,"unit":"g","sku":"WTR-FLT"},
   {"cat":"DRESSING SWEET","name":"White Sugar","qty":60,"unit":"g","sku":"SGR-WHT-KG"}
 ]'::jsonb,
 '["Ice-shock veg 15m.","Spin 100% bone-dry.","Coat with Oil/Miso FIRST.","Finish liquids."]'::jsonb,
 '[]'::jsonb,
 'NO SALT during prep to maintain crunch.',
 '{}'::jsonb,
 '{"INT-MAG-SOY":"magic-soy"}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 8. Sweet Spicy
('kabile', '8. Sweet Spicy (KFC Glaze)', 'sweet-spicy', 8,
 10, 'L', 'Tier 1 (3-4 Days)', 'glaze',
 NULL, NULL, NULL,
 '[
   {"cat":"PASTE","name":"Gochujang","qty":1,"unit":"kg","sku":"GOJ-SCE-KG"},
   {"cat":"PASTE","name":"Ketchup","qty":2,"unit":"L","sku":"KTC-SCE-L"},
   {"cat":"SPICE","name":"Gochugaru","qty":500,"unit":"g","sku":"CHI-PWD-KOR"},
   {"cat":"LIQUID","name":"Corn Syrup","qty":4,"unit":"L","sku":"CRN-SYP-L"},
   {"cat":"AROMATIC","name":"Garlic Puree","qty":1,"unit":"kg","sku":"GAR-PUR-FR"}
 ]'::jsonb,
 '["Mix cold.","Whisk smooth.","Refrigerate."]'::jsonb,
 '[]'::jsonb,
 'Apply to hot chicken.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 9. Honey Butter
('kabile', '9. Honey Butter (KFC Glaze)', 'honey-butter', 9,
 1, 'Batch', 'Tier 1 (3-4 Days)', 'glaze',
 NULL, NULL, NULL,
 '[
   {"cat":"FAT","name":"Butter","qty":600,"unit":"g","sku":"BTR-UNS-KG"},
   {"cat":"WET","name":"Honey","qty":450,"unit":"g","sku":"HNY-WHT-KG"},
   {"cat":"LIQUID","name":"Soy Sauce","qty":900,"unit":"ml","sku":"SOY-LGT-L"}
 ]'::jsonb,
 '["Melt butter low.","Emulsify honey."]'::jsonb,
 '[]'::jsonb,
 'Hold warm at 45°C.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 10. BBQ Sauce
('kabile', '10. BBQ (KFC Glaze)', 'bbq-sauce', 10,
 1, 'Batch', 'Tier 1 (3-4 Days)', 'glaze',
 NULL, NULL, NULL,
 '[
   {"cat":"BASE","name":"Magic Soy","qty":1,"unit":"L","sku":"INT-MAG-SOY"},
   {"cat":"BASE","name":"Ketchup","qty":600,"unit":"ml","sku":"KTC-SCE-L"},
   {"cat":"DRY","name":"Sugar","qty":300,"unit":"g","sku":"SGR-WHT-KG"}
 ]'::jsonb,
 '["Simmer 15m.","Reduce to thick glaze."]'::jsonb,
 '[]'::jsonb,
 'Fusion Korean BBQ finish.',
 '{}'::jsonb,
 '{"INT-MAG-SOY":"magic-soy"}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 11. Thai Spicy
('kabile', '11. Thai Spicy (KFC Glaze)', 'thai-spicy', 11,
 1, 'Batch', 'Tier 1 (3-4 Days)', 'glaze',
 NULL, NULL, NULL,
 '[
   {"cat":"BASE","name":"BBQ Base","qty":2,"unit":"L","sku":"INT-BBQ-SCE"},
   {"cat":"WET","name":"Sriracha","qty":500,"unit":"ml","sku":"SRI-SCE-L"},
   {"cat":"WET","name":"Lime Juice","qty":3,"unit":"pcs","sku":"PRD-LME-FR"}
 ]'::jsonb,
 '["Simmer bases.","Add acid off-heat."]'::jsonb,
 '[]'::jsonb,
 'High acid spicy profile.',
 '{}'::jsonb,
 '{"INT-BBQ-SCE":"bbq-sauce"}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 12. Blue Cheese Dip
('kabile', '12. Blue Cheese Dip', 'blue-cheese', 12,
 1, 'Batch', 'Tier 1 (3-4 Days)', 'side',
 NULL, NULL, NULL,
 '[
   {"cat":"WET","name":"Mayonnaise","qty":1.5,"unit":"L","sku":"MAYO-STD-L"},
   {"cat":"PROTEIN","name":"Blue Cheese","qty":200,"unit":"g","sku":"CHS-BLU-KG"},
   {"cat":"SPICE","name":"Black Pepper","qty":1,"unit":"tsp","sku":"PEP-BLK-KG"}
 ]'::jsonb,
 '["Whisk base.","Fold chunks gently."]'::jsonb,
 '[]'::jsonb,
 'Maintain chunk size.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 13. Tteokkochi Sauce
('kabile', '13. Tteokkochi Sauce', 'tteokkochi', 13,
 1, 'Batch', 'Tier 1 (3-4 Days)', 'glaze',
 NULL, NULL, NULL,
 '[
   {"cat":"PASTE","name":"Gochujang","qty":300,"unit":"g","sku":"GOJ-SCE-KG"},
   {"cat":"WET","name":"Corn Syrup","qty":350,"unit":"g","sku":"CRN-SYP-KG"},
   {"cat":"AROMATIC","name":"Garlic","qty":80,"unit":"g","sku":"GAR-PUR-FR"}
 ]'::jsonb,
 '["Simmer 10m.","Brush on hot cakes."]'::jsonb,
 '[]'::jsonb,
 'Glossy high-viscosity finish.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 14. Classic Tteokbokki
('kabile', '14. Classic Tteokbokki', 'tteokbokki', 14,
 10, 'Portions', 'Tier 2 (Daily)', 'main',
 NULL, NULL, NULL,
 '[
   {"cat":"MAIN","name":"Rice Cake","qty":2,"unit":"kg","sku":"RCE-CKE-CYL"},
   {"cat":"MAIN","name":"Fish Cake","qty":600,"unit":"g","sku":"FSH-CKE-SHT"},
   {"cat":"LIQUID","name":"Anchovy Stock","qty":2.5,"unit":"L","sku":"STK-ANC-L"},
   {"cat":"PASTE","name":"Gochujang","qty":400,"unit":"g","sku":"GOJ-SCE-KG"}
 ]'::jsonb,
 '["Boil stock.","Braise cakes until soft."]'::jsonb,
 '[]'::jsonb,
 'Velvety sauce reduction.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 15. Radish Pickle
('kabile', '15. Radish Pickle', 'radish-pickle', 15,
 3, 'kg Radish', 'Tier 1 (3-4 Days)', 'side',
 NULL, NULL, NULL,
 '[
   {"cat":"VEG","name":"Radish","qty":3,"unit":"kg","sku":"PRD-RAD-FR"},
   {"cat":"LIQUID","name":"Vinegar","qty":1.5,"unit":"L","sku":"VIN-WHT-L"},
   {"cat":"DRY","name":"Sugar","qty":500,"unit":"g","sku":"SGR-WHT-KG"}
 ]'::jsonb,
 '["Cube radish.","Submerge in brine."]'::jsonb,
 '[]'::jsonb,
 '7-day shelf life.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false),

-- 16. Kimchi
('kabile', '16. Kimchi (Full Prep)', 'kimchi', 16,
 1, 'Batch', 'Tier 1 (3-4 Days)', 'side',
 NULL, NULL, NULL,
 '[
   {"cat":"PREP","name":"Napa Cabbage","qty":12,"unit":"kg","sku":"KIM-CAB-RAW"},
   {"cat":"PORRIDGE","name":"Rice Flour","qty":300,"unit":"g","sku":"FLR-RCE-KG"},
   {"cat":"PASTE","name":"Gochugaru","qty":2,"unit":"kg","sku":"CHI-PWD-KOR"},
   {"cat":"PASTE","name":"Garlic Puree","qty":285,"unit":"g","sku":"GAR-PUR-FR"}
 ]'::jsonb,
 '["Wilt cabbage 3h.","Cool porridge.","Mix paste; Coat."]'::jsonb,
 '[]'::jsonb,
 'Ferment 24h at RT.',
 '{}'::jsonb,
 '{}'::jsonb,
 NULL, NULL,
 NULL, NULL,
 'manual', false)

ON CONFLICT (recipe_id) DO UPDATE SET
  recipe_name = EXCLUDED.recipe_name,
  ingredients = EXCLUDED.ingredients,
  method = EXCLUDED.method,
  bulk_method = EXCLUDED.bulk_method,
  note = EXCLUDED.note,
  scaling_tips = EXCLUDED.scaling_tips,
  sub_recipe_map = EXCLUDED.sub_recipe_map,
  updated_at = now();
