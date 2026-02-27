-- BULK RE-INGEST: KABILE PRODUCTION MANUAL (v7: ABSOLUTE COMPLETENESS & DE-BATCHED)
-- 100% Comprehensive: All 23 recipes from the Master MD.
-- EVERY ingredient from the MD is included. No omissions.
-- NO "Batch" units for ingredients. Everything scaled to raw grams/ml.

DELETE FROM consulting_sops WHERE client_id = 'kabile';

-- ==========================================
-- PREP COMPONENTS (The Building Blocks)
-- ==========================================

-- 1. MAGIC SOY
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Magic Soy', 'Korean', 'prep',
  $$
  {
    "id": "magic-soy",
    "name": "1. Magic Soy (Master Base)",
    "baseYield": 11000,
    "unit": "ml",
    "tier": "Tier 1 (Multi-Day)",
    "ingredients": [
      {"cat": "LIQUID", "name": "Light Soy", "qty": 4000, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "LIQUID", "name": "Water", "qty": 5000, "unit": "ml", "sku": "LIQ-WTR-TAP"},
      {"cat": "LIQUID", "name": "Mirin", "qty": 2000, "unit": "ml", "sku": "LIQ-MIR-JPN"},
      {"cat": "AROMATIC", "name": "Garlic puree", "qty": 500, "unit": "g", "sku": "ARO-GAR-PUR"},
      {"cat": "AROMATIC", "name": "Ginger puree", "qty": 50, "unit": "g", "sku": "ARO-GIN-PUR"},
      {"cat": "AROMATIC", "name": "Onion puree", "qty": 500, "unit": "g", "sku": "ARO-ONN-PUR"},
      {"cat": "AROMATIC", "name": "Pineapple puree", "qty": 1000, "unit": "g", "sku": "ARO-PIN-PUR"},
      {"cat": "DRY", "name": "Sugar", "qty": 200, "unit": "g", "sku": "DRY-SGR-WHT"}
    ],
    "method": ["Blend aromatics.", "Mix liquids.", "Store cold."],
    "note": "Base for all sauces."
  }
  $$,
  $$ {"meta": "BASE // ADAPTIVE_BRIGADE_SOP", "title": "Magic Soy", "weekly": {"batch": ["Batch minimum 22L twice weekly", "Split into two 11L containers for cross-station access", "Yield buffer: always maintain one sealed backup batch in cold storage", "Cross-utilization: Bulgogi, BBQ, Coleslaw all draw from same base"], "buffer": ["Keep minimum 5L sealed at all times", "Trigger new batch when primary drops below 3L", "Label all containers with batch date and projected depletion"]}, "morning": {"tasks": ["[Foundation] Combine all liquids in 20L pot — runs unattended on low", "[Prep Block] Measure and blend aromatic purées while liquids heat — junior executable", "[Critical Control] Senior verifies liquid ratio before aromatics added", "[Parallel Station] Once blended, bottle into labeled containers while other prep continues"], "forward": ["Pre-fill sauce station bottles for Bulgogi and BBQ", "Cross-fill 200g portions tagged for Coleslaw dressing", "Rotate oldest batch to front of cold shelf"]}, "service": {"setup": ["Bring one day-use container to ambient (not heated — used cold in derivatives)", "All drawing sauces pre-portioned at their own stations", "No live service requirement — fully pre-deployed in derived sauces", "Quality check: clarity, aroma, correct salinity"], "garnish": ["N/A — foundational prep only", "Used within derivatives — not plated directly"]}, "strategy": {"method": "Modular foundation batch with cold-chain derivative distribution", "temp": "Hold: 2–4°C | Max infusion: 85°C | Never boil aromatics post-blend", "tips": "Blend aromatics separately, combine cold for better clarity in finished sauces.", "note": "System works under multi-chef load because Magic Soy is prepared ahead of all derived sauces. Any station can access its allocated portion independently, avoiding bottlenecks. Puree blending can run simultaneously at a second station."},  "holding": {"temp": "2–4°C", "limit": "5 days sealed", "method": "Sealed GN containers, labelled by batch date", "note": "Discard if soy oxidation darkens color significantly or aroma turns sour."}, "maintenance": "High-dependency base. Daily stock-level check mandatory before service.", "staff": "js"} $$
);

-- 2. BULGOGI SAUCE (PREP)
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Bulgogi Sauce', 'Korean', 'marinade',
  $$
  {
    "id": "bulgogi-sauce",
    "name": "2. Bulgogi Sauce",
    "baseYield": 1000,
    "unit": "g",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "BASE", "name": "Magic Soy", "qty": 300, "unit": "g", "sku": "INT-MAG-SOY"},
      {"cat": "LIQUID", "name": "Soy sauce", "qty": 120, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "LIQUID", "name": "Mirin", "qty": 40, "unit": "ml", "sku": "LIQ-MIR-JPN"},
      {"cat": "LIQUID", "name": "Water", "qty": 40, "unit": "ml", "sku": "LIQ-WTR-TAP"},
      {"cat": "DRY", "name": "Sugar", "qty": 70, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "WET", "name": "Oyster sauce", "qty": 40, "unit": "g", "sku": "WET-OYS-SCE"},
      {"cat": "DRY", "name": "MSG", "qty": 4, "unit": "g", "sku": "DRY-MSG-WHT"},
      {"cat": "AROMATIC", "name": "Garlic", "qty": 20, "unit": "g", "sku": "ARO-GAR-FR"},
      {"cat": "AROMATIC", "name": "Ginger", "qty": 5, "unit": "g", "sku": "ARO-GIN-FR"},
      {"cat": "AROMATIC", "name": "Spring onion", "qty": 80, "unit": "g", "sku": "ARO-SPN-FR"},
      {"cat": "FAT", "name": "Bone marrow", "qty": 250, "unit": "g", "sku": "FAT-MAR-BEF"},
      {"cat": "FAT", "name": "Sesame oil", "qty": 15, "unit": "ml", "sku": "FAT-SES-OIL"},
      {"cat": "SPICE", "name": "Black pepper", "qty": 4, "unit": "g", "sku": "SPI-PEP-BLK"},
      {"cat": "DRY", "name": "Potato starch", "qty": 6, "unit": "g", "sku": "DRY-STA-POT"}
    ],
    "method": ["Blend marrow with liquids.", "Store refrigerated."],
    "note": "Premium marinade."
  }
  $$,
  $$ {"meta": "SAUCE // ADAPTIVE_BRIGADE_SOP", "title": "Bulgogi Sauce", "weekly": {"batch": ["Batch 3–4kg twice weekly, size to weekly beef cover", "Keep one sealed working batch and one backup in cold storage", "Bone marrow must be pre-rendered — schedule render as Phase A task", "Cross-use: consider Bulgogi Sauce as secondary glaze for grilled items"], "buffer": ["Maintain 1kg minimum ready for immediate dispatch", "Trigger new production if working batch drops below 800g", "Date and weight-mark all containers"]}, "morning": {"tasks": ["[Foundation] Pre-render bone marrow low and slow until fully liquified — runs unattended", "[Prep Block] Measure all dry seasonings into pre-labelled bowls — junior executable", "[Parallel Station] While marrow renders, junior blends aromatics at sauce station", "[Critical Control] Senior verifies final salt and umami balance before bottling"], "forward": ["Pre-portion 100g sauce sachets for direct service use at grill station", "Cross-check beef marination schedule — sliced beef must marinate minimum 12h", "Label all containers with batch date and protein allocation"]}, "service": {"setup": ["Pre-marinated beef at grill station, sauce already absorbed", "Holding containers with additional sauce available for plating finish", "Grill station fires beef to order — no sauce reheating required during service", "Check texture: sauce should be glossy and slightly viscous when cold"], "garnish": ["Finish plated beef with light drizzle from squeeze bottle", "Garnish: toasted sesame seed, sliced spring onion"]}, "strategy": {"method": "Pre-marinated protein with modular bone marrow emulsion base", "temp": "Marination: 2–4°C | Grill finish: 200°C+ | Sauce hold: 4°C", "tips": "Emulsify marrow while warm — if it splits, reheat gently and re-blend.", "note": "System is stable under multi-chef load because marination occurs ahead of service. Grill execution is straightforward for any trained station chef. Sauce bottled by junior removes complexity at service."},  "holding": {"temp": "2–4°C", "limit": "3–4 days", "method": "Sealed squeeze bottles or GN containers with lids", "note": "Discard if marrow fat separates and re-emulsification fails after warming."}, "maintenance": "Monitor marrow emulsion cohesion. High umami — quality test daily.", "staff": "js"} $$
);

