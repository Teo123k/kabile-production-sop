const LIQUID_INGREDIENT_KEYWORDS = [
  'soy', 'vinegar', 'mirin', 'water', 'stock', 'broth', 'oil', 'sesame oil', 'milk', 'cream', 'juice',
  'worcestershire', 'wine', 'syrup', 'honey', 'molasses', 'sake', 'fish sauce', 'coconut milk', 'dashi',
  'sauce', 'ketchup', 'pure maple', 'molasses'
];
const LIGHT_BLEND_LIQUID_KEYWORDS = ['water', 'vinegar', 'stock', 'broth', 'mirin', 'sake'];
const FINISH_ACID_KEYWORDS = ['lime juice', 'lemon juice', 'yuzu juice'];
const AROMATIC_KEYWORDS = [
  'onion', 'garlic', 'ginger', 'shallot', 'leek', 'spring onion', 'scallion', 'carrot', 'celery', 'apple',
  'pear', 'daikon', 'radish', 'cabbage', 'chilli', 'chili'
];
const SPICE_KEYWORDS = [
  'pepper', 'turmeric', 'cumin', 'paprika', 'garam masala', 'msg', 'salt', 'sugar', 'chili', 'chilli',
  'coriander', 'curry powder', 'five spice', 'seasoning', 'masala', 'powder', 'starch', 'flour'
];
const PASTE_KEYWORDS = ['miso', 'paste', 'puree', 'puree', 'gochujang', 'doenjang', 'tomato paste'];
const EMULSION_KEYWORDS = ['mayo', 'mayonnaise', 'aioli'];
const FAT_KEYWORDS = ['butter', 'oil', 'fat', 'ghee', 'margarine'];
const PROTEIN_KEYWORDS = ['chicken', 'beef', 'pork', 'fish', 'tofu', 'prawn', 'shrimp'];
const CRUMB_KEYWORDS = ['panko', 'breadcrumb', 'breadcrumbs', 'crumb'];
const EGG_WASH_KEYWORDS = ['egg', 'eggs', 'milk', 'water'];
const STORAGE_KEYWORDS = ['store', 'chill', 'cool', 'portion', 'label', 'hold'];
const BLEND_KEYWORDS = ['blend', 'blitz', 'puree', 'smooth'];
const SIMMER_KEYWORDS = ['simmer', 'reduce', 'cook', 'boil', 'heat'];
const WHISK_KEYWORDS = ['whisk', 'slowly', 'gradually'];
const ROAST_KEYWORDS = ['roast', 'toast', 'char'];
const STRAIN_KEYWORDS = ['strain', 'pass', 'sieve'];
const FRY_KEYWORDS = ['fry', 'saute', 'sweat'];
const SEASONING_KEYWORDS = ['salt', 'sugar', 'msg', 'pepper', 'powder', 'seasoning', 'spice'];

const toComparableText = (value = '') => String(value || '').toLowerCase().trim();

const normalizeGeneratedName = (value = '') => (
  String(value || '')
    .replace(/^\d+[\s.\-_]*/, '')
    .replace(/\s+/g, ' ')
    .trim()
);