-- 3. DAKGALBI SAUCE (Prep)
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Dakgalbi Sauce', 'Korean', 'marinade',
  $$
  {
    "id": "dakgalbi-sauce",
    "name": "3. Dakgalbi Sauce",
    "baseYield": 1000,
    "unit": "g",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "LIQUID", "name": "Water", "qty": 140, "unit": "ml", "sku": "LIQ-WTR-TAP"},
      {"cat": "LIQUID", "name": "Mirin", "qty": 60, "unit": "ml", "sku": "LIQ-MIR-JPN"},
      {"cat": "LIQUID", "name": "Soy sauce", "qty": 70, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "LIQUID", "name": "Soju", "qty": 35, "unit": "ml", "sku": "LIQ-SOJ-KRN"},
      {"cat": "LIQUID", "name": "Cider", "qty": 20, "unit": "ml", "sku": "LIQ-CID-KRN"},
      {"cat": "PASTE", "name": "Gochujang", "qty": 140, "unit": "g", "sku": "PST-GOJ-KRN"},
      {"cat": "PASTE", "name": "Doubanjiang", "qty": 30, "unit": "g", "sku": "PST-DBJ-CHN"},
      {"cat": "DRY", "name": "Sugar", "qty": 70, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "WET", "name": "Corn syrup", "qty": 135, "unit": "ml", "sku": "WET-CRN-SYP"},
      {"cat": "SPICE", "name": "Chili powder", "qty": 35, "unit": "g", "sku": "SPI-CHI-PWD"},
      {"cat": "SPICE", "name": "Cheongyang chili", "qty": 20, "unit": "g", "sku": "SPI-CHI-HOT"},
      {"cat": "SPICE", "name": "Coarse chili", "qty": 20, "unit": "g", "sku": "SPI-CHI-CRS"},
      {"cat": "SPICE", "name": "Curry powder", "qty": 15, "unit": "g", "sku": "SPI-CUR-PWD"},
      {"cat": "SPICE", "name": "Black pepper", "qty": 1.5, "unit": "g", "sku": "SPI-PEP-BLK"},
      {"cat": "DRY", "name": "MSG", "qty": 15, "unit": "g", "sku": "DRY-MSG-WHT"},
      {"cat": "DRY", "name": "Dashida", "qty": 15, "unit": "g", "sku": "DRY-DSD-BEF"},
      {"cat": "AROMATIC", "name": "Onion", "qty": 75, "unit": "g", "sku": "ARO-ONN-FR"},
      {"cat": "AROMATIC", "name": "Garlic", "qty": 35, "unit": "g", "sku": "ARO-GAR-FR"},
      {"cat": "AROMATIC", "name": "Ginger", "qty": 10, "unit": "g", "sku": "ARO-GIN-FR"},
      {"cat": "WET", "name": "Pear juice", "qty": 30, "unit": "g", "sku": "WET-PEA-JCE"},
      {"cat": "WET", "name": "Apple juice", "qty": 20, "unit": "g", "sku": "WET-APL-JCE"},
      {"cat": "FAT", "name": "Sesame oil", "qty": 3, "unit": "ml", "sku": "FAT-SES-OIL"},
      {"cat": "DRY", "name": "Sesame seed powder", "qty": 5, "unit": "g", "sku": "DRY-SES-PWD"}
    ],
    "method": ["Blend smooth."],
    "note": "Complex chicken marinade."
  }
  $$,
  $$ {"meta": "SAUCE // ADAPTIVE_BRIGADE_SOP", "title": "Dakgalbi Sauce", "weekly": {"batch": ["Batch 3kg minimum twice weekly", "Use peak-day split: make larger batch Monday, top-up Thursday", "Buffer stock: one sealed 1kg backup at all times", "Cross-use: Dakgalbi sauce doubles as spicy glaze base for chicken skewers"], "buffer": ["Trigger refill when batch drops below 600g", "Label with date, weight, and heat-intensity note (calibration batch vs. standard)"]}, "morning": {"tasks": ["[Foundation] Combine all liquids in bowl — no heat required until final blend step — runs unattended if pre-measured", "[Prep Block] Weigh all pastes and dry spices separately — junior executable using labelled stations", "[Parallel Station] While pastes are measured, junior dices aromatics simultaneously", "[Critical Control] Senior verifies heat level via tasted small portion before bottling"], "forward": ["Pre-portion 100g sachets per chicken service portion", "Cross-prep: small batch derivative for skewer glaze (reduce by 20%)", "Tag all containers with heat rating for front-of-house communication"]}, "service": {"setup": ["Marinated chicken at stir-fry station, sauce already integrated", "Small sauce reserve at station for final basting", "Stir-fry in batches of 2 portions maximum for heat control", "Verify chicken internal temp 75°C before plating"], "garnish": ["Toasted sesame, spring onion rings, fine-sliced chili", "Optional: perilla leaf for aroma contrast"]}, "strategy": {"method": "12h marination protocol with high-heat stir-fry service execution", "temp": "Marinade hold: 2–4°C | Stir-fry: 220°C+ | Internal chicken: 75°C", "tips": "Stagger batches to avoid steam accumulation — dry heat essential for caramelization.", "note": "Multi-chef system works because marination is done 12h+ ahead. At service, junior can stir-fry pre-portioned batches with junior-safe indicators (color, aroma, internal temp). Senior only required for daily calibration."},  "holding": {"temp": "Sauce: 2–4°C | Marinated chicken: 2–4°C", "limit": "Sauce 4 days | Marinated raw chicken max 24h", "method": "Sauce in sealed squeeze bottle | Chicken in covered GN with portion dividers", "note": "Discard sauce if fermentation smell develops. Raw marinated chicken follows raw protein holding rules."},  "maintenance": "High spice concentration — monitor heat level drift batch to batch.", "staff": "js"} $$
);

-- 4. UDON BASE
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Udon Base', 'Japanese', 'prep',
  $$
  {
    "id": "udon-base",
    "name": "8. Udon Base",
    "is_sub_recipe": true,
    "parent_sku": "katsu-curry",
    "ratio": 150,
    "baseYield": 10,
    "unit": "Portions",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "MAIN", "name": "Raw udon", "qty": 2700, "unit": "g", "sku": "DRY-UDN-RAW", "isMain": true},
      {"cat": "LIQUID", "name": "Light soy", "qty": 40, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "DRY", "name": "Salt", "qty": 5, "unit": "g", "sku": "DRY-SLT-TBL"},
      {"cat": "DRY", "name": "Sugar", "qty": 10, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "DRY", "name": "Chicken powder", "qty": 6, "unit": "g", "sku": "DRY-CHK-PWD"},
      {"cat": "FAT", "name": "Neutral oil", "qty": 40, "unit": "ml", "sku": "FAT-OIL-NTL"},
      {"cat": "FAT", "name": "Sesame oil", "qty": 5, "unit": "ml", "sku": "FAT-SES-OIL"},
      {"cat": "LIQUID", "name": "Udon water", "qty": 150, "unit": "ml", "sku": "LIQ-WTR-UDN"}
    ],
    "method": ["Boil.", "Oil.", "Portion."],
    "note": "Rest 10 min."
  }
  $$,
  $$ {"meta": "PREP // ADAPTIVE_BRIGADE_SOP", "title": "Udon Base", "weekly": {"batch": ["Batch daily per service forecast — udon is best fresh-sauced same day", "Base yield: 10 portions (2700g raw = ~3.5kg cooked)", "Split-batch: prepare 60% AM, hold 40% dry-raw for PM batch if PM service is heavy", "Cross-use: udon base is the carb foundation for Katsu Curry bowls"], "buffer": ["Always have 20% portion buffer over forecast", "Pre-portion into individual 270g oiled noodle cakes", "Store individually wrapped to prevent sticking"]}, "morning": {"tasks": ["[Foundation] Large pot to boil — add salt, runs unattended 8–10 min", "[Prep Block] Drain, rinse cold, toss with neutral oil and sesame oil — junior executable", "[Parallel Station] While noodles rest, junior portions into individual noodle cakes on trays", "[Critical Control] Senior verifies texture — should be chewy but not raw center"], "forward": ["Pre-label all noodle cakes with portion number", "Cross-prep: hold 10% portion in cold water bath for Katsu service regeneration", "Udon water reserved — use as sauce loosener in Katsu Curry"]}, "service": {"setup": ["Individual portions at plating station, ready to heat via boiling water flash for 90 seconds", "Bowl pre-warmed before service", "Load noodles while protein fires — parallel assembly", "Sauce poured over noodles at point of plate — no separate heating step"], "garnish": ["Spring onion julienne", "Toasted sesame seed and optional nori strip"]}, "strategy": {"method": "Day-fresh portion prep with cold-hold and flash-regen at service", "temp": "Boil: 100°C | Service regen: boiling water 90s | Hold temp: 2–4°C", "tips": "Oil noodles immediately after drain — prevents sticking even after cold hold.", "note": "System works at volume because each portion is independently prepared and held cold. Flash-regen takes under 90 seconds, fitting within the sub-7-minute service window without senior oversight."},  "holding": {"temp": "2–4°C", "limit": "8 hours max after cooking", "method": "Individually wrapped oiled noodle cakes in GN, covered", "note": "Discard if noodles become sticky or break on handling — signal of over-holding."}, "maintenance": "Daily fresh prep. Do not batch ahead more than 1 service session.", "staff": "j"} $$
);

-- 5. CURRY VEGE BASE
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Curry Vege Base', 'Japanese', 'prep',
  $$
  {
    "id": "curry-vege-base",
    "name": "5. Curry Vege Base",
    "is_sub_recipe": true,
    "parent_sku": "katsu-curry",
    "ratio": 100,
    "baseYield": 1000,
    "unit": "g",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "VEG", "name": "Onion", "qty": 300, "unit": "g", "sku": "VEG-ONN-FR"},
      {"cat": "VEG", "name": "Carrot", "qty": 60, "unit": "g", "sku": "VEG-CRT-FR"},
      {"cat": "VEG", "name": "Apple", "qty": 70, "unit": "g", "sku": "VEG-APL-FR"},
      {"cat": "AROMATIC", "name": "Garlic", "qty": 15, "unit": "g", "sku": "ARO-GAR-FR"},
      {"cat": "AROMATIC", "name": "Ginger", "qty": 15, "unit": "g", "sku": "ARO-GIN-FR"},
      {"cat": "FAT", "name": "Oil", "qty": 20, "unit": "ml", "sku": "FAT-OIL-NTL"}
    ],
    "method": ["Sweat.", "Blend.", "Reduce."],
    "note": "Heart of flavor."
  }
  $$,
  $$ {"meta": "BASE // ADAPTIVE_BRIGADE_SOP", "title": "Curry Vege Base", "weekly": {"batch": ["Batch 4–5kg twice weekly — sweats down ~50% so plan input accordingly", "Store in 500g portioned sealed containers for easy dispatch", "Cross-use: base is shared across Katsu and any curry-derivative specials", "Peak-day buffer: keep one sealed 1kg backup batch at all times"], "buffer": ["Trigger re-batch when stock drops to one 500g portion", "Date and weight-label all containers"]}, "morning": {"tasks": ["[Foundation] Dice onion, carrot, apple — sweat in oil on medium heat — runs semi-unattended (stir every 5 min)", "[Prep Block] Junior monitors sweat progress using color indicator: onions must be translucent before blending", "[Parallel Station] While vege sweats, junior preps Curry Roux components at dry station", "[Critical Control] Senior blends and tastes for sweetness depth before portioning"], "forward": ["Pre-portion 100g blocks for Katsu service", "Reserve reduction liquid for Curry Roux thinning", "Cross-utilize base in any daily special curry"]}, "service": {"setup": ["Pre-portioned at sauce station — no live prep required during service", "Combined with Curry Roux and stock in pan during Katsu assembly", "Sauce comes together in under 3 minutes from portioned components", "Heat to 80°C before ladling — verify no starch lumps"], "garnish": ["Base is internal — not garnished directly", "Final curry plating: drizzle of finish butter, curry powder dusting optional"]}, "strategy": {"method": "Sweated vegetable purée with caramelization depth, pre-portioned for modular service", "temp": "Sweat: medium heat until translucent | Hold: 2–4°C | Reheat ceiling: 85°C", "tips": "Apple provides natural sweetness — don't skip or substitute with syrup.", "note": "Pre-portioned base allows junior to assemble Katsu Curry sauce in parallel with frying. System is stable because portions are pre-weighed, removing judgment from the heat station."},  "holding": {"temp": "2–4°C", "limit": "4 days sealed", "method": "Sealed 500g GN portions, stacked cold", "note": "Discard if puree develops ferment smell or color turns grey."}, "maintenance": "Batch schedule critical — this base gates the Katsu Curry dish.", "staff": "js"} $$
);

-- 6. CURRY ROUX
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Curry Roux', 'Japanese', 'prep',
  $$
  {
    "id": "curry-roux",
    "name": "6. Curry Roux",
    "is_sub_recipe": true,
    "parent_sku": "katsu-curry",
    "ratio": 100,
    "baseYield": 1000,
    "unit": "g",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "FAT", "name": "Butter", "qty": 70, "unit": "g", "sku": "FAT-BTR-WHT"},
      {"cat": "FAT", "name": "Oil", "qty": 20, "unit": "ml", "sku": "FAT-OIL-NTL"},
      {"cat": "DRY", "name": "Flour", "qty": 120, "unit": "g", "sku": "DRY-FLR-AP"},
      {"cat": "SPICE", "name": "Turmeric", "qty": 3, "unit": "g", "sku": "SPI-TRM-PWD"},
      {"cat": "SPICE", "name": "Coriander", "qty": 3, "unit": "g", "sku": "SPI-COR-PWD"},
      {"cat": "SPICE", "name": "Cumin", "qty": 1.5, "unit": "g", "sku": "SPI-CUM-PWD"},
      {"cat": "SPICE", "name": "Garam masala", "qty": 2, "unit": "g", "sku": "SPI-GMS-PWD"},
      {"cat": "SPICE", "name": "Black pepper", "qty": 1, "unit": "g", "sku": "SPI-PEP-BLK"},
      {"cat": "LIQUID", "name": "Soy sauce", "qty": 15, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "LIQUID", "name": "Worcestershire", "qty": 10, "unit": "ml", "sku": "LIQ-WRC-SCE"},
      {"cat": "PASTE", "name": "Miso", "qty": 15, "unit": "g", "sku": "PST-MSO-WHT"},
      {"cat": "PASTE", "name": "Tomato paste", "qty": 10, "unit": "g", "sku": "PST-TOM-PST"},
      {"cat": "DRY", "name": "Sugar", "qty": 5, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "DRY", "name": "Salt", "qty": 3, "unit": "g", "sku": "DRY-SLT-TBL"}
    ],
    "method": ["Make roux.", "Add seasonings."],
    "note": "Low heat."
  }
  $$,
  $$ {"meta": "PREP // ADAPTIVE_BRIGADE_SOP", "title": "Curry Roux", "weekly": {"batch": ["Batch 2–3kg twice weekly — roux is stable and stores well", "Keep one sealed 500g backup block in deep cold storage", "Cross-use: same roux base for any curry derivative or soup thickener", "Make in large flat pan for even browning — do not rush blond stage"], "buffer": ["Maintain 500g minimum at all times", "Trigger re-batch if working stock drops under 300g"]}, "morning": {"tasks": ["[Foundation] Melt butter and oil in flat pan on medium heat — runs semi-unattended", "[Prep Block] Junior adds flour in stages, whisking continuously — clear visual cue: blonde roux, nutty aroma", "[Parallel Station] While roux develops, second junior measures and pre-mixes all spice blends", "[Critical Control] Senior adds spices and wet seasonings — taste for umami depth before portioning"], "forward": ["Cast into 100g blocks on parchment — cools to solid for easy dispatch", "Label each block with batch date", "Cross with Vege Base to confirm ratio compatibility"]}, "service": {"setup": ["One 100g roux block per Katsu Curry portion at sauce station", "Melt roux block into hot stock first, then add Vege Base — prevents lumping", "Final sauce should coat spoon without dripping — viscosity control point", "Finish with butter knob off heat"], "garnish": ["Roux-based sauce is the plating element — golden, glossy", "Curry powder dusting on plate rim optional for visual"]}, "strategy": {"method": "Blonde roux with layered spice integration, pre-blocked for portion-accurate service", "temp": "Roux build: 140–150°C | Hold block: 4°C | Sauce assembly: 85°C max", "tips": "Add flour to fat — never reverse. Control heat closely; burnt roux cannot be recovered.", "note": "Pre-blocked portioning eliminates measurement error at service. Junior can melt and assemble in sequence with no weighing required — removing the highest failure point."},  "holding": {"temp": "4°C in blocks", "limit": "5 days in solid block form", "method": "Wrapped solid blocks on parchment, stored in GN with lid", "note": "If blocks crack or smell rancid (butter oxidation), discard batch."}, "maintenance": "Spice ratios must be exact — pre-measure in labeled bowls each batch.", "staff": "js"} $$
);

-- ==========================================
-- FINISHED DISHES
-- ==========================================

-- 7. BULGOGI DISH
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Bulgogi (Beef)', 'Korean', 'grilled',
  $$
  {
    "id": "bulgogi-dish",
    "name": "Bulgogi Dish",
    "baseYield": 4,
    "unit": "Portions",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "PROTEIN", "name": "Beef Sliced", "qty": 800, "unit": "g", "sku": "MT-BEF-SLC", "isMain": true},
      {"cat": "BASE", "name": "Bulgogi Sauce", "qty": 400, "unit": "g", "sku": "bulgogi-sauce"}
    ],
    "method": ["Marinate.", "Grill."],
    "note": "200g meat / 100g sauce per portion."
  }
  $$,
  $$ {"meta": "MAIN // ADAPTIVE_BRIGADE_SOP", "title": "Bulgogi Beef", "weekly": {"batch": ["Slice and pre-marinate beef in 2kg batches, 2–3 times weekly", "Marination minimum 12h — schedule night-before as standard", "Split peaks: marinate double batch Sunday night for Monday service surge", "Cross-use: Bulgogi Sauce surplus doubles as glaze for other grilled items"], "buffer": ["Keep minimum 400g marinated beef per service session", "Trigger re-marinate when raw stock drops below one batch size"]}, "morning": {"tasks": ["[Foundation] Pull marinated beef from cold storage — allow 15 min to temper, runs unattended", "[Prep Block] Pre-portion 200g beef portions on trays — junior executable, weigh and separate", "[Parallel Station] Junior loads sauce station with 100g squeeze bottles while beef temps", "[Critical Control] Senior inspects marinade penetration — color should be uniform through slice"], "forward": ["Pre-portion grill batches for PM service", "Batch sesame and spring onion garnish in advance", "Confirm sauce stock at grill station before service starts"]}, "service": {"setup": ["Grill at 200°C minimum before first ticket", "200g protein per portion — grill to caramelized, 70°C internal", "Sauce drizzle applied post-grill — not during (prevents burning)", "Plating flow: protein fires → garnish applied → sauce drizzled → serve"], "garnish": ["Toasted sesame seed and spring onion julienne", "Optional perilla leaf for aroma depth"]}, "strategy": {"method": "Pre-marinated thin-slice protein with high-temp dry grill execution", "temp": "Grill: 200°C+ | Internal: 70°C | Plate speed: under 3 min per portion", "tips": "Thin slices cook in 90 seconds per side — don't crowd the grill or they steam.", "note": "System is stable under full-brigade pressure. Pre-marination and pre-portioning remove all judgment from the service station. Junior can execute grill and plating; senior handles quality spot-checks."},  "holding": {"temp": "Raw marinated: 2–4°C | Cooked: serve immediately", "limit": "Raw marinated max 24h | Cooked: no hold", "method": "Marinated portions in covered GN with splash guard", "note": "Never hold cooked Bulgogi — service item. Discard cooked unsold after service."}, "maintenance": "Grill temperature check every 30 minutes during service.", "staff": "js"} $$
);

-- 8. DAKGALBI DISH
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Dakgalbi (Chicken)', 'Korean', 'stir_fried',
  $$
  {
    "id": "dakgalbi-dish",
    "name": "Dakgalbi Dish",
    "baseYield": 4,
    "unit": "Portions",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "PROTEIN", "name": "Chicken Thigh", "qty": 800, "unit": "g", "sku": "MT-CHK-THI", "isMain": true},
      {"cat": "BASE", "name": "Dakgalbi Sauce", "qty": 400, "unit": "g", "sku": "dakgalbi-sauce"}
    ],
    "method": ["Dice.", "Stir fry."],
    "note": "200g meat per portion."
  }
  $$,
  $$ {"meta": "MAIN // ADAPTIVE_BRIGADE_SOP", "title": "Dakgalbi Chicken", "weekly": {"batch": ["Dice and marinate chicken in 2kg batches, minimum twice weekly", "Marinate minimum 12h — standard night-before protocol", "Peak-day buffer: extra 800g pre-marinated on Fridays", "Cross-use: excess marinated chicken can be skewered as daily special"], "buffer": ["Always have minimum 400g marinated chicken per service session", "Label all GN containers by marination timestamp"]}, "morning": {"tasks": ["[Foundation] Pull marinated chicken — allow 15 min to temper before service, runs unattended", "[Prep Block] Pre-portion 200g chicken per portion in covered GN — junior executable", "[Parallel Station] Prep garnish and sauce station simultaneously at second station", "[Critical Control] Senior verifies marinade color penetration — red-orange throughout"], "forward": ["Pre-portion PM service batches", "Cross-verify Dakgalbi sauce stock at stir-fry station", "Set up garnish mise en place: sesame, spring onion, perilla"]}, "service": {"setup": ["Wok/flat grill at 220°C before first ticket", "Max 2 portions per wok batch — heat retention critical", "Internal temp 75°C mandatory inspection before plating", "Plating flow: protein fires → sauce baste → garnish → serve within 2 min of fire"], "garnish": ["Toasted sesame, spring onion rings, thinly sliced Cheongyang chili", "Perilla leaf as aroma garnish"]}, "strategy": {"method": "High-heat small-batch stir-fry with pre-marinated portion system", "temp": "Stir-fry: 220°C+ | Internal chicken: 75°C | Hold marinated raw: 2–4°C", "tips": "Dry the chicken surface before wok — excess marinade steams instead of sears.", "note": "Because chicken is pre-portioned and pre-marinated, service execution is reduced to a 2-minute fire. System supports parallel wok firing on adjacent burners by different chefs without senior oversight at each station."},  "holding": {"temp": "Marinated raw: 2–4°C | Cooked: serve immediately", "limit": "Marinated raw max 24h | Cooked: no hold", "method": "Covered GN with portion dividers", "note": "Discard any cooked portions remaining after service round."}, "maintenance": "Wok temperature and cleanliness between batches is critical. Monitor for carbon build-up.", "staff": "js"} $$
);