const dedupeIngredientList = (items = []) => {
  const seen = new Set();
  return items.filter((ingredient) => {
    const key = normalizeGeneratedName(ingredient?.name).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const formatIngredientNames = (items = [], limit = 3) => {
  const names = items
    .map((ingredient) => normalizeGeneratedName(ingredient?.name))
    .filter(Boolean);

  if (names.length === 0) return '';
  if (names.length === 1) return names[0];

  const picked = names.slice(0, limit);
  if (picked.length === 2) return `${picked[0]} and ${picked[1]}`;
  return `${picked.slice(0, -1).join(', ')}, and ${picked[picked.length - 1]}`;
};

const formatIngredientGroup = (items = [], fallback = 'the ingredients', limit = 3) => (
  formatIngredientNames(items, limit) || fallback
);

const countNamedIngredients = (items = []) => dedupeIngredientList(items).length;
const joinFragments = (...parts) => parts.filter(Boolean).join(' ');

const isSeasoningLike = (ingredient = {}) => {
  const name = toComparableText(ingredient.name);
  const category = toComparableText(ingredient.category || ingredient.cat);
  return SEASONING_KEYWORDS.some((keyword) => name.includes(keyword)) || ['spice', 'addition spice'].includes(category);
};

const isFinishAcid = (ingredient = {}) => {
  const name = toComparableText(ingredient.name);
  return FINISH_ACID_KEYWORDS.some((keyword) => name.includes(keyword));
};

const isStarchLike = (ingredient = {}) => {
  const name = toComparableText(ingredient.name);
  return name.includes('starch') || name.includes('cornflour') || name.includes('corn flour') || name.includes('potato starch');
};

const pickBlendCarrier = (items = []) => (
  dedupeIngredientList(items).find((ingredient) => {
    const name = toComparableText(ingredient?.name);
    return LIGHT_BLEND_LIQUID_KEYWORDS.some((keyword) => name.includes(keyword));
  }) || dedupeIngredientList(items)[0] || null
);

const capSentence = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return '';
  const cleaned = text.endsWith('.') ? text.slice(0, -1) : text;
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`;
};

const getRecipeCategorySignals = (recipe = {}) => {
  const name = toComparableText(recipe.name);
  const dishStyle = toComparableText(recipe.dishStyle || recipe.style || recipe.dish_style);
  const dishCategory = toComparableText(recipe.dishCategory || recipe.category || recipe.tier || recipe.cuisine_type);
  const portionClass = toComparableText(recipe.portion_class || recipe.portionClass);
  const selectorGroup = toComparableText(recipe?.scalingTips?.selectorGroup || recipe?.scaling_tips?.selectorGroup);
  const combined = [name, dishStyle, dishCategory, portionClass, selectorGroup].filter(Boolean).join(' | ');

  return {
    combined,
    isSauceLike: /(sauce|glaze|dressing|dip|mayo|aioli)/.test(combined),
    isMayoLike: /(mayo|mayonnaise|aioli)/.test(combined),
    isMarinadeLike: /(marinade|pre-prep)/.test(combined),
    isMainDish: /(main meat dish|main \+ carb dish|main dish|meat stir fry|curry|stew)/.test(combined),
    isVegDish: /(veg stir fry|salad|slaw|veg dish|vegetable)/.test(combined),
    isMainCarbDish: /(main \+ carb dish|main_carb|main carb)/.test(combined),
    isPrepComponent: /(foundation prep|component|base|foundation|carb base dish|kimchi|prep)/.test(combined)
  };
};

const classifyBoardBuckets = ({ recipe = {}, steps = [], pattern = '', categorySignals = {} }) => {
  const foundation = [];
  const morning = [];
  const afternoon = [];
  const servicePrep = [];

  const pushUnique = (bucket, step) => {
    const clean = String(step || '').trim();
    if (!clean) return;
    if (!bucket.includes(clean)) bucket.push(clean);
  };

  steps.forEach((step, index) => {
    const lower = toComparableText(step);
    const isStorage = /(label|store|chill|cool|pack)/.test(lower);
    const isService = /(before service|service|coat|coating|garnish|transfer|hold ready|hold for service|finish the batch and hold|finish with)/.test(lower);
    const isSlurry = /slurry/.test(lower);
    const isFinish = /(finish|adjust|check seasoning|whisk into|fold .*mayo|fold .*mayonnaise)/.test(lower);

    if (pattern === 'coating_system') {
      if (index <= 1) pushUnique(morning, step);
      else if (isService || /crumb|press the coating/.test(lower)) pushUnique(afternoon, step);
      else pushUnique(morning, step);
      return;
    }

    if (categorySignals.isSauceLike || categorySignals.isMarinadeLike || categorySignals.isPrepComponent || ['roux', 'stock', 'dry_mix'].includes(pattern)) {
      if (pattern === 'blended_sauce' && !categorySignals.isMayoLike && (index === 0 || /build the sauce base|build the base|heat .* then cook/.test(lower))) {
        pushUnique(foundation, step);
        return;
      }
      if (['roux', 'stock', 'dry_mix'].includes(pattern) && (index < Math.max(1, steps.length - 1) || isStorage)) {
        if (!isStorage) pushUnique(foundation, step);
        else if (foundation.length > 0) foundation[foundation.length - 1] = foundation[foundation.length - 1];
        return;
      }
      if (isStorage) {
        if (foundation.length > 0) {
          foundation[foundation.length - 1] = foundation[foundation.length - 1];
        }
        return;
      }
      if (isService || /before coating|before service/.test(lower)) {
        pushUnique(servicePrep, step);
        return;
      }
      if (isSlurry || isFinish) {
        pushUnique(morning, step);
        return;
      }
      if (pattern === 'marinade' || categorySignals.isMayoLike) {
        pushUnique(morning, step);
        return;
      }
      pushUnique(foundation, step);
      return;
    }

    if (categorySignals.isMainDish || categorySignals.isMainCarbDish || categorySignals.isVegDish) {
      if (isService) {
        pushUnique(servicePrep, step);
        return;
      }
      if (isSlurry || isFinish || index >= 2) {
        pushUnique(afternoon, step);
        return;
      }
      pushUnique(morning, step);
      return;
    }

    if (isService) {
      pushUnique(servicePrep, step);
    } else if (isSlurry || isFinish) {
      pushUnique(afternoon, step);
    } else {
      pushUnique(morning, step);
    }
  });

  return {
    weekly: {
      batch: foundation,
      buffer: []
    },
    morning: {
      tasks: morning,
      forward: afternoon
    },
    service: {
      prep: servicePrep,
      setup: [],
      garnish: []
    }
  };
};

const classifyIngredientType = (ingredient = {}) => {
  const name = toComparableText(ingredient.name);
  const category = toComparableText(ingredient.category || ingredient.cat);
  const unit = toComparableText(ingredient.unit);
  const score = { liquid: 0, aromatic: 0, spice: 0, paste: 0, fat: 0, protein: 0, dry: 0 };

  if (/^(ml|l|liter|litre)s?$/.test(unit)) score.liquid += 5;
  if (LIQUID_INGREDIENT_KEYWORDS.some((keyword) => name.includes(keyword))) score.liquid += 6;
  if (['wet', 'wet / liquid', 'stock'].includes(category)) score.liquid += 4;
  if (AROMATIC_KEYWORDS.some((keyword) => name.includes(keyword))) score.aromatic += 6;
  if (['veg', 'aromatic'].includes(category)) score.aromatic += 4;
  if (SPICE_KEYWORDS.some((keyword) => name.includes(keyword))) score.spice += 6;
  if (['spice', 'addition spice'].includes(category)) score.spice += 4;
  if (PASTE_KEYWORDS.some((keyword) => name.includes(keyword))) score.paste += 6;
  if (EMULSION_KEYWORDS.some((keyword) => name.includes(keyword))) score.paste += 7;
  if (['paste'].includes(category)) score.paste += 4;
  if (name.includes('puree') && AROMATIC_KEYWORDS.some((keyword) => name.includes(keyword))) score.aromatic += 4;
  if (name.includes('puree')) score.paste += 2;
  if (FAT_KEYWORDS.some((keyword) => name.includes(keyword))) score.fat += 6;
  if (['fat'].includes(category)) score.fat += 4;
  if (['protein'].includes(category)) score.protein += 4;
  if (PROTEIN_KEYWORDS.some((keyword) => name.includes(keyword))) score.protein += 6;
  if (['dry'].includes(category)) score.dry += 3;

  const ordered = Object.entries(score).sort((a, b) => b[1] - a[1]);
  return ordered[0][1] > 0 ? ordered[0][0] : 'dry';
};

const summarizeIngredientPhases = (ingredients = []) => {
  const summary = { liquids: [], aromatics: [], spices: [], pastes: [], fats: [], dry: [] };
  ingredients.forEach((ingredient) => {
    const type = classifyIngredientType(ingredient);
    if (type === 'liquid') summary.liquids.push(ingredient);
    else if (type === 'aromatic') summary.aromatics.push(ingredient);
    else if (type === 'spice') summary.spices.push(ingredient);
    else if (type === 'paste') summary.pastes.push(ingredient);
    else if (type === 'fat') summary.fats.push(ingredient);
    else summary.dry.push(ingredient);
  });
  return summary;
};

const detectRecipePattern = (recipe = {}) => {
  const name = toComparableText(recipe.name);
  const methodText = (recipe.method || []).join(' ').toLowerCase();
  const ingredientTypes = (recipe.ingredients || []).map(classifyIngredientType);
  const ingredientNames = (recipe.ingredients || []).map((ingredient) => toComparableText(ingredient?.name));
  const categorySignals = getRecipeCategorySignals(recipe);
  const hasMayoStyleBase = name.includes('mayo') || ingredientNames.some((ingredientName) => EMULSION_KEYWORDS.some((keyword) => ingredientName.includes(keyword)));
  const hasFlourLikeBase = ingredientNames.some((ingredientName) => ingredientName.includes('flour') || ingredientName.includes('roux'));
  const hasProtein = ingredientNames.some((ingredientName) => PROTEIN_KEYWORDS.some((keyword) => ingredientName.includes(keyword)));
  const hasCrumbs = ingredientNames.some((ingredientName) => CRUMB_KEYWORDS.some((keyword) => ingredientName.includes(keyword)));
  const hasEggWash = ingredientNames.some((ingredientName) => EGG_WASH_KEYWORDS.some((keyword) => ingredientName.includes(keyword)));
  const hasCoatingFlour = ingredientNames.some((ingredientName) => ingredientName.includes('flour') || ingredientName.includes('starch'));

  if (hasMayoStyleBase || categorySignals.isMayoLike) return 'blended_sauce';
  if (categorySignals.isMarinadeLike) return 'marinade';
  if (categorySignals.isSauceLike && !categorySignals.isMainDish) return 'blended_sauce';
  if (name.includes('coating') || name.includes('katsu') || name.includes('bread') || (hasProtein && hasCrumbs && hasCoatingFlour && hasEggWash)) return 'coating_system';
  if (name.includes('roux') || (hasFlourLikeBase && ingredientTypes.includes('fat') && WHISK_KEYWORDS.some((keyword) => methodText.includes(keyword)))) return 'roux';
  if (BLEND_KEYWORDS.some((keyword) => methodText.includes(keyword)) || name.includes('sauce') || name.includes('dressing')) return 'blended_sauce';
  if (name.includes('marinade')) return 'marinade';
  if (name.includes('stock') || methodText.includes('stock')) return 'stock';
  if (ingredientTypes.includes('spice') && ingredientTypes.every((type) => ['spice', 'dry', 'fat'].includes(type))) return 'dry_mix';
  return 'prep_base';
};

export const estimateRecipeWeight = (recipe = {}, scaleFactor = 1) => {
  const total = (recipe.ingredients || []).reduce((sum, ingredient) => {
    let qty = parseFloat(ingredient.qty) || 0;
    const unit = toComparableText(ingredient.unit);
    if (/^(kg|l|liter|litre)s?$/.test(unit)) qty *= 1000;
    return sum + qty;
  }, 0);
  return total * (parseFloat(scaleFactor) || 1);
};

export const buildChefPrepDraft = (recipe = {}, scaleFactor = 1, targetWeight = 0) => {
  const ingredients = recipe.ingredients || [];
  const methodText = (recipe.method || []).join(' ').toLowerCase();
  const phases = summarizeIngredientPhases(ingredients);
  const normalizedName = toComparableText(recipe.name);
  const categorySignals = getRecipeCategorySignals(recipe);
  const emulsionPasteItems = dedupeIngredientList(phases.pastes.filter((ingredient) => EMULSION_KEYWORDS.some((keyword) => toComparableText(ingredient?.name).includes(keyword))));
  const workingPasteItems = dedupeIngredientList(phases.pastes.filter((ingredient) => !EMULSION_KEYWORDS.some((keyword) => toComparableText(ingredient?.name).includes(keyword))));
  const hasLiquids = phases.liquids.length > 0;
  const hasAromatics = phases.aromatics.length > 0;
  const seasoningItems = dedupeIngredientList([...phases.spices, ...phases.dry.filter(isSeasoningLike), ...phases.liquids.filter(isFinishAcid)]);
  const starchItems = dedupeIngredientList(ingredients.filter(isStarchLike));
  const dryBulkItems = dedupeIngredientList(phases.dry.filter((ingredient) => !isSeasoningLike(ingredient)));
  const hasSpices = seasoningItems.length > 0;
  const hasPastes = phases.pastes.length > 0;
  const hasFat = phases.fats.length > 0;
  const pattern = detectRecipePattern(recipe);
  const scaleProfile = targetWeight >= 8000 || scaleFactor >= 3 ? 'bulk' : targetWeight >= 3000 || scaleFactor >= 1.5 ? 'production' : 'regular';
  const nonFinishLiquids = dedupeIngredientList(phases.liquids.filter((ingredient) => !isFinishAcid(ingredient)));
  const liquidNames = formatIngredientNames(nonFinishLiquids, 3);
  const aromaticNames = formatIngredientNames(phases.aromatics, 3);
  const pasteNames = formatIngredientNames(workingPasteItems, 2);
  const emulsionNames = formatIngredientNames(emulsionPasteItems, 2);
  const spiceNames = formatIngredientNames(seasoningItems, 3);
  const fatNames = formatIngredientNames(phases.fats, 2);
  const dryNames = formatIngredientNames(dryBulkItems, 2);
  const hasMayoStyleBase = normalizedName.includes('mayo') || emulsionPasteItems.length > 0;
  const hasBlendCue = BLEND_KEYWORDS.some((keyword) => methodText.includes(keyword));
  const hasSimmerCue = SIMMER_KEYWORDS.some((keyword) => methodText.includes(keyword));
  const hasWhiskCue = WHISK_KEYWORDS.some((keyword) => methodText.includes(keyword));
  const hasRoastCue = ROAST_KEYWORDS.some((keyword) => methodText.includes(keyword));
  const hasStrainCue = STRAIN_KEYWORDS.some((keyword) => methodText.includes(keyword));
  const hasFryCue = FRY_KEYWORDS.some((keyword) => methodText.includes(keyword));
  const needsChill = STORAGE_KEYWORDS.some((keyword) => methodText.includes(keyword)) || categorySignals.isSauceLike || categorySignals.isMarinadeLike || ['sauce', 'dressing', 'marinade', 'slaw'].some((keyword) => normalizedName.includes(keyword));
  const liquidCount = countNamedIngredients(nonFinishLiquids);
  const aromaticCount = countNamedIngredients(phases.aromatics);
  const pasteCount = countNamedIngredients(workingPasteItems);
  const dryBulkCount = countNamedIngredients(dryBulkItems);
  const blendCarrier = pickBlendCarrier(nonFinishLiquids);
  const blendCarrierName = normalizeGeneratedName(blendCarrier?.name);
  const slurryCarrier = pickBlendCarrier(nonFinishLiquids);
  const slurryCarrierName = normalizeGeneratedName(slurryCarrier?.name);
  const proteinItems = dedupeIngredientList(ingredients.filter((ingredient) => classifyIngredientType(ingredient) === 'protein' || PROTEIN_KEYWORDS.some((keyword) => toComparableText(ingredient?.name).includes(keyword))));
  const crumbItems = dedupeIngredientList(ingredients.filter((ingredient) => CRUMB_KEYWORDS.some((keyword) => toComparableText(ingredient?.name).includes(keyword))));
  const flourItems = dedupeIngredientList(ingredients.filter((ingredient) => {
    const name = toComparableText(ingredient?.name);
    return name.includes('flour') || name.includes('starch');
  }));
  const washItems = dedupeIngredientList(ingredients.filter((ingredient) => {
    const name = toComparableText(ingredient?.name);
    return EGG_WASH_KEYWORDS.some((keyword) => name.includes(keyword));
  }));
  const coatingSeasoningItems = dedupeIngredientList(seasoningItems.filter((ingredient) => !isFinishAcid(ingredient)));
  const steps = [];

  const pushStep = (value) => {
    const sentence = capSentence(value);
    if (!sentence) return;
    if (!steps.includes(sentence)) steps.push(sentence);
  };

  const pushCloseout = () => {
    if (pattern === 'dry_mix') return pushStep(scaleProfile === 'bulk' ? 'Pack the mix into labeled dry containers' : 'Portion, label, and store dry');
    if (pattern === 'stock') return pushStep(hasStrainCue ? 'Strain, cool, label, and chill the batch' : 'Cool, label, and chill the batch');
    if (categorySignals.isMainDish || categorySignals.isMainCarbDish || categorySignals.isVegDish) {
      return pushStep(scaleProfile === 'bulk' ? 'Transfer to gastronorms, label, and hold for service' : 'Portion for service and hold ready');
    }
    if (scaleProfile === 'bulk') return pushStep(needsChill ? 'Transfer to labeled containers and chill' : 'Transfer to labeled containers and hold ready for service');
    return pushStep(needsChill ? 'Portion, label, and store chilled' : 'Portion, label, and store');
  };

  const pushBaseStep = ({ verb = 'build', includeLiquids = hasLiquids, includeFats = false, includePastes = false, fallback = 'the base' } = {}) => {
    const parts = [];
    if (includeLiquids && nonFinishLiquids.length > 0) parts.push(formatIngredientGroup(nonFinishLiquids, 'the liquid base', 3));
    if (includeFats && hasFat) parts.push(formatIngredientGroup(phases.fats, 'the fat', 2));
    if (includePastes && hasPastes) parts.push(formatIngredientGroup(phases.pastes, 'the paste ingredients', 2));
    const subject = parts.length ? parts.join(' with ') : fallback;
    pushStep(`${verb} the base with ${subject}`);
  };

  const pushSeasoningFinish = (verb = 'add') => {
    const pieces = [];
    if (hasSpices) pieces.push(formatIngredientGroup(seasoningItems, 'the seasoning', 3));
    if (dryBulkCount > 0 && dryBulkCount <= 2) pieces.push(formatIngredientGroup(dryBulkItems, 'the solids', 2));
    const subject = pieces.join(' and ') || 'the seasoning';
    pushStep(`${verb} ${subject} and check the balance`);
  };

  const pushSlurryStep = () => {
    if (!starchItems.length || !slurryCarrierName) return;
    pushStep(`mix ${formatIngredientGroup(starchItems, 'the starch', 2)} with ${slurryCarrierName} for a smooth slurry`);
  };

  if (pattern === 'coating_system') {
    const proteinNames = formatIngredientGroup(proteinItems, 'the protein', 2);
    const flourNames = formatIngredientGroup(flourItems, 'the flour mix', 3);
    const washNames = formatIngredientGroup(washItems, 'the egg wash', 2);
    const crumbNames = formatIngredientGroup(crumbItems, 'the crumbs', 2);
    const seasoningNames = formatIngredientGroup(coatingSeasoningItems, 'the seasoning', 3);
    pushStep(`season ${proteinNames}${coatingSeasoningItems.length ? ` with ${seasoningNames}` : ''}`);
    if (washItems.length > 0) pushStep(`prepare the wash with ${washNames}`);
    if (flourItems.length > 0) pushStep(`coat ${proteinNames} in ${flourNames}${washItems.length > 0 ? ', then dip in the wash' : ''}`);
    else if (washItems.length > 0) pushStep(`dip ${proteinNames} in ${washNames}`);
    if (crumbItems.length > 0) pushStep(`finish with ${crumbNames} and press the coating on evenly`);
  } else if (pattern === 'roux') {
    pushStep(hasFat ? `melt ${formatIngredientGroup(phases.fats, 'the fat', 2)}${hasAromatics ? ` and sweat ${formatIngredientGroup(phases.aromatics, 'the aromatics', 2)}` : ''}` : 'start the roux base');
    pushStep(`add ${dryNames || 'the flour'} and cook to a nutty roux`);
    if (hasLiquids) pushStep(`whisk in ${liquidNames || 'the liquid base'} gradually until smooth`);
    else if (hasSpices) pushStep(`add ${spiceNames || 'the seasoning'} and whisk until smooth`);
    if (hasSpices && hasLiquids) pushStep(`finish with ${spiceNames || 'the seasoning'} and check the final consistency`);
    pushCloseout();
  } else if (pattern === 'stock') {
    if (hasFryCue || hasRoastCue) pushStep(hasAromatics ? `${hasRoastCue ? 'roast' : 'sweat'} ${formatIngredientGroup(phases.aromatics, 'the aromatics', 3)} to build the base` : 'build the stock base');
    else if (hasAromatics) pushStep(`start the base with ${formatIngredientGroup(phases.aromatics, 'the aromatics', 3)}`);
    if (hasLiquids) pushStep(`add ${liquidNames || 'the liquid base'} and simmer steadily`);
    if (hasSpices || hasPastes) pushStep(`add ${formatIngredientGroup([...seasoningItems, ...phases.pastes], 'the seasoning', 3)} and finish the stock`);
    if (hasStrainCue) pushStep('Strain the batch and check the final body');
    pushCloseout();
  } else if (pattern === 'blended_sauce') {
    if (hasMayoStyleBase) {
      const preBlendItems = dedupeIngredientList([...workingPasteItems, ...phases.aromatics]);
      const needsPreBlend = phases.aromatics.length > 0 && !!blendCarrierName;
      const liquidFlavorItems = dedupeIngredientList(nonFinishLiquids);
      if (preBlendItems.length > 0) pushStep((hasBlendCue || needsPreBlend) && blendCarrierName ? `blend ${formatIngredientGroup(preBlendItems, 'the flavour ingredients', 3)} with ${blendCarrierName} until smooth` : `work ${formatIngredientGroup(preBlendItems, 'the flavour ingredients', 3)} into a smooth flavour base`);
      if (liquidFlavorItems.length > 0) {
        const remainingLiquidItems = dedupeIngredientList(blendCarrierName ? liquidFlavorItems.filter((ingredient) => normalizeGeneratedName(ingredient?.name) !== blendCarrierName) : liquidFlavorItems);
        if (remainingLiquidItems.length > 0) pushStep(`add ${formatIngredientGroup(remainingLiquidItems, 'the liquid ingredients', 3)} to the mayo base`);
      }
      pushStep(`fold ${emulsionNames || 'the mayonnaise'} through until smooth and fully combined`);
      if (hasSpices || dryBulkCount > 0) pushSeasoningFinish('finish with');
      pushCloseout();
    } else {
      const shouldMergeBase = liquidCount <= 1 && (pasteCount > 0 || aromaticCount > 0);
      if (hasLiquids || hasPastes) {
        if (shouldMergeBase) pushStep(joinFragments('build the sauce base with', formatIngredientGroup([...phases.liquids, ...workingPasteItems], 'the base ingredients', 3)));
        else pushBaseStep({ verb: 'build', includeLiquids: hasLiquids, includePastes: pasteCount > 1 && !hasBlendCue, fallback: 'the sauce base' });
      }
      if (hasAromatics || (workingPasteItems.length > 0 && !shouldMergeBase)) {
        const combinedNames = [aromaticNames, (!shouldMergeBase ? pasteNames : '')].filter(Boolean).join(' and ');
        pushStep(hasBlendCue ? `add ${combinedNames || 'the vegetable ingredients'} and blend smooth` : `add ${combinedNames || 'the vegetable ingredients'} and work until fully combined`);
      }
      if (!hasAromatics && workingPasteItems.length === 0 && dryBulkCount > 0) pushStep(`${hasBlendCue ? 'blend' : 'work'} ${formatIngredientGroup(dryBulkItems, 'the solids', 2)} into the base`);
      if (starchItems.length && !hasMayoStyleBase) pushSlurryStep();
      if (hasSpices || (dryBulkCount > 0 && steps.length < 3)) pushSeasoningFinish('add');
      if (hasSimmerCue) pushStep('finish the batch over gentle heat and check the consistency');
      pushCloseout();
    }
  } else if (pattern === 'marinade') {
    const shouldMergeBase = liquidCount <= 1 && pasteCount > 0;
    if (hasLiquids || hasPastes) {
      if (shouldMergeBase) pushStep(`build the marinade base with ${formatIngredientGroup([...phases.liquids, ...phases.pastes], 'the base ingredients', 3)}`);
      else pushBaseStep({ verb: 'build', includeLiquids: hasLiquids, includePastes: false, fallback: 'the marinade base' });
    }
    if (hasAromatics || (hasPastes && !shouldMergeBase)) pushStep(`add ${[aromaticNames, (!shouldMergeBase ? pasteNames : '')].filter(Boolean).join(' and ') || 'the aromatics'}${hasBlendCue ? ' and blend smooth' : ' until fully combined'}`);
    if (hasSpices || dryBulkCount > 0) pushSeasoningFinish('finish with');
    pushCloseout();
  } else if (pattern === 'dry_mix') {
    pushStep(`combine ${dryNames || 'the dry ingredients'} evenly`);
    if (hasSpices) pushStep(`whisk ${spiceNames || 'the spice mix'} through the batch`);
    if (hasFat) pushStep(`break up ${fatNames || 'any fat-rich lumps'} and finish the mix`);
    pushCloseout();
  } else {
    if (categorySignals.isMainDish || categorySignals.isMainCarbDish || categorySignals.isVegDish) {
      if (hasProtein) {
        pushStep(hasSpices ? `season ${formatIngredientGroup(proteinItems, 'the protein', 2)} with ${formatIngredientGroup(seasoningItems, 'the seasoning', 3)}` : `prepare ${formatIngredientGroup(proteinItems, 'the protein', 2)}`);
      }
      if (hasFat || hasLiquids) {
        const baseParts = dedupeIngredientList([...phases.fats, ...nonFinishLiquids]);
        if (baseParts.length > 0) pushStep(`build the cooking base with ${formatIngredientGroup(baseParts, 'the base ingredients', 3)}`);
      }
      if (hasAromatics || hasPastes) {
        pushStep(hasFryCue || hasProtein
          ? `cook ${[aromaticNames, pasteNames].filter(Boolean).join(' and ') || 'the aromatics'} into the base`
          : `add ${[aromaticNames, pasteNames].filter(Boolean).join(' and ') || 'the aromatics'} and work through the batch`);
      }
      if (dryBulkItems.length > 0 && !hasProtein) {
        pushStep(`add ${formatIngredientGroup(dryBulkItems, 'the solids', 2)} to the base`);
      }
      if (starchItems.length) pushSlurryStep();
      if (hasSpices && !hasProtein) pushStep(`finish with ${formatIngredientGroup(seasoningItems, 'the seasoning', 3)} and adjust the balance`);
      if (hasSimmerCue || hasFryCue) pushStep(categorySignals.isMainCarbDish ? 'finish the batch and hold ready with the carb' : 'finish the batch and hold ready for service');
      pushCloseout();
    } else {
    const fatOnlyStart = hasFat && nonFinishLiquids.length === 0;
    if (fatOnlyStart && (hasAromatics || hasPastes)) {
      pushStep(`heat ${formatIngredientGroup(phases.fats, 'the oil', 2)}${hasAromatics ? `, then cook ${formatIngredientGroup(phases.aromatics, 'the aromatics', 3)}` : ''}${hasPastes ? `${hasAromatics ? ' with ' : ', then add '}${formatIngredientGroup(workingPasteItems, 'the paste ingredients', 2)}` : ''}`);
    } else if (hasLiquids || hasFat) {
      const mergeIntoBase = liquidCount <= 1 && (aromaticCount > 0 || pasteCount > 0);
      if (mergeIntoBase) pushStep(`build the base with ${formatIngredientGroup([...phases.liquids, ...phases.fats], 'the base ingredients', 3)}`);
      else pushBaseStep({ verb: 'build', includeLiquids: hasLiquids, includeFats: hasFat, fallback: 'the base' });
    }
    if ((hasAromatics || hasPastes) && !fatOnlyStart) {
      pushStep(hasBlendCue ? `add ${[aromaticNames, pasteNames].filter(Boolean).join(' and ') || 'the aromatics'} and blend smooth` : hasFryCue ? `cook ${[aromaticNames, pasteNames].filter(Boolean).join(' and ') || 'the aromatics'} into the base` : `add ${[aromaticNames, pasteNames].filter(Boolean).join(' and ') || 'the aromatics'} and work through the batch`);
    } else if (dryBulkItems.length > 0) {
      pushStep(`add ${formatIngredientGroup(dryBulkItems, 'the solids', 2)} to the base`);
    }
    if (starchItems.length) pushSlurryStep();
    if (hasSpices || (dryBulkCount > 0 && steps.length < 3)) pushStep(`add ${formatIngredientGroup([...seasoningItems, ...dryBulkItems.slice(0, 1)].filter((ingredient) => !isStarchLike(ingredient)), 'the seasoning', 3)} and adjust the finish`);
    if (hasSimmerCue && !steps.some((step) => step.toLowerCase().includes('simmer'))) pushStep('finish the batch over gentle heat');
    pushCloseout();
    }
  }

  const normalizedSteps = steps.filter(Boolean).map((step) => step.replace(/\s+/g, ' ').trim()).filter((step, index, collection) => collection.indexOf(step) === index).slice(0, 4);
  const regular = pattern === 'roux'
    ? 'Whisk steadily for a smooth roux.'
    : pattern === 'coating_system'
      ? 'Keep the breading line dry-to-wet-to-crumb for a cleaner finish.'
      : pattern === 'blended_sauce'
        ? (hasMayoStyleBase ? 'Blend the flavour base first, then fold through the mayo.' : hasBlendCue ? 'Blend after the base is fully built for a cleaner finish.' : 'Keep the ingredient order consistent for a clean finish.')
        : pattern === 'stock'
          ? 'Keep the simmer steady for a clean stock.'
          : pattern === 'dry_mix'
            ? 'Mix until seasoning is fully even.'
            : hasSimmerCue
              ? 'Keep the batch sequence and finish under controlled heat.'
              : 'Keep the batch sequence consistent.';
  const largeScale = scaleProfile === 'bulk'
    ? (pattern === 'blended_sauce'
        ? (hasMayoStyleBase ? 'Keep the mayo cold and avoid overworking the batch.' : 'Blend in stages and monitor heat levels.')
        : pattern === 'coating_system'
          ? 'Keep each tray dry and avoid compressing the crumb.'
          : pattern === 'roux'
            ? 'Do not rush colour; monitor heat levels.'
            : hasWhiskCue
              ? 'Whisk steadily and monitor heat levels.'
              : 'Monitor heat levels.')
    : (hasMayoStyleBase ? 'Keep the mayo cold and avoid overworking the batch.' : pattern === 'coating_system' ? 'Keep each tray dry and avoid compressing the crumb.' : 'Monitor heat levels.');

  return {
    steps: normalizedSteps,
    regular,
    largeScale,
    boardBuckets: classifyBoardBuckets({
      recipe,
      steps: normalizedSteps,
      pattern,
      categorySignals
    }),
    meta: { pattern, scaleProfile }
  };
};