-- 9. KATSU CURRY DISH (Expanded Coating)
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Katsu Curry', 'Japanese', 'fried',
  $$
  {
    "id": "katsu-curry",
    "name": "Katsu Curry",
    "baseYield": 1,
    "unit": "Portion",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "PROTEIN", "name": "Chicken Breast", "qty": 220, "unit": "g", "sku": "MT-CHK-BST", "isMain": true},
      {"cat": "DRY", "name": "Panko", "qty": 40, "unit": "g", "sku": "DRY-PNK-KRN"},
      {"cat": "DRY", "name": "Flour", "qty": 30, "unit": "g", "sku": "DRY-FLR-AP"},
      {"cat": "PROTEIN", "name": "Egg", "qty": 1, "unit": "pcs", "sku": "MT-EGG-FR"},
      {"cat": "DAIRY", "name": "Milk", "qty": 50, "unit": "ml", "sku": "DAI-MLK-FR"},
      {"cat": "DRY", "name": "Salt", "qty": 2, "unit": "g", "sku": "DRY-SLT-TBL"},
      {"cat": "SPICE", "name": "Black pepper", "qty": 1, "unit": "g", "sku": "SPI-PEP-BLK"},
      {"cat": "BASE", "name": "Curry Roux", "qty": 70, "unit": "g", "sku": "curry-roux"},
      {"cat": "BASE", "name": "Curry Vege Base", "qty": 100, "unit": "g", "sku": "curry-vege-base"},
      {"cat": "STOCK", "name": "Stock", "qty": 280, "unit": "ml", "sku": "LIQ-STK-VEG"},
      {"cat": "FAT", "name": "Finish Butter", "qty": 1, "unit": "g", "sku": "FAT-BTR-WHT"},
      {"cat": "BASE", "name": "Udon Base", "qty": 1, "unit": "Portion", "sku": "udon-base"}
    ],
    "method": ["Coat.", "Fry.", "Simmer."],
    "note": "Professional Japanese SOP."
  }
  $$,
  $$ {"meta": "FLAGSHIP // ADAPTIVE_BRIGADE_SOP", "title": "Katsu Curry", "weekly": {"batch": ["Curry sauce components (Roux, Vege Base) batched twice weekly", "Udon portioned daily per service forecast", "Chicken breast portioned and crumbed per service — no advance crumbing overnight", "Roux and vege base are the long-lead components — never let them run out"], "buffer": ["Maintain minimum 3 Roux blocks and 500g Vege Base at all times", "Udon: 20% buffer above forecast — easy to up-batch day-of"]}, "morning": {"tasks": ["[Foundation] Crumb chicken breasts in batches — flour > egg > panko — runs as a structured line process", "[Prep Block] Junior handles crumbing line — flour, egg wash, panko in sequential GN trays", "[Parallel Station] While chicken crumbs, second junior assembles and portioned curry sauce components", "[Critical Control] Senior fires one test Katsu and verifies crumb adhesion and curry viscosity before service"], "forward": ["Pre-portion udon cakes for flash-regen during service", "Stage roux blocks and vege base at sauce station", "Fill stock pot and bring to temp — runs unattended"]}, "service": {"setup": ["Fry oil at 175°C before first ticket", "Katsu fires 4–5 min in oil | Curry sauce builds in parallel: roux + vege base + stock in pan", "Udon flash-regen in boiling water 90s during fry time", "Assembly: udon → curry ladle → Katsu sliced → garnish → serve inside 7 min total"], "garnish": ["Japanese curry powder dusting on plate rim", "Drizzle of finish butter on curry", "Spring onion julienne"]}, "strategy": {"method": "Simultaneous fry-and-sauce assembly with flash-regen noodle system", "temp": "Fry oil: 175°C | Curry sauce: 80°C before ladling | Internal chicken: 74°C", "tips": "Slice Katsu at 45° angle immediately after frying — resting more than 2 min softens the crust.", "note": "Katsu Curry is the most complex plate on the menu. System works because all components are pre-staged with zero measurement required at service. Curry builds in ~3 min; fry takes 4 min; udon regenerates in 90s — all run in parallel within the 7-minute window."},  "holding": {"temp": "Curry sauce: 75°C in bain marie | Crumbed raw chicken: 2–4°C | Fried Katsu: serve immediately", "limit": "Curry sauce: 2h in bain marie max | Crumbed raw: 2h | Fried: no hold", "method": "Curry in covered bain marie | Raw crumbed in covered GN on ice", "note": "Do not hold fried Katsu — panko loses crunch within 90 seconds. Fire to order always."}, "maintenance": "Fry oil quality check every 2h during service. Filter at end of each session.", "staff": "js"} $$
);

-- 10. KOREAN FRIED CHICKEN (Expanded Coating)
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Korean Fried Chicken', 'Korean', 'fried',
  $$
  {
    "id": "korean-fried-chicken",
    "name": "KFC",
    "baseYield": 10,
    "unit": "Portions",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "PROTEIN", "name": "Chicken Thigh", "qty": 2000, "unit": "g", "sku": "MT-CHK-THI", "isMain": true},
      {"cat": "DRY", "name": "Flour Mix (Prep)", "qty": 500, "unit": "g", "sku": "DRY-FLR-AP"},
      {"cat": "LIQUID", "name": "Water (Coating)", "qty": 400, "unit": "ml", "sku": "LIQ-WTR-TAP"},
      {"cat": "DRY", "name": "Baking Soda", "qty": 10, "unit": "g", "sku": "DRY-BKS-PWD"},
      {"cat": "DRY", "name": "Corn starch (Coating)", "qty": 500, "unit": "g", "sku": "DRY-STA-CRN"},
      {"cat": "DRY", "name": "Rice starch (Coating)", "qty": 500, "unit": "g", "sku": "DRY-STA-RCE"},
      {"cat": "FAT", "name": "Frying Oil", "qty": 5000, "unit": "ml", "sku": "FAT-OIL-FRY"}
    ],
    "method": ["Double coat.", "Double fry."],
    "note": "Crunchy."
  }
  $$,
  $$ {"meta": "MAIN // ADAPTIVE_BRIGADE_SOP", "title": "KFC (Korean Fried Chicken)", "weekly": {"batch": ["Flour Mix and Starch Mix batch twice weekly — dry components are shelf-stable", "Egg Wash mixed fresh daily from pre-cracked eggs and milk", "Chicken thighs portioned and wet-brined or marinated in advance", "Split batch for peak days: 150 portions Friday/Saturday vs 80 mid-week"], "buffer": ["Dry coating components: minimum 500g buffer each", "Live chicken portions: 20% above per-session forecast"]}, "morning": {"tasks": ["[Foundation] Confirm fry oil temperature and cleanliness — first task before any prep", "[Prep Block] Set up breading line in order: flour mix GN, egg wash GN, starch GN — junior executable", "[Parallel Station] Second junior portions chicken thighs while breading line is set", "[Critical Control] Senior performs first-batch test fry — verifies crunch, color (golden, not pale), internal temp 75°C"], "forward": ["Pre-coat first 20 portions before service starts", "Stage all dipping sauces at pickup station", "Confirm sauce stock: Sweet Spicy, Honey Butter, Blue Cheese, Thai Spicy"]}, "service": {"setup": ["Oil at 175°C for first fry | Drop to 165°C for second fry", "First fry 4 min → Rest 2 min → Second fry 2 min → Sauce toss → Plate", "Sauce tossing in hot bowl — sauce heats from chicken temperature", "Total plate-to-guest: under 7 min from first fry drop"], "garnish": ["Coleslaw portion beside chicken", "Radish pickle garnish", "Sesame and spring onion on sauce-tossed chicken"]}, "strategy": {"method": "Double-coat double-fry system with sauce toss at service", "temp": "First fry: 175°C | Rest: ambient | Second fry: 165°C | Internal: 75°C min", "tips": "Never fry from cold — temper chicken 15 min before coating for even cook.", "note": "Double-fry is non-negotiable for KFC crunch. The 2-minute rest between fries allows steam to escape, hardening the crust. Junior can execute the fry protocol once oil is at temperature. Senior monitors first batch only."},  "holding": {"temp": "Coated raw: 2–4°C max 2h | Fried: serve immediately", "limit": "Do not hold fried chicken more than 5 minutes", "method": "Wire rack above tray for resting — never stack or cover", "note": "Covered chicken steams and loses all crunch. Never cover resting fried chicken."}, "maintenance": "Oil filtered every 60 portions fried. Temperature probe calibrated daily.", "staff": "js"} $$
);

-- 11. TTEOKBOKKI DISH
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Tteokbokki', 'Korean', 'stew',
  $$
  {
    "id": "classic-tteokbokki",
    "name": "Tteokbokki",
    "baseYield": 10,
    "unit": "Portions",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "MAIN", "name": "Rice cake", "qty": 2000, "unit": "g", "sku": "DRY-RCK-KRN", "isMain": true},
      {"cat": "PROTEIN", "name": "Fish cake", "qty": 600, "unit": "g", "sku": "MT-FSH-CK", "isMain": true},
      {"cat": "VEG", "name": "Onion", "qty": 300, "unit": "g", "sku": "VEG-ONN-FR"},
      {"cat": "VEG", "name": "Spring onion", "qty": 200, "unit": "g", "sku": "VEG-SPN-FR"},
      {"cat": "STOCK", "name": "Water/Anchovy Stock", "qty": 2500, "unit": "ml", "sku": "LIQ-STK-ANC"},
      {"cat": "PASTE", "name": "Gochujang", "qty": 400, "unit": "g", "sku": "PST-GOJ-KRN"},
      {"cat": "SPICE", "name": "Gochugaru", "qty": 80, "unit": "g", "sku": "SPI-CHI-KRN"},
      {"cat": "LIQUID", "name": "Soy sauce", "qty": 80, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "DRY", "name": "Sugar", "qty": 150, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "WET", "name": "Corn syrup", "qty": 150, "unit": "ml", "sku": "WET-CRN-SYP"},
      {"cat": "AROMATIC", "name": "Garlic", "qty": 80, "unit": "g", "sku": "ARO-GAR-FR"},
      {"cat": "DRY", "name": "MSG", "qty": 4, "unit": "g", "sku": "DRY-MSG-WHT"},
      {"cat": "SPICE", "name": "Black pepper", "qty": 2, "unit": "g", "sku": "SPI-PEP-BLK"}
    ],
    "method": ["Boil.", "Add sauce.", "Cook 12 min."],
    "note": "Glossy."
  }
  $$,
  $$ {"meta": "MAIN // ADAPTIVE_BRIGADE_SOP", "title": "Tteokbokki", "weekly": {"batch": ["Rice cake batch: source fresh, soak to separate if dried — prep 3x weekly", "Sauce base (gochujang + seasonings) reduce once weekly as concentrate", "Fish cake pre-cut and portioned in advance", "Anchovy stock: batch 5L twice weekly as shared kitchen base stock"], "buffer": ["Rice cake: 500g portion buffer above forecast", "Sauce concentrate: 500g minimum sealed in cold"]}, "morning": {"tasks": ["[Foundation] Bring anchovy stock to simmer — runs unattended", "[Prep Block] Add gochujang base, sugar, soy — junior executable following measured formula", "[Parallel Station] While stock heats, junior pre-cuts fish cake and slices vegetables", "[Critical Control] Senior verifies sauce gloss and viscosity at 85°C — should coat a wooden spoon"], "forward": ["Pre-portion rice cakes into 200g service batches", "Pre-portion fish cake per serving", "Cross-prep: hold reduced sauce as dipping glaze for tteokkochi skewers"]}, "service": {"setup": ["Sauce kept in bain marie at 75°C throughout service", "Rice cakes added to hot sauce per order — cook 3–4 min until soft throughout", "Fish cake added in final 90 seconds", "Plate immediately — sauce continues to thicken off heat"], "garnish": ["Sliced spring onion and gochugaru dusting", "Toasted sesame seed finish"]}, "strategy": {"method": "Pre-built sauce base with per-order rice cake activation", "temp": "Sauce hold: 75°C in bain marie | Service cook: 90°C rolling simmer | Serve immediately", "tips": "Sauce reduces and concentrates during service — add small amounts of anchovy stock to maintain viscosity during peak.", "note": "System works because sauce base is pre-built and held hot. Per-order execution is simply adding rice cakes to hot sauce — zero complex decision points for the junior. Senior monitors sauce consistency during service only."},  "holding": {"temp": "Sauce: 75°C in bain marie | Rice cakes: 2–4°C raw", "limit": "Sauce: 2h active service hold | Cooked dish: serve immediately", "method": "Bain marie with lid for sauce | Raw rice cakes in sealed container with water", "note": "If sauce over-thickens (coats spoon heavily), thin with anchovy stock. Discard if burnt smell develops."}, "maintenance": "Sauce viscosity check every 30 min during service. Bain marie water level check.", "staff": "js"} $$
);

-- ==========================================
-- FINISHING SAUCES
-- ==========================================

-- 12. SWEET SPICY SAUCE
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Sweet Spicy Sauce', 'Korean', 'sauce',
  $$
  {
    "id": "sweet-spicy-sauce",
    "name": "Sweet Spicy",
    "baseYield": 10000,
    "unit": "ml",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "PASTE", "name": "Gochujang", "qty": 1000, "unit": "g", "sku": "PST-GOJ-KRN"},
      {"cat": "SPICE", "name": "Gochugaru", "qty": 500, "unit": "g", "sku": "SPI-CHI-KRN"},
      {"cat": "WET", "name": "Ketchup", "qty": 2000, "unit": "ml", "sku": "WET-KTP-BTL"},
      {"cat": "LIQUID", "name": "Soy sauce", "qty": 1000, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "AROMATIC", "name": "Garlic", "qty": 1000, "unit": "g", "sku": "ARO-GAR-FR"},
      {"cat": "DRY", "name": "Sugar", "qty": 1000, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "WET", "name": "Corn syrup", "qty": 4000, "unit": "ml", "sku": "WET-CRN-SYP"},
      {"cat": "LIQUID", "name": "Vinegar", "qty": 400, "unit": "ml", "sku": "LIQ-VNG-WHT"},
      {"cat": "SPICE", "name": "Smoked paprika", "qty": 100, "unit": "g", "sku": "SPI-PAP-SMK"}
    ],
    "method": ["Mix all cold."],
    "note": "KFC Glaze."
  }
  $$,
  $$ {"meta": "GLAZE // ADAPTIVE_BRIGADE_SOP", "title": "Sweet Spicy Sauce", "weekly": {"batch": ["Batch 20L twice weekly — cold-mix, no heat required, highly stable", "Split into 5L service containers and 15L sealed backup", "Cross-use: forms the base of Thai Spicy Sauce derivative", "Peak buffer: add 5L on Friday production run"], "buffer": ["Minimum 2L at service station at all times", "Trigger re-batch when working container drops to 1L"]}, "morning": {"tasks": ["[Foundation] All dry components pre-measured into mixing bowl — runs as a junior task", "[Prep Block] Add all wet components in order, whisk to full incorporation — junior executable", "[Parallel Station] Can be prepared simultaneously with other cold sauce production", "[Critical Control] Senior tastes for sweet-heat-acid balance before bottling"], "forward": ["Fill service-station bottles (500ml squeeze bottles per station)", "Pre-measure 1000ml for Thai Spicy Sauce build", "Label all containers with batch date and heat rating"]}, "service": {"setup": ["Sauce at ambient temperature for sauce-tossing KFC at pickup station", "Toss chicken in hot bowl to carry sauce temperature from protein", "No heat application to sauce — cold application only", "Check viscosity: should coat chicken without pooling"], "garnish": ["Finish tossed chicken with sesame seed and chopped spring onion", "Serve with Radish Pickle for acid balance"]}, "strategy": {"method": "Cold-batch modular glaze for high-volume sauce-toss application", "temp": "Hold: 2–4°C | Apply cold | No reheating required", "tips": "Whisk vigorously — garlic must distribute evenly or sauce will be uneven batch to batch.", "note": "Cold-build system eliminates cooking risk entirely. Any junior can batch this with pre-weighed ingredients. High garlic content drives flavor depth — do not reduce or substitute."},  "holding": {"temp": "2–4°C", "limit": "3–4 days sealed", "method": "Sealed 5L containers with date label", "note": "Monitor for fermentation if stored over 4 days — garlic-heavy sauces can develop off-odors."}, "maintenance": "Inspect batch for separation before service — re-whisk if needed. Never serve separated sauce.", "staff": "j"} $$
);

-- 13. HONEY BUTTER
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Honey Butter', 'Korean', 'sauce',
  $$
  {
    "id": "honey-butter",
    "name": "Honey Butter",
    "baseYield": 3150,
    "unit": "ml",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "FAT", "name": "Butter", "qty": 600, "unit": "g", "sku": "FAT-BTR-WHT"},
      {"cat": "DRY", "name": "Sugar", "qty": 300, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "LIQUID", "name": "Soy sauce", "qty": 900, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "AROMATIC", "name": "Garlic", "qty": 300, "unit": "g", "sku": "ARO-GAR-FR"},
      {"cat": "WET", "name": "Honey", "qty": 450, "unit": "g", "sku": "WET-HNY-FR"},
      {"cat": "WET", "name": "Corn syrup", "qty": 600, "unit": "ml", "sku": "WET-CRN-SYP"}
    ],
    "method": ["Heat gently."],
    "note": "Brilliant on KFC."
  }
  $$,
  $$ {"meta": "GLAZE // ADAPTIVE_BRIGADE_SOP", "title": "Honey Butter", "weekly": {"batch": ["Batch 3–6L twice weekly — heat-process, short shelf life", "Prepare in smaller 1.5L batches for freshness control", "Cross-use: Honey Butter can glaze grilled protein as a premium special", "Butter must be at room temp before processing"], "buffer": ["Maintain minimum 500ml warm-hold or 1L cold at all times", "Trigger re-batch if warm-hold stock drops below 300ml during service"]}, "morning": {"tasks": ["[Foundation] Melt butter low and slow in sauce pan — runs unattended until liquid", "[Prep Block] Add garlic, heat until fragrant (not browned) — junior executable with timing cue: aroma appears in 90s", "[Parallel Station] While butter heats, junior pre-measures honey, corn syrup, soy into a bowl", "[Critical Control] Senior adds wet ingredients off heat, stirs to incorporation, tastes for balance"], "forward": ["Transfer to warm-hold bain marie for service dispatch", "Cross-test with KFC piece before service opens", "Label with batch time — track from first heat"]}, "service": {"setup": ["Honey Butter held warm in small bain marie at 55–60°C", "Ladle or toss chicken in small batch upon order", "Do not overheat — butter separates above 70°C", "Finish immediately and serve — sauce sets on cooling chicken"], "garnish": ["Sesame seed and sea salt flake finish", "Optional: thin spring onion for visual contrast"]}, "strategy": {"method": "Warm emulsion hold with per-order toss execution", "temp": "Build: 60°C max | Hold: 55–6°C bain marie | Discard if above 70°C", "tips": "If sauce splits during warm hold, remove from heat, stir from center outward to re-emulsify.", "note": "Honey Butter is temperature-sensitive. Pre-build and warm-hold is the correct system. Do not rebuild from scratch mid-service. If emulsion fails, discard and use cold backup immediately."},  "holding": {"temp": "55–60°C in bain marie", "limit": "2h in active warm hold | 3 days cold", "method": "Bain marie with lid for warm hold | Sealed squeeze bottle for cold backup", "note": "If sauce darkens significantly in warm hold (butter scorching), discard immediately and rebuild from cold batch."}, "maintenance": "Garlic can burn if left unattended at heat stage. Never leave beurre sauce unmonitored.", "staff": "js"} $$
);

-- 14. BBQ SAUCE
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'BBQ Sauce', 'Global', 'sauce',
  $$
  {
    "id": "bbq-sauce",
    "name": "House BBQ",
    "baseYield": 2200,
    "unit": "ml",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "BASE", "name": "Magic Soy", "qty": 1000, "unit": "ml", "sku": "INT-MAG-SOY"},
      {"cat": "WET", "name": "Ketchup", "qty": 600, "unit": "ml", "sku": "WET-KTP-BTL"},
      {"cat": "LIQUID", "name": "Worcestershire", "qty": 300, "unit": "ml", "sku": "LIQ-WRC-SCE"},
      {"cat": "DRY", "name": "Sugar", "qty": 300, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "WET", "name": "Corn syrup", "qty": 300, "unit": "ml", "sku": "WET-CRN-SYP"},
      {"cat": "SPICE", "name": "Smoked paprika", "qty": 5, "unit": "g", "sku": "SPI-PAP-SMK"}
    ],
    "method": ["Simmer."],
    "note": "Fusion."
  }
  $$,
  $$ {"meta": "SAUCE // ADAPTIVE_BRIGADE_SOP", "title": "House BBQ Sauce", "weekly": {"batch": ["Batch 4–6L twice weekly via slow simmer method", "BBQ Sauce is the foundation of Thai Spicy — always batch sufficient cross-use quantity", "Split: 2L for direct service use, remainder for Thai Spicy derivative build", "Magic Soy must be allocated from master batch before BBQ production begins"], "buffer": ["Maintain minimum 1L sealed backup at all times", "Trigger production when working stock drops to 500ml"]}, "morning": {"tasks": ["[Foundation] Combine Magic Soy and Worcestershire in pot — bring to simmer, runs semi-unattended", "[Prep Block] Add ketchup, sugar, corn syrup in order — junior executable following measured sequence", "[Parallel Station] While sauce simmers, junior prepares Sweet Spicy Sauce simultaneously at cold station", "[Critical Control] Senior reduces to correct viscosity (coats a spoon without dripping) and tastes before bottling"], "forward": ["Transfer 2000ml immediately to Thai Spicy build station", "Bottle remainder into sealed working container", "Rotate cold stock — FIFO"]}, "service": {"setup": ["BBQ Sauce at ambient for sauce-toss application", "Small warm-hold option (55°C) for dipping service", "No high-heat application needed — protein brings temperature", "Check consistency before service: should ribbon cleanly from ladle"], "garnish": ["Smoked paprika dust on plated sauce", "Pickled radish for acid contrast"]}, "strategy": {"method": "Long-simmer umami reduction with ketchup emulsion base", "temp": "Simmer: 90°C | Hold cold: 2–4°C | Optional warm-hold: 55°C max", "tips": "Reduce by 20% from initial liquid volume for correct viscosity — don't skip reduction step.", "note": "BBQ is the most cross-utilized sauce in the kitchen. Batch size should always account for Thai Spicy derivative use. System is stable because sauce is cold-stable up to 4 days."},  "holding": {"temp": "2–4°C sealed", "limit": "3–4 days", "method": "Sealed squeeze bottles or GN containers", "note": "Discard if ketchup begins to ferment or vinegar note intensifies beyond calibration."}, "maintenance": "Batch tied to Magic Soy availability — never produce without confirmed base stock.", "staff": "js"} $$
);

-- 15. THAI SPICY SAUCE
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Thai Spicy', 'Thai', 'sauce',
  $$
  {
    "id": "thai-spicy-sauce",
    "name": "Thai Spicy",
    "baseYield": 3500,
    "unit": "ml",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "BASE", "name": "BBQ Sauce", "qty": 2000, "unit": "ml", "sku": "bbq-sauce"},
      {"cat": "BASE", "name": "Sweet Spicy", "qty": 1000, "unit": "ml", "sku": "sweet-spicy-sauce"},
      {"cat": "WET", "name": "Sriracha", "qty": 500, "unit": "ml", "sku": "WET-SRR-HOT"},
      {"cat": "WET", "name": "Lime", "qty": 3, "unit": "pcs", "sku": "VEG-LIM-FR"}
    ],
    "method": ["Mix well."]
  }
  $$,
  $$ {"meta": "SAUCE // ADAPTIVE_BRIGADE_SOP", "title": "Thai Spicy Sauce", "weekly": {"batch": ["Batch 7L twice weekly from pre-built BBQ and Sweet Spicy components", "Thai Spicy is purely an assembly sauce — no cooking required", "Ensure BBQ Sauce and Sweet Spicy are produced first — dependency gating", "Cross-use: Thai Spicy works as marinade amplifier for chicken specials"], "buffer": ["Maintain minimum 1L sealed at all times", "Trigger production immediately when working bottle drops to 500ml"]}, "morning": {"tasks": ["[Foundation] Pull BBQ Sauce and Sweet Spicy from cold storage to temper slightly", "[Prep Block] Combine BBQ + Sweet Spicy + Sriracha in correct ratio — fully junior executable", "[Parallel Station] Junior squeezes lime while second junior prepares other cold assembly sauces", "[Critical Control] Senior stirs and tastes final blend for heat-acid balance before bottling"], "forward": ["Pre-fill service bottles", "Tag with heat rating for pickup station communication", "Confirm Cross-stock: BBQ and Sweet Spicy allocated before bottling"]}, "service": {"setup": ["Thai Spicy at ambient for sauce-toss KFC execution", "Alternatively served as dipping sauce at ambient", "Toss in hot bowl — protein temperature activates lime notes", "Lime freshness check before each service"], "garnish": ["Toasted sesame and spring onion on tossed chicken", "Optional fresh lime wedge on plate for acid brightness"]}, "strategy": {"method": "Cold-assembly modular blend from pre-built sauce foundations", "temp": "Hold: 2–4°C | Apply cold | No heat required", "tips": "Lime must be squeezed fresh daily — bottled lime juice will flatten the acid profile.", "note": "Thai Spicy has zero cooking dependency, making it the fastest sauce to re-batch mid-service if needed. Junior can rebuild from labeled bottles in under 5 minutes if stock runs out."},  "holding": {"temp": "2–4°C", "limit": "3 days — lime accelerates degradation", "method": "Sealed squeeze bottles, cold chain", "note": "Discard if lime ferments (sharp, off-acid smell) or heat profile drops from Sriracha separation."}, "maintenance": "Fastest sauce to rebuild — but BBQ and Sweet Spicy must always be available as inputs.", "staff": "j"} $$
);

-- 16. BLUE CHEESE SAUCE
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Blue Cheese', 'Western', 'sauce',
  $$
  {
    "id": "blue-cheese-sauce",
    "name": "Blue Cheese dip",
    "baseYield": 2200,
    "unit": "ml",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "WET", "name": "Mayo", "qty": 1500, "unit": "ml", "sku": "WET-MAO-BTL"},
      {"cat": "WET", "name": "Sour cream", "qty": 600, "unit": "ml", "sku": "DAI-SRC-TUB"},
      {"cat": "PROTEIN", "name": "Blue cheese", "qty": 200, "unit": "g", "sku": "MT-BLU-CHS"},
      {"cat": "SPICE", "name": "Black pepper", "qty": 5, "unit": "g", "sku": "SPI-PEP-BLK"},
      {"cat": "DRY", "name": "Salt", "qty": 5, "unit": "g", "sku": "DRY-SLT-TBL"},
      {"cat": "SPICE", "name": "Smoked paprika", "qty": 10, "unit": "g", "sku": "SPI-PAP-SMK"},
      {"cat": "DRY", "name": "Parmesan", "qty": 30, "unit": "g", "sku": "DRY-PAR-CHS"},
      {"cat": "WET", "name": "Lime", "qty": 1, "unit": "pcs", "sku": "VEG-LIM-FR"}
    ],
    "method": ["Mix smooth."]
  }
  $$,
  $$ {"meta": "SAUCE // ADAPTIVE_BRIGADE_SOP", "title": "Blue Cheese Dip", "weekly": {"batch": ["Batch 4–6L twice weekly — cold mix, no heat", "Blue cheese must be crumbled and measured carefully — flavor is dominant", "Cross-use: can serve as a premium dip, salad dressing base, or burger sauce", "Split into 500ml service bottles for easy station dispatch"], "buffer": ["Maintain minimum 500ml at pickup station", "Trigger re-batch when working bottle drops to 200ml"]}, "morning": {"tasks": ["[Foundation] Crumble blue cheese to consistent small pieces — runs as junior task", "[Prep Block] Combine mayo, sour cream, parmesan in mixing bowl — junior executable", "[Parallel Station] While dairy base mixes, junior prepares other cold sauces simultaneously", "[Critical Control] Senior folds in blue cheese and seasoning, verifies intensity — should be bold but not bitter"], "forward": ["Bottle into 500ml service containers", "Store in coldest zone of refrigerator — dairy component sensitive", "Label with maximum use date (3 days)"]}, "service": {"setup": ["Blue Cheese dip served cold from refrigerator, never warm", "Pre-portioned into small sauce cups for table or plating", "No application to hot surface — dairy will split", "Quality check: smooth, consistent blue cheese distribution"], "garnish": ["Smoked paprika dusted on surface of dip cup", "Optional lime wedge alongside for acid contrast"]}, "strategy": {"method": "Cold emulsion dip with engineered blue cheese distribution", "temp": "Serve cold: 4–6°C | Never heat | Discard above 10°C if held on pass", "tips": "Micro-crumble the blue cheese — large chunks create uneven flavor pockets.", "note": "System is stable and junior-executable in full. The only senior-controlled step is the final tasting for blue cheese intensity, which can vary batch-to-batch depending on cheese age."},  "holding": {"temp": "2–4°C strictly", "limit": "3 days maximum", "method": "Sealed 500ml containers, cold chain only", "note": "Discard if parmesan or dairy develops sour note or sauce breaks and doesn't re-incorporate on whisking."}, "maintenance": "High-dairy product. Daily smell-and-texture check mandatory. Most perishable sauce in the lineup.", "staff": "j"} $$
);

-- ==========================================
-- SIDES & PREP
-- ==========================================

-- 17. ASIAN COLESLAW
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Asian Coleslaw', 'Asian', 'side',
  $$
  {
    "id": "asian-coleslaw",
    "name": "Coleslaw",
    "baseYield": 10,
    "unit": "Portions",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "VEG", "name": "White cabbage", "qty": 2000, "unit": "g", "sku": "VEG-CAB-WHT"},
      {"cat": "VEG", "name": "Red cabbage", "qty": 1000, "unit": "g", "sku": "VEG-CAB-RED"},
      {"cat": "VEG", "name": "Carrot", "qty": 500, "unit": "g", "sku": "VEG-CRT-FR"},
      {"cat": "DRY", "name": "Salt (cure)", "qty": 25, "unit": "g", "sku": "DRY-SLT-TBL"},
      {"cat": "BASE", "name": "Magic Soy", "qty": 200, "unit": "g", "sku": "INT-MAG-SOY"},
      {"cat": "LIQUID", "name": "Soy sauce", "qty": 150, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "LIQUID", "name": "Vinegar", "qty": 350, "unit": "ml", "sku": "LIQ-VNG-WHT"},
      {"cat": "LIQUID", "name": "Water", "qty": 200, "unit": "ml", "sku": "LIQ-WTR-TAP"},
      {"cat": "DRY", "name": "Sugar", "qty": 60, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "PASTE", "name": "White miso", "qty": 80, "unit": "g", "sku": "PST-MSO-WHT"},
      {"cat": "FAT", "name": "Oil", "qty": 250, "unit": "ml", "sku": "FAT-OIL-NTL"},
      {"cat": "WET", "name": "Yuzu/Lemon", "qty": 5, "unit": "ml", "sku": "WET-YZU-JCE"}
    ],
    "method": ["Salt veg.", "Mix dressing."]
  }
  $$,
  $$ {"meta": "SIDE // ADAPTIVE_BRIGADE_SOP", "title": "Asian Coleslaw", "weekly": {"batch": ["Vegetable prep: shred and salt-cure daily for freshness — never pre-dress in bulk", "Dressing batch 2L twice weekly — dressing keeps, dressed slaw doesn't", "Magic Soy allocation needed for dressing — cross-draw from base stock", "Peak-day coleslaw: double vegetable prep on Fridays"], "buffer": ["Undressed vegetable mix: keep 500g buffer above forecast", "Dressing: minimum 200ml ready at service station"]}, "morning": {"tasks": ["[Foundation] Shred white and red cabbage + carrot, salt and set aside to draw moisture — runs unattended 20 min", "[Prep Block] While veg draws, junior whisks dressing: Magic Soy + vinegar + miso + oil + sugar — junior executable", "[Parallel Station] Second junior portions undressed coleslaw into individual serving containers", "[Critical Control] Senior squeezes and drains salted cabbage, verifies no bitter oversalt before dressing"], "forward": ["Dress minimum portions required for service session + 20% buffer", "Keep remaining veg undressed in cold storage", "Cross-fill coleslaw portions for KFC and Dakgalbi side-dish dispatch"]}, "service": {"setup": ["Pre-dressed coleslaw in individual portion pots at cold pickup", "Last-minute yuzu squeeze optional per portion for freshness brightness", "Service temperature: 4–6°C — never room temperature", "Verify texture before service: should retain crunch, not be waterlogged"], "garnish": ["Toasted sesame seed on top of each portion", "Optional: thin spring onion julienne"]}, "strategy": {"method": "Salt-drawn vegetable prep with same-day dressing application", "temp": "Serve cold: 4–6°C | Never dress warm veg | Dress max 2h before service close", "tips": "Drain aggressively after salt cure — excess water breaks the dressing emulsion within 30 min.", "note": "System separates dressing and vegetable production deliberately to protect texture. Junior can dress portions on demand rather than in bulk. This prevents waste from slaw weeping during service."},  "holding": {"temp": "Undressed: 2–4°C up to 2 days | Dressed: serve within 2h", "limit": "Dressed slaw must not be held beyond 2h", "method": "Undressed in sealed GN | Dressed in individual portion cups with lids", "note": "Discard dressed slaw after 2h — vinegar emulsification breaks and texture becomes saturated."}, "maintenance": "Moisture check critical. Over-wet slaw ruins cross-dish textures (KFC goes soft).", "staff": "j"} $$
);

-- 18. TTEOKKOCHI SAUCE
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Tteokkochi Sauce', 'Korean', 'sauce',
  $$
  {
    "id": "tteokkochi-sauce",
    "name": "Tteokkochi Sauce",
    "baseYield": 1000,
    "unit": "ml",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "LIQUID", "name": "Soy sauce", "qty": 150, "unit": "ml", "sku": "LIQ-SOY-LGT"},
      {"cat": "PASTE", "name": "Gochujang", "qty": 300, "unit": "g", "sku": "PST-GOJ-KRN"},
      {"cat": "WET", "name": "Ketchup", "qty": 200, "unit": "ml", "sku": "WET-KTP-BTL"},
      {"cat": "WET", "name": "Corn syrup", "qty": 350, "unit": "ml", "sku": "WET-CRN-SYP"},
      {"cat": "DRY", "name": "Sugar", "qty": 100, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "AROMATIC", "name": "Garlic", "qty": 80, "unit": "g", "sku": "ARO-GAR-FR"},
      {"cat": "SPICE", "name": "Gochugaru", "qty": 80, "unit": "g", "sku": "SPI-CHI-KRN"},
      {"cat": "LIQUID", "name": "Vinegar", "qty": 40, "unit": "ml", "sku": "LIQ-VNG-WHT"}
    ],
    "method": ["Simmer 10 min."]
  }
  $$,
  $$ {"meta": "SAUCE // ADAPTIVE_BRIGADE_SOP", "title": "Tteokkochi Sauce", "weekly": {"batch": ["Batch 2–3L twice weekly via short simmer", "Sauce must be finished smooth — zero chunky garlic visible", "Cross-use: Tteokkochi Sauce can serve as Tteokbokki dipping station upgrade", "Peak production: increase 30% on weekends for skewer volume"], "buffer": ["Minimum 500ml sealed at all times", "Trigger re-batch if working bottle drops to 200ml"]}, "morning": {"tasks": ["[Foundation] Crush and sweat garlic in neutral oil first — runs semi-unattended on low", "[Prep Block] Combine gochujang, ketchup, corn syrup, sugar, soy — junior executable from pre-weighed portions", "[Parallel Station] While sauce simmers, junior portions and skewers rice cakes for tteokkochi service", "[Critical Control] Senior verifies final gloss and balance — should be sweet-spicy with visible sheen"], "forward": ["Bottle into squeeze bottles for skewer station", "Cross-serve chilled as dipping sauce alongside Tteokbokki", "Label with date and heat level marker"]}, "service": {"setup": ["Sauce kept warm in small bain marie at 65°C for skewer basting", "Apply to rice cake skewers via brush or ladle during final heat", "Sauce thickens quickly on heat — do not over-baste", "Service plate: 2–03 skewers per portion with sauce drizzle finish"], "garnish": ["Gochugaru dusting on plated skewers", "Toasted sesame seed and sliced spring onion"]}, "strategy": {"method": "Short-simmer coating glaze with cross-utilization across Tteok items", "temp": "Simmer: 85°C | Warm hold: 65°C | Cold backup: 2–4°C", "tips": "Reduce sauce by 10–15% for better coating viscosity on skewers vs. loose sauce.", "note": "System works because sauce is dual-purpose: warm for basting, cold for dipping. Pre-simmer production removes all live cooking from service. Junior can manage skewer station independently."},  "holding": {"temp": "65°C warm hold | 2–4°C cold backup", "limit": "Warm hold: 2h | Cold sealed: 4 days", "method": "Small bain marie at station | Squeeze bottles cold", "note": "Discard warm-hold sauce if it over-thickens (sugar caramelization degrades). Rebuild from cold."}, "maintenance": "Bain marie sauce check every 20 min during service. Thin with water if over-reduced.", "staff": "j"} $$
);

-- 19. RADISH PICKLE
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Radish Pickle', 'Korean', 'side',
  $$
  {
    "id": "radish-pickle",
    "name": "Radish Pickle",
    "baseYield": 6000,
    "unit": "g",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "VEG", "name": "Radish", "qty": 3000, "unit": "g", "sku": "VEG-RDH-FR"},
      {"cat": "DRY", "name": "Salt (draw)", "qty": 30, "unit": "g", "sku": "DRY-SLT-TBL"},
      {"cat": "LIQUID", "name": "Water (brine)", "qty": 1500, "unit": "ml", "sku": "LIQ-WTR-TAP"},
      {"cat": "LIQUID", "name": "Vinegar (brine)", "qty": 1500, "unit": "ml", "sku": "LIQ-VNG-WHT"},
      {"cat": "DRY", "name": "Sugar (brine)", "qty": 500, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "DRY", "name": "Salt (brine)", "qty": 45, "unit": "g", "sku": "DRY-SLT-TBL"}
    ],
    "method": ["Cube.", "Pickle."]
  }
  $$,
  $$ {"meta": "SIDE // ADAPTIVE_BRIGADE_SOP", "title": "Radish Pickle", "weekly": {"batch": ["Batch 6kg minimum twice weekly — needs 24h minimum pickling before service", "Always keep one sealed batch in 24h+ pickle ahead of service day", "Cross-use: radish pickle served with KFC, Dakgalbi, and as side with KFC sauces", "Peak prep: triple batch on Thursdays for Friday–Saturday surge"], "buffer": ["Minimum 1kg ready-pickled at all times", "Never let pickle stock reach zero — requires 24h lead time to rebuild"]}, "morning": {"tasks": ["[Foundation] Cube radish uniformly (2cm) into GN containers as first task — runs unattended if delegated", "[Prep Block] Salt radish to draw moisture — junior executable, 30 min draw time", "[Parallel Station] While radish draws, junior prepares brine: water + vinegar + sugar + salt in pot", "[Critical Control] Senior verifies brine balance by tasting — should be sharply acidic before adding radish"], "forward": ["Pour brine over drained radish, seal and refrigerate", "Label with timestamp — not service-ready until 24h", "Rotate pickle batches FIFO"]}, "service": {"setup": ["Pickled radish pre-portioned into service cups at cold pickup", "30g per portion standard — use portioning scoop", "Serve cold, never warm — texture is the point", "Quality check: should be crisp, slightly translucent, bright acid flavor"], "garnish": ["N/A — served as is", "Optional: sesame seed on top of pickle cup for visual"]}, "strategy": {"method": "24h+ acid cure with salt-draw first stage for maximum texture retention", "temp": "Brine: room temp pour | Hold: 2–4°C minimum 24h | Serve cold", "tips": "Salt-draw is critical — skip it and radish will be waterlogged in brine within a day.", "note": "System works because pickle is a set-and-forget production item. The only risk is a production gap — which the 24h lead time rule prevents. Junior can manage all steps except brine tasting."},  "holding": {"temp": "2–4°C", "limit": "3–4 days in sealed brine", "method": "GN containers fully submerged in brine, sealed with lid", "note": "Discard if radish becomes soft or brine develops fermentation bubbles beyond mild carbonate taste."}, "maintenance": "FIFO rotation critical. Never mix old and new batches in same container.", "staff": "j"} $$
);

-- 20. KIMCHI
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Kimchi', 'Korean', 'side',
  $$
  {
    "id": "kimchi",
    "name": "Kimchi",
    "baseYield": 10000,
    "unit": "g",
    "tier": "Tier 1 (3-4 Days)",
    "ingredients": [
      {"cat": "VEG", "name": "Cabbage", "qty": 10000, "unit": "g", "sku": "VEG-CAB-WHT"},
      {"cat": "DRY", "name": "Salt (cabbage)", "qty": 1000, "unit": "g", "sku": "DRY-SLT-TBL"},
      {"cat": "DRY", "name": "Rice flour", "qty": 300, "unit": "g", "sku": "DRY-RCF-PWD"},
      {"cat": "STOCK", "name": "Veg stock (porridge)", "qty": 2300, "unit": "ml", "sku": "LIQ-STK-VEG"},
      {"cat": "DRY", "name": "Sugar", "qty": 200, "unit": "g", "sku": "DRY-SGR-WHT"},
      {"cat": "AROMATIC", "name": "Garlic", "qty": 300, "unit": "g", "sku": "ARO-GAR-FR"},
      {"cat": "AROMATIC", "name": "Ginger", "qty": 50, "unit": "g", "sku": "ARO-GIN-FR"},
      {"cat": "AROMATIC", "name": "Onion", "qty": 4, "unit": "pcs", "sku": "ARO-ONN-FR"},
      {"cat": "SPICE", "name": "Chili powder", "qty": 2000, "unit": "g", "sku": "SPI-CHI-PWD"},
      {"cat": "DRY", "name": "Salt (paste)", "qty": 100, "unit": "g", "sku": "DRY-SLT-TBL"},
      {"cat": "DRY", "name": "Korean salt", "qty": 50, "unit": "g", "sku": "DRY-SLT-KRN"},
      {"cat": "STOCK", "name": "Veg stock (thinning)", "qty": 700, "unit": "ml", "sku": "LIQ-STK-VEG"}
    ],
    "method": ["Salt cabbage.", "Porridge.", "Paste."]
  }
  $$,
  $$ {"meta": "SIDE // ADAPTIVE_BRIGADE_SOP", "title": "Kimchi", "weekly": {"batch": ["Batch 10kg weekly minimum — kimchi improves 48h+ after mixing", "Schedule production Monday for Wednesday service readiness", "This is the longest lead-time item in the kitchen — never run below 2kg", "Cross-use: aged kimchi can be used for kimchi fried rice or soup specials"], "buffer": ["Minimum 2kg sealed and fermenting at all times", "Trigger production if reserve drops below 1.5kg"]}, "morning": {"tasks": ["[Foundation] Salt 10kg cabbage in GN containers — leave to draw 1–2h, runs fully unattended", "[Prep Block] Prepare rice flour porridge (flour + stock) — junior executable watching for thick paste consistency", "[Parallel Station] While porridge cools, junior blends aromatics: garlic, ginger, onion into paste", "[Critical Control] Senior mixes chili powder into porridge, adjusts seasoning with Korean salt — paste should be deeply red, thick, glossy"], "forward": ["Rinse and drain salted cabbage — squeeze each piece individually", "Coat each cabbage section with paste by hand (gloves mandatory)", "Pack tightly into sealed containers — no air pockets"]}, "service": {"setup": ["Pre-portioned kimchi in 50g portions in sauce cups at cold pickup", "Serve cold directly from refrigerator — kimchi is a cold condiment", "Never cook or heat kimchi for service unless specials menu calls for it", "Quality check: vibrant red color, fresh ferment aroma, slight effervescence"], "garnish": ["N/A — served as condiment", "Optional sesame seed and spring onion if plated formally"]}, "strategy": {"method": "Traditional hand-packed fermentation with porridge binder system", "temp": "Salt draw: ambient | Ferment: 18–22°C for 24h then 2–4°C | Serve: 4°C", "tips": "Pack kimchi extremely tightly — air pockets accelerate uneven fermentation and mold risk.", "note": "Kimchi is the only item that gets better with time in this kitchen. The 48h fermentation window must be protected. Senior involvement is only required at paste mixing and after-24h fermentation tasting. Junior handles all physical steps."},  "holding": {"temp": "2–4°C after initial 24h ambient ferment", "limit": "7–10 days optimal | 14 days maximum", "method": "Sealed GN containers, label with mix date and target serve date", "note": "Over-fermented kimchi becomes too sour for service. Use over-fermented stock in cooked applications only."}, "maintenance": "Fermentation stage check daily. Sniff and taste before service each morning.", "staff": "js"} $$
);

-- ==========================================
-- COATING SYSTEM COMPONENTS
-- ==========================================

-- 21. FLOUR MIX
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Flour Mix', 'Global', 'prep',
  $$
  {
    "id": "flour-mix",
    "name": "21. Flour Mix",
    "is_sub_recipe": true,
    "parent_sku": "FIN-KFC",
    "ratio": 0.25,
    "baseYield": 1000,
    "unit": "g",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "DRY", "name": "Flour", "qty": 1000, "unit": "g", "sku": "DRY-FLR-AP"},
      {"cat": "DRY", "name": "Corn starch", "qty": 60, "unit": "g", "sku": "DRY-STA-CRN"},
      {"cat": "DRY", "name": "Salt", "qty": 20, "unit": "g", "sku": "DRY-SLT-TBL"},
      {"cat": "DRY", "name": "MSG", "qty": 10, "unit": "g", "sku": "DRY-MSG-WHT"},
      {"cat": "SPICE", "name": "Paprika", "qty": 10, "unit": "g", "sku": "SPI-PAP-SMK"},
      {"cat": "SPICE", "name": "Nutmeg", "qty": 10, "unit": "g", "sku": "SPI-NUT-PWD"},
      {"cat": "DRY", "name": "Onion powder", "qty": 20, "unit": "g", "sku": "DRY-ONN-PWD"},
      {"cat": "DRY", "name": "Garlic powder", "qty": 30, "unit": "g", "sku": "DRY-GAR-PWD"},
      {"cat": "SPICE", "name": "Black pepper", "qty": 10, "unit": "g", "sku": "SPI-PEP-BLK"},
      {"cat": "DRY", "name": "Baking powder", "qty": 10, "unit": "g", "sku": "DRY-BKP-PWD"},
      {"cat": "DRY", "name": "Sugar", "qty": 10, "unit": "g", "sku": "DRY-SGR-WHT"}
    ],
    "method": ["Whisk dry."]
  }
  $$,
  $$ {"meta": "BASE // ADAPTIVE_BRIGADE_SOP", "title": "Flour Mix (Chicken Coating)", "weekly": {"batch": ["Batch minimum 2kg twice weekly — dry mix is shelf-stable", "Store in sealed airtight container away from moisture and heat", "Cross-use: same flour mix can be used for any fried item on the menu", "Spice ratios must be exact — pre-weigh all components to a master sheet"], "buffer": ["Minimum 500g at all times", "Trigger re-batch if working container drops to 400g"]}, "morning": {"tasks": ["[Foundation] Lay out all dry spices in pre-weighed bowls from master cheat sheet — junior executable", "[Prep Block] Combine flour + corn starch + all spices into large bowl and whisk for full incorporation", "[Parallel Station] Can run simultaneously with Starch Mix and Egg Wash prep at adjacent station", "[Critical Control] Senior performs a wet-test by dipping a small amount into water — should coat finger cleanly, no clumps"], "forward": ["Transfer to sealed container, label with date", "Stage at breading station in correct sequence GN", "Pre-fill all three breading GNs before service: Flour Mix, Egg Wash, Starch Mix"]}, "service": {"setup": ["First station: Flour Mix GN — chicken dusted in flour then pressed", "Flow: Flour Mix → Egg Wash → Starch Mix → Rest 5 min → Fry", "Flour Mix must stay dry during service — refresh from sealed container if clumping starts", "Check coating evenness before fry: uniform layer, no bare patches"], "garnish": ["N/A — coating component", "Final presentation determined by sauce choice"]}, "strategy": {"method": "Dry spice-merged flour base with starch-first coating sequence for crunch", "temp": "Room temperature storage | Fry oil: 175°C first fry", "tips": "Refresh Flour Mix GN from sealed container mid-service — wet hands contaminate dry dredge quickly.", "note": "Flour Mix is the foundational crunch layer. Spice ratios must be exact because small variations change the browning profile. Pre-batched and pre-weighed system eliminates mid-service measurement entirely."},  "holding": {"temp": "Room temperature in sealed container", "limit": "5 days sealed — oils in spices can go rancid", "method": "Airtight container, dry and cool storage", "note": "Discard if mix smells stale, oily, or off. Moisture contamination ruins entire batch."}, "maintenance": "Breading GN moisture check every 45 min during service. Replace if clumping.", "staff": "j"} $$
);

-- 22. STARCH MIX
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Starch Mix', 'Global', 'prep',
  $$
  {
    "id": "starch-mix",
    "name": "22. Starch Mix",
    "is_sub_recipe": true,
    "parent_sku": "FIN-KFC",
    "ratio": 0.25,
    "baseYield": 2000,
    "unit": "g",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "DRY", "name": "Rice starch", "qty": 1000, "unit": "g", "sku": "DRY-STA-RCE"},
      {"cat": "DRY", "name": "Corn starch", "qty": 1000, "unit": "g", "sku": "DRY-STA-CRN"}
    ],
    "method": ["Mix 1:1."]
  }
  $$,
  $$ {"meta": "BASE // ADAPTIVE_BRIGADE_SOP", "title": "Starch Mix (Chicken Coating)", "weekly": {"batch": ["Batch 2kg weekly — simplest prep in the kitchen, two ingredients", "Store in sealed container, moisture-proof", "Cross-use: final outer coating for all fried chicken and any tempura-style product", "Maintain 1:1 ratio rice:corn starch — do not substitute"], "buffer": ["Minimum 500g at all times", "Re-batch takes 5 minutes — never let stock run out"]}, "morning": {"tasks": ["[Foundation] Measure 1kg rice starch + 1kg corn starch into GN — junior task, single step", "[Prep Block] Whisk to uniform blend — visually consistent when fully mixed", "[Parallel Station] Run alongside Flour Mix and Egg Wash prep simultaneously", "[Critical Control] No senior control point required — fully junior executable if ratios confirmed"], "forward": ["Transfer to service GN, label", "Stage after Egg Wash GN in breading line sequence", "Seal remaining batch in container"]}, "service": {"setup": ["Final dredge step before frying — Starch Mix GN is last in breading line", "Press starch coating firmly onto wet egg wash surface", "Starch must fully coat — shake off excess before frying", "Rest 5 minutes after starch coat before frying for maximum adhesion"], "garnish": ["N/A — coating component", "Starch coating creates the crunch surface — critical for double-fry texture"]}, "strategy": {"method": "1:1 dry starch outer shell for maximum crunch at double-fry temperatures", "temp": "Room temperature application | First fry: 175°C | Second fry: 165°C", "tips": "Starch creates the crunch — press it firmly. A light hand gives light crunch; a firm press locks in maximum texture.", "note": "This is the simplest production item but the most critical texture element. The 1:1 ratio is scientifically tested for even browning without over-crisping."},  "holding": {"temp": "Room temperature in sealed container", "limit": "7 days sealed — starch is stable", "method": "Airtight container, cool dry storage", "note": "Moisture contamination collapses the dry starch into lumps. Discard immediately if wet."}, "maintenance": "Service GN check for clumping every 45 min. Replace from sealed container.", "staff": "j"} $$
);

-- 23. EGG WASH
INSERT INTO consulting_sops (client_id, department, dish_name, cuisine_type, dish_style, recipe_json, presentation_json) VALUES (
  'kabile', 'kitchen', 'Egg Wash', 'Global', 'prep',
  $$
  {
    "id": "egg-wash",
    "name": "23. Egg Wash",
    "is_sub_recipe": true,
    "parent_sku": "FIN-KFC",
    "ratio": 0.5,
    "baseYield": 1000,
    "unit": "ml",
    "tier": "Tier 2 (Daily)",
    "ingredients": [
      {"cat": "PROTEIN", "name": "Egg", "qty": 10, "unit": "pcs", "sku": "MT-EGG-FR"},
      {"cat": "DAIRY", "name": "Milk", "qty": 500, "unit": "ml", "sku": "DAI-MLK-FR"}
    ],
    "method": ["Whisk."]
  }
  $$,
  $$ {"meta": "BASE // ADAPTIVE_BRIGADE_SOP", "title": "Egg Wash", "weekly": {"batch": ["Mix fresh daily — never batch ahead overnight", "Standard daily batch: 10 eggs + 500ml milk per 10-portion session", "Scale to session forecast — over-batching egg wash is waste", "Cross-use: same egg wash for any breaded item including Katsu Curry"], "buffer": ["Mix on demand per session — keep cracked eggs and milk cold until needed", "5-minute rebuild if stock runs low mid-service"]}, "morning": {"tasks": ["[Foundation] Crack eggs into deep GN, add milk — runs as an opening task, 3 min total", "[Prep Block] Whisk to smooth, uniform yellow with no raw white streaks — junior executable", "[Parallel Station] Prepare simultaneously with Flour Mix and Starch Mix at adjacent station", "[Critical Control] Visual check by senior: no egg white lumps, consistent emulsion throughout"], "forward": ["Stage as middle GN in breading sequence line", "Cover and refrigerate if prepared more than 30 min before service", "Mid-service: whisk egg wash before each use if it has rested 15+ min"]}, "service": {"setup": ["Egg Wash at room temperature for service — cold wash causes coating to contract", "Fully submerge and coat each piece before Starch Mix dredge", "Shake off excess before starch — too much egg wash creates thick clumpy coating", "Replace egg wash if it becomes starchy contaminated from previous dredge"], "garnish": ["N/A — binding agent in coating system", "No visual role — functional adhesion step only"]}, "strategy": {"method": "Fresh-daily egg-milk emulsion as coating adhesion and flavor base", "temp": "Use at room temp: 18–22°C | Refrigerate if over 30 min pre-service", "tips": "A good egg wash is smooth and pourable, not thick. Thick wash = too many eggs, thin = too much milk. Check daily.", "note": "Fresh daily production is non-negotiable. Egg wash that sits develops albumin separation which creates uneven coating adhesion. 5-minute rebuild time means there is no justification for pre-batching this item."},  "holding": {"temp": "2–4°C if held pre-service | Room temp during active service max 2h", "limit": "Same-day use only | Discard at end of each service session", "method": "Covered GN at breading station | If pre-service, covered and refrigerated", "note": "Never carry over egg wash to next day. Raw egg product strict food safety requirement."}, "maintenance": "Food safety: egg wash temperature must not exceed 10°C during service. Use chilled inserts if ambient temperature is high.", "staff": "j"} $$
);
