import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { supabase } from './supabaseClient';

const CinematicSOP = lazy(() => import('./CinematicSOP'));
const CommandBoard = lazy(() => import('./CommandBoard'));
import {
  Scale,
  ChevronDown,
  ShoppingCart,
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  Trash2,
  Zap,
  Check,
  ChefHat,
  Wind,
  Copy,
  Info,
  Beef,
  Droplets,
  Tag,
  Package,
  Utensils,
  ClipboardCheck,
  Settings as SettingsIcon,
  Globe,
  Languages,
  Moon,
  Sun,
  Gauge,
  Search,
  Save,
  Undo2,
  Pencil,
  RotateCcw,
  Maximize2,
  Timer,
  Link2,
  AlertTriangle
} from 'lucide-react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { useSettings } from './SettingsContext';

import { calculateBOM } from './utils/BOMEngine';
import {
  chefRound as coreChefRound,
  formatQuantity as coreFormatQuantity,
  formatDisplay as coreFormatDisplay,
  formatValue as coreFormatValue,
  getPortionWeight as coreGetPortionWeight,
  getPortionSize as coreGetPortionSize,
  getStandardBatchYield as coreGetStandardBatchYield,
  getRecipePortionWeight as coreGetRecipePortionWeight,
  getCanonicalBatchYield as coreGetCanonicalBatchYield,
  getCanonicalServingSize as coreGetCanonicalServingSize,
  getCanonicalPortionCount as coreGetCanonicalPortionCount,
  isSauceLikeRecipe,
  resolveRecipeId,
  resolveRecipeIdBySku,
  toGrams,
  getRecipeBaselineGrams,
  sumIngredientsGrams
} from './core';

const CLIENT_CONFIGS = {
  'kabile': {
    name: 'bu_Kabile',
    subTitle: 'Menu addition',
    accentColor: '#D4AF37', // Gold
    logo: null
  },
  'street-eat': {
    name: 'Street Eat',
    subTitle: 'Production SOP',
    accentColor: '#ff4d4d', // Red
    logo: null
  }
};

const EDIT_CATEGORY_ORDER = ['BASE', 'DAIRY', 'DRY', 'FAT', 'PROTEIN', 'SPICE', 'STOCK', 'WET / LIQUID', 'OTHER'];
const LIQUID_LIKE_CATEGORIES = new Set(['WET / LIQUID', 'STOCK']);
const toTestId = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DISH_STYLE_TO_PORTION_CLASS = {
  stew: 'stew',
  meat_stir_fry: 'meat_stir_fry',
  veg_stir_fry: 'veg_stir_fry',
  curry: 'curry',
  carb: 'carb',
  main_carb: 'main_carb',
  side: 'side',
  salad: 'salad',
  marinade: 'marinade',
  component: 'component'
};
const PORTION_CLASS_TO_DISH_STYLE = {
  stew: 'stew',
  meat_stir_fry: 'meat_stir_fry',
  veg_stir_fry: 'veg_stir_fry',
  curry: 'curry',
  carb: 'carb',
  main_carb: 'main_carb',
  side: 'side',
  salad: 'salad',
  marinade: 'marinade',
  component: 'component'
};
const PORTION_CLASS_OPTIONS = [
  ['stew', 'Stew'],
  ['meat_stir_fry', 'Meat Stir Fry'],
  ['veg_stir_fry', 'Veg Stir Fry'],
  ['curry', 'Curry'],
  ['carb', 'Carb'],
  ['main_carb', 'Main + Carb'],
  ['side', 'Side'],
  ['salad', 'Salad'],
  ['marinade', 'Marinade'],
  ['component', 'Component']
];
const PORTION_CLASS_LABELS = Object.fromEntries(PORTION_CLASS_OPTIONS);
const FOUNDATION_PREP_IDS = new Set([
  'magic-soy',
  'fried-chicken-coating-system'
]);
const FOUNDATION_PREP_ORDER = {
  'magic-soy': 0,
  'fried-chicken-coating-system': 1
};
const FRIED_CHICKEN_COATING_IDS = new Set([
  'sweet-spicy-sauce',
  'extra-spicy-sauce',
  'honey-butter',
  'thai-spicy-sauce'
]);
const FRIED_CHICKEN_COATING_ORDER = {
  'sweet-spicy-sauce': 0,
  'extra-spicy-sauce': 1,
  'honey-butter': 2,
  'thai-spicy-sauce': 3
};
const FRIED_CHICKEN_DIP_IDS = new Set([
  'kimchi-mayo',
  'gochujang-mayo',
  'blue-cheese-sauce',
  'sriracha-mayo'
]);
const FRIED_CHICKEN_DIP_ORDER = {
  'kimchi-mayo': 0,
  'gochujang-mayo': 1,
  'blue-cheese-sauce': 2,
  'sriracha-mayo': 3
};
const KATSU_CURRY_SYSTEM_IDS = new Set([
  'chicken-katsu-for-curry',
  'curry-vege-base',
  'curry-roux',
  'katsu-curry-sauce'
]);
const KATSU_CURRY_SYSTEM_ORDER = {
  'chicken-katsu-for-curry': 0,
  'curry-vege-base': 1,
  'curry-roux': 2,
  'katsu-curry-sauce': 3
};
const KATSU_SAUCE_IDS = new Set(['bbq-sauce']);
const MARINADE_PREP_IDS = new Set([
  'dakgalbi-sauce',
  'bulgogi-sauce'
]);
const MAIN_MEAT_IDS = new Set([
  'bulgogi-dish',
  'dakgalbi-dish',
  'korean-fried-chicken'
]);
const MAIN_CARB_IDS = new Set([
  'classic-tteokbokki',
  'japchae-magic-soy',
  'japchae-classic',
  'japchae-classic-sauce-2',
  'king-tteokbokki-magic-soy'
]);
const MAIN_CARB_ORDER = {
  'classic-tteokbokki': 0,
  'japchae-magic-soy': 1,
  'japchae-classic': 2,
  'japchae-classic-sauce-2': 3,
  'king-tteokbokki-magic-soy': 4
};
const CARB_BASE_IDS = new Set(['udon-base']);
const SALAD_IDS = new Set(['asian-coleslaw', 'radish-pickle']);
const KIMCHI_IDS = new Set(['kimchi-paste', 'kimchi']);
const KIMCHI_ORDER = {
  'kimchi-paste': 0,
  'kimchi': 1
};


const SopMain = () => {
  useEffect(() => { console.log("CORE_LOGIC_DEFENSIVE_UPGRADE_V5_17:45"); }, []);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('scaler');
  const [lastDeletedIngredient, setLastDeletedIngredient] = useState(null);
  const [pendingIngredientCategory, setPendingIngredientCategory] = useState('PROTEIN');
  const [editingCategoryHeader, setEditingCategoryHeader] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [showRecipeNotes, setShowRecipeNotes] = useState(false);
  const [expandedNoteIndex, setExpandedNoteIndex] = useState(null);
  const [lastDeletedNote, setLastDeletedNote] = useState(null);

  // HEURISTIC: Calculate the actual weight of the recipe in the DB
  // We use this as the scaling anchor in portion mode to fix messy metadata.
  const sumWeight = useCallback((recipe) => {
    if (!recipe || !recipe.ingredients) return 0;
    return recipe.ingredients.reduce((acc, ing) => {
      let qty = parseFloat(ing.qty) || 0;
      const u = (ing.unit || '').toLowerCase();
      // Mass/Volume conversion - Unified Codex V3.0
      if (/^(kg|l|liter|litre|kilogram)s?$/.test(u)) qty *= 1000;
      return acc + qty;
    }, 0);
  }, []);
  const [selectedId, setSelectedId] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    unitSystem,
    setUnitSystem,
    mainPortionSize,
    setMainPortionSize,
    sidePortionSize,
    setSidePortionSize,
    starterPortionSize,
    setStarterPortionSize,
    portionWeightStew,
    setPortionWeightStew,
    portionWeightMeatStirFry,
    setPortionWeightMeatStirFry,
    portionWeightVegStirFry,
    setPortionWeightVegStirFry,
    portionWeightCurry,
    setPortionWeightCurry,
    portionWeightCarb,
    setPortionWeightCarb,
    portionWeightMainCarb,
    setPortionWeightMainCarb,
    portionWeightSide,
    setPortionWeightSide,
    portionWeightSalad,
    setPortionWeightSalad,
    portionWeightMarinade,
    setPortionWeightMarinade,
    portionWeightComponent,
    setPortionWeightComponent,
    volumeFocus,
    setVolumeFocus,
    portionsPerBatch,
    setPortionsPerBatch,
    batchSettings,
    setBatchSettings,
    menuMix,
    setMenuMix,
    translateIngredient
  } = useSettings();
  const [portionMode, setPortionMode] = useState(false);
  const [editingIngId, setEditingIngId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [isRecipeMenuOpen, setIsRecipeMenuOpen] = useState(false);
  const [isMarketExportOpen, setIsMarketExportOpen] = useState(false);
  const [isScalerExportOpen, setIsScalerExportOpen] = useState(false);
  const [scalerExportFormat, setScalerExportFormat] = useState('pdf');
  const [scalerExportLayout, setScalerExportLayout] = useState('horizontal');
  const [scalerExportRecipeIds, setScalerExportRecipeIds] = useState([]);
  const [offlineStatus, setOfflineStatus] = useState(false);
  const [editIngBase, setEditIngBase] = useState(null); // {idx, field}
  const [isEditMode, setIsEditMode] = useState(false);

  const { clientSlug } = useParams();
  const config = CLIENT_CONFIGS[clientSlug] || CLIENT_CONFIGS['kabile'];

  const coreSettings = useMemo(() => ({
    mainPortionSize,
    sidePortionSize,
    starterPortionSize,
    portionsPerBatch,
    portionWeightStew,
    portionWeightMeatStirFry,
    portionWeightVegStirFry,
    portionWeightCurry,
    portionWeightCarb,
    portionWeightMainCarb,
    portionWeightSide,
    portionWeightSalad,
    portionWeightMarinade,
    portionWeightComponent
  }), [
    mainPortionSize,
    sidePortionSize,
    starterPortionSize,
    portionsPerBatch,
    portionWeightStew,
    portionWeightMeatStirFry,
    portionWeightVegStirFry,
    portionWeightCurry,
    portionWeightCarb,
    portionWeightMainCarb,
    portionWeightSide,
    portionWeightSalad,
    portionWeightMarinade,
    portionWeightComponent
  ]);

  const chefRound = useCallback((val, unit = '') =>
    coreChefRound(val, unit)
    , []);

  const formatQuantity = useCallback((val, unit = '') =>
    coreFormatQuantity(val, unit, unitSystem)
    , [unitSystem]);

  const formatDisplay = useCallback((val, unit) =>
    coreFormatDisplay(val, unit, unitSystem)
    , [unitSystem]);

  const getPortionWeight = useCallback((recipe) =>
    coreGetPortionWeight(recipe, coreSettings, recipes)
    , [coreSettings, recipes]);

  const getRecipePortionWeight = useCallback((recipe) =>
    coreGetRecipePortionWeight(recipe, coreSettings, recipes)
    , [coreSettings, recipes]);

  const getPortionSize = useCallback((recipe) =>
    coreGetPortionSize(recipe, coreSettings, recipes)
    , [coreSettings, recipes]);

  const getStandardBatchYield = useCallback((recipe) =>
    coreGetStandardBatchYield(recipe, coreSettings, recipes)
    , [coreSettings, recipes]);

  const roundKitchenPortions = useCallback((value) => {
    const numeric = parseFloat(value) || 0;
    if (numeric <= 0) return 0;
    const whole = Math.floor(numeric);
    const fraction = numeric - whole;
    return whole + (fraction > 0.5 ? 1 : 0);
  }, []);

  const formatPortionDisplay = useCallback((value) => {
    const rounded = roundKitchenPortions(value);
    return {
      v: String(rounded),
      u: rounded === 1 ? 'Portion' : 'Portions'
    };
  }, [roundKitchenPortions]);

  const getBatchTargetGrams = useCallback((recipe, batchCount = 1) => {
    if (!recipe) return 0;
    const baseline = getRecipeBaselineGrams(recipe, false, coreSettings);
    const standardBatchYield = getStandardBatchYield(recipe);
    const perBatchTarget = standardBatchYield > 0 ? standardBatchYield : baseline;
    return (parseFloat(batchCount) || 0) * perBatchTarget;
  }, [coreSettings, getStandardBatchYield]);

  // SHARED STATE: Initialized with Base Yields
  const [planIntent, setPlanIntent] = useState({});

  // Fetch Recipes from Supabase with Rich Data Merging
  useEffect(() => {
    async function getRecipes() {
      setLoading(true);
      try {
        // Attempt to load from offline cache first (Vercel/Chef Best Practices: offline-first)
        const cached = localStorage.getItem(`sop_cache_${clientSlug || 'kabile'}`);
        if (cached) {
          try {
            const parsedCache = JSON.parse(cached);
            setRecipes(parsedCache);
            setLoading(false); // Quick UI win
          } catch (e) {
            console.error("Cache corrupted:", e);
          }
        }

        // Fetch from multiple tables to extract the richest possible operational data
        const [recipeRes, legacyRes] = await Promise.all([
          supabase.from('sop_recipes').select('*').eq('client_id', clientSlug || 'kabile'),
          supabase.from('consulting_sops').select('*').eq('client_id', clientSlug || 'kabile')
        ]);

        const normalize = (s) => (s || '').toLowerCase().trim().replace(/^\d+[\s.\-_]*/, '').replace(/[\s\-_]/g, '');

        // Build a map for O(1) matching (Vercel Best Practices: js-index-maps)
        const legacyData = legacyRes.data || [];
        const legacyMap = new Map();
        legacyData.forEach(l => {
          legacyMap.set(normalize(l.dish_name), l);
          if (l.recipe_json?.id) {
            legacyMap.set(normalize(l.recipe_json.id), l);
          }
        });

        let baseData = recipeRes.data || [];
        if (baseData.length === 0) {
          baseData = legacyData;
        }

        const parsed = baseData.map(row => {
          const normName = normalize(row.recipe_name || row.dish_name);
          const normId = normalize(row.recipe_id);
          const legacyMatch = legacyMap.get(normName) || legacyMap.get(normId);

          // Extract rich strategy block from the legacy presentation JSON
          let strategy = {};
          let r = {};
          try {
            if (legacyMatch && legacyMatch.presentation_json) {
              const pjson = typeof legacyMatch.presentation_json === 'string'
                ? JSON.parse(legacyMatch.presentation_json)
                : legacyMatch.presentation_json;
              if (pjson?.strategy) strategy = pjson.strategy;
            }
          } catch (e) {
            console.error("Presentation JSON Parse Error:", e);
          }

          try {
            r = typeof row.recipe_json === 'string' ? JSON.parse(row.recipe_json) : (row.recipe_json || {});
          } catch (e) {
            console.error("Recipe JSON Parse Error:", e);
          }

          // Formulate the richest possible method breakdown
          const baseMethod = Array.isArray(row.method) && row.method.length > 0 ? row.method : (r.method || []);
          let richMethod = baseMethod;
          if (strategy.method || strategy.tips || strategy.temp) {
            richMethod = [
              strategy.method ? `Methodology: ${strategy.method}` : '',
              strategy.temp ? `Temp Control: ${strategy.temp}` : '',
              strategy.tips ? `Chef Tips: ${strategy.tips}` : ''
            ].filter(Boolean);
          }

          return {
            ...row,
            ...r,
            id: row.recipe_id || r.id || row.id,
            name: row.recipe_name || r.name || row.dish_name || r.title,
            baseYield: row.base_yield || r.baseYield || 1,
            unit: row.yield_unit || r.unit || 'kg',
            ingredients: Array.isArray(row.ingredients) && row.ingredients.length > 0
              ? row.ingredients
              : (Array.isArray(r.ingredients) ? r.ingredients : []),
            method: richMethod.length > 0 ? richMethod : ['Standard preparation.'],
            bulkMethod: Array.isArray(row.bulk_method) && row.bulk_method.length > 0 ? row.bulk_method : (strategy.tips ? [strategy.tips] : []),
            scalingTips: (row.scaling_tips && typeof row.scaling_tips === 'object' ? row.scaling_tips : (r.scalingTips || {})),
            // Prioritize the deep strategy narrative, then standard note
            note: strategy.note || row.note || r.note || 'No operational notes provided.',
            dishStyle: row.dish_style || r.dishStyle || r.style || 'stewed',
            dishCategory: row.tier || row.cuisine_type || r.dishCategory || r.category || 'Tier 2 (Daily)',
            portion_class: row.portion_class || r.portion_class || r.portionClass || '',
            recorded_serving_weight: row.recorded_serving_weight ?? r.recorded_serving_weight ?? r.recordedServingWeight ?? null,
            recorded_serving_unit: row.recorded_serving_unit || r.recorded_serving_unit || r.recordedServingUnit || 'g',
            production_strategy: row.production_strategy || 'dynamic_daily',
            production_batch_size: row.production_batch_size || null,
            is_deleted: row.is_deleted || false,
            show_on_board: row.show_on_board !== undefined ? row.show_on_board : true,
            cuisine: row.cuisine || r.cuisine || '',
            occasion: row.occasion || r.occasion || ''
          };
        });

        setRecipes(parsed);
        // Sync to offline cache
        localStorage.setItem(`sop_cache_${clientSlug || 'kabile'}`, JSON.stringify(parsed));
        setOfflineStatus(false);
      } catch (err) {
        console.error("Fetch failure:", err);
      } finally {
        setLoading(false);
      }
    }
    getRecipes();
  }, [clientSlug]);

  // Secondary initialization for production targets
  useEffect(() => {
    if (recipes.length > 0) {
      if (!selectedId || !recipes.find(r => r.id === selectedId)) {
        setSelectedId(recipes[0].id);
      }
    }
  }, [recipes, volumeFocus]);

  // Apply Static Theme & Dynamic Brand Colors
  useEffect(() => {
    document.documentElement.style.setProperty('--app-accent', config.accentColor);
    document.documentElement.style.setProperty('--app-accent-hover', `${config.accentColor}dd`);
  }, [config]);

  // Mode Switch Safety (Vercel Best Practices: rerender-derived-state-no-effect)
  // Mode Switch Safety: No longer force reset on mode change to allow persistence

  // Reactive Sync: We no longer auto-populate planIntent. 
  // It remains empty {} unless the user makes manual edits, allowing calculateBOM to use volumeFocus reactively.

  // ROOT RECIPE IDS (Must be defined before bomResult which depends on it)
  const rootRecipeIds = useMemo(() => {
    const consumedIds = new Set();
    recipes.forEach(parent => {
      parent.ingredients?.forEach(ing => {
        const id = resolveRecipeId(ing, recipes);
        if (id) consumedIds.add(id);
      });
    });

    const roots = new Set();
    recipes.forEach(r => {
      if (!consumedIds.has(r.id)) roots.add(r.id);
    });
    return roots;
  }, [recipes]);

  // 1. BILL OF MATERIALS (BOM) ENGINE - CONTROLLER LAYER
  // Mode determines UNIT INTERPRETATION, not whether user input is accepted.
  // planIntent always takes priority. volumeFocus is the fallback for root recipes without manual seeds.
  const bomResult = useMemo(() => {
    if (recipes.length === 0) return { nodes: {}, demand: {}, activeOrigins: {} };

    const rawScales = {};

    // Step 1: Resolve all manual seeds from planIntent (works in BOTH modes)
    Object.entries(planIntent).forEach(([id, intent]) => {
      const r = recipes.find(rec => rec.id === id);
      if (!r) return;
      
      const { val, mode } = intent;
      const numericVal = parseFloat(val) || 0;
      if (numericVal <= 0) return;

      const baseline = getRecipeBaselineGrams(r, false, coreSettings);
      
      let targetGrams = 0;
      if (mode === 'batch') {
        targetGrams = getBatchTargetGrams(r, numericVal);
      } else if (mode === 'portion') {
        const portionWeight = getRecipePortionWeight(r);
        if (!portionWeight) return;
        targetGrams = numericVal * portionWeight;
      } else {
        targetGrams = numericVal;
      }
      
      rawScales[id] = targetGrams / Math.max(0.001, baseline);
    });

    // Step 2: Seed BOM ONLY with recipes that have explicit manual intent (Codex V3.8)
    // Removed default 1.0 seeding to allow library recipes to show raw data without propagation noise.
    if (Object.keys(rawScales).length === 0) return { nodes: {}, demand: {}, activeOrigins: {} };

    return calculateBOM(recipes, rawScales, portionsPerBatch, coreSettings);
  }, [recipes, volumeFocus, menuMix, planIntent, coreSettings, rootRecipeIds, getPortionWeight, getStandardBatchYield, portionsPerBatch]);

  const activeNodes = bomResult.nodes || {};
  const activeDemand = bomResult.demand || {};
  const activeOrigins = bomResult.activeOrigins || {};
  const boardPortionTargets = useMemo(() => {
    const next = {};
    Object.entries(activeNodes).forEach(([id, node]) => {
      const portions = parseFloat(node?.portions);
      if (!isNaN(portions) && portions > 0) next[id] = portions;
    });
    return next;
  }, [activeNodes]);

  const recipeIdByName = useMemo(() => {
    const next = {};
    recipes.forEach((recipe) => {
      if (recipe?.name) next[recipe.name.toLowerCase().trim()] = recipe.id;
    });
    return next;
  }, [recipes]);

  // Unified Target Resolver (Vercel Best Practices: js-early-exit)
  const handleUpdateTarget = useCallback((recipeId, val, modeOverride = null) => {
    const r = recipes.find(rec => rec.id === recipeId);
    if (!r) return;

    // Use current view mode as default if no override provided
    const mode = modeOverride || (portionMode ? 'portion' : 'batch');

    let numericVal = parseFloat(val) || 0;
    if (mode === 'portion' && numericVal > 0) {
      numericVal = roundKitchenPortions(numericVal);
    }

    setPlanIntent(prev => ({
      ...prev,
      [recipeId]: { val: numericVal, mode }
    }));
  }, [recipes, portionMode]);

  const handleCommitTarget = useCallback((recipeId, mode) => {
    if (mode !== 'portion') return;

    const currentVal = parseFloat(planIntent[recipeId]?.val) || 0;
    if (currentVal > 0 && currentVal < 2) {
      setPlanIntent(prev => ({
        ...prev,
        [recipeId]: { val: 2, mode: 'portion' }
      }));
      return;
    }

    if (currentVal >= 2) {
      setPlanIntent(prev => ({
        ...prev,
        [recipeId]: { val: roundKitchenPortions(currentVal), mode: 'portion' }
      }));
    }
  }, [planIntent]);

  // Ensure activeRecipe stays within filtered results if searching
  const filteredRecipesList = useMemo(() => {
    return recipes.filter(r => {
      const matchesSearch =
        (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.cuisine || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.dishStyle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.occasion || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDeleteStatus = showDeleted ? r.is_deleted : !r.is_deleted;
      return matchesSearch && matchesDeleteStatus;
    });
  }, [recipes, searchQuery, showDeleted]);

  const activeRecipe = useMemo(() => {
    const found = filteredRecipesList.find(r => r.id === selectedId);
    return found || filteredRecipesList[0];
  }, [selectedId, filteredRecipesList]);

  const linkableRecipes = useMemo(
    () => recipes.filter(r => r.id && r.id !== activeRecipe?.id),
    [recipes, activeRecipe?.id]
  );

  // If activeRecipe switches due to search, update selectedId
  useEffect(() => {
    if (activeRecipe && activeRecipe.id !== selectedId) {
      setSelectedId(activeRecipe.id);
    }
  }, [activeRecipe?.id, selectedId]);

  useEffect(() => {
    if (activeRecipe?.id && scalerExportRecipeIds.length === 0) {
      setScalerExportRecipeIds([activeRecipe.id]);
    }
  }, [activeRecipe?.id, scalerExportRecipeIds.length]);

  // STEP 2 — INTENT-AWARE SCALING CONTRACT
  const hasIntent = !!planIntent[activeRecipe?.id];

  const activeNodeData = (activeRecipe && hasIntent) ? activeNodes[activeRecipe.id] : null;
  const baselineYieldGrams = activeRecipe ? getRecipeBaselineGrams(activeRecipe, false, coreSettings) : 0;
  const baselineEdibleGrams = activeRecipe ? getRecipeBaselineGrams(activeRecipe, true, coreSettings) : 0;
  const defaultProductionBatchGrams = activeRecipe ? getBatchTargetGrams(activeRecipe, 1) : 0;
  const defaultProductionScaleFactor = (!portionMode && activeRecipe)
    ? (defaultProductionBatchGrams / Math.max(0.001, baselineYieldGrams || 1))
    : 1;

  // STEP 1 — CONSOLIDATED CONTRACT (Codex V2.1)
  const selectedBatchCount = !portionMode ? (planIntent[activeRecipe?.id]?.val || 1) : 1;
  const selectedPortionCount = portionMode 
    ? (planIntent[activeRecipe?.id]?.val || 0)
    : portionsPerBatch;
  
  const isComponentRecipe = (() => {
    if (!activeRecipe) return false;
    const style = (activeRecipe.dishStyle || activeRecipe.style || '').toLowerCase();
    const cat = (activeRecipe.dishCategory || '').toLowerCase();
    const name = (activeRecipe.name || '').toLowerCase();

    return isSauceLikeRecipe(activeRecipe) || 
           ['sauce', 'glaze', 'marinade', 'coating', 'paste', 'dip', 'prep', 'base', 'stock', 'component'].includes(style) ||
           ['condiment', 'sauce', 'topping', 'base', 'stock', 'prep', 'component'].includes(cat) ||
           name.includes('sauce') || name.includes('marinade') || name.includes('roux') || name.includes('base') || name.includes('master') || name.includes('paste') || name.includes('prep');
  })();
  
  const totalTargetPortions = !portionMode 
    ? (isComponentRecipe ? selectedBatchCount : selectedBatchCount * portionsPerBatch) 
    : selectedPortionCount;
  const displayTargetPortions = roundKitchenPortions(totalTargetPortions);
  const selectedDemandNode = activeRecipe ? activeNodes[activeRecipe.id] : null;
  const selectedEstimatedUseGrams = selectedDemandNode?.demandWeight || 0;
  const selectedShortageGrams = selectedDemandNode?.shortageWeight || 0;
  const productionBatchCount = !portionMode
    ? Number((selectedBatchCount || 1).toFixed(1))
    : 1;
  const productionPortionsPerBatch = portionsPerBatch;
  const productionTotalPortions = Number((productionBatchCount * productionPortionsPerBatch).toFixed(1));

  // STEP 2.5 — PURE SCALE FACTOR (Codex Phase 2 Root)
  const rootScaleFactor = useMemo(() => {
    if (!hasIntent || !activeRecipe) return 1.0;
    const baseline = getRecipeBaselineGrams(activeRecipe, false, coreSettings);
    const intent = planIntent[activeRecipe.id];
    if (!intent || !intent.val) return 1.0;

    let targetGrams = 0;
    if (intent.mode === 'batch') {
      targetGrams = getBatchTargetGrams(activeRecipe, intent.val);
    } else if (intent.mode === 'portion') {
      const yieldUnit = String(activeRecipe.yieldUnit || activeRecipe.yield_unit || '').toLowerCase().trim();
      const savedBaseYield = Number(activeRecipe.baseYield ?? activeRecipe.base_yield ?? 0);
      if (intent.sourceDefault && savedBaseYield > 0 && /^portions?$/.test(yieldUnit)) {
        return intent.val / Math.max(0.001, savedBaseYield);
      }
      const portionWeight = getRecipePortionWeight(activeRecipe);
      if (!portionWeight) return 1.0;
      targetGrams = intent.val * portionWeight;
    } else {
      targetGrams = intent.val;
    }
    
    return targetGrams / Math.max(0.001, baseline);
  }, [hasIntent, activeRecipe, planIntent, coreSettings, recipes, getBatchTargetGrams]);

  const displayScaleFactor = hasIntent ? rootScaleFactor : defaultProductionScaleFactor;
  const currentYieldValue = activeNodeData
    ? activeNodeData.weight
    : (portionMode ? baselineYieldGrams : baselineYieldGrams * displayScaleFactor);
  const currentEdibleYieldValue = activeNodeData
    ? (activeNodeData.edibleWeight || activeNodeData.weight)
    : (portionMode ? baselineEdibleGrams : baselineEdibleGrams * displayScaleFactor);
  const resolvedRecipePortionWeight = activeRecipe ? getRecipePortionWeight(activeRecipe) : null;
  const currentPortionCount = activeNodeData
    ? Number(activeNodeData.portions.toFixed(1))
    : (activeRecipe
      ? Number((currentYieldValue / Math.max(0.001, resolvedRecipePortionWeight || coreGetPortionWeight(activeRecipe, coreSettings, recipes))).toFixed(1))
      : 0);
  const displayCurrentPortionCount = roundKitchenPortions(currentPortionCount);

  const isScaled = hasIntent ? Math.abs(rootScaleFactor - 1) > 0.001 : false;

  const portionWeightGrams = resolvedRecipePortionWeight || getPortionWeight(activeRecipe, coreSettings, recipes);
  
  // DEFENSIVE BASELINE: If no intent, use physical sumWeight directly (bypass BOM)
  const totalEdibleWeightGrams = !hasIntent
    ? (portionMode
      ? (sumIngredientsGrams(activeRecipe) || activeRecipe?.baseYield || 1)
      : currentEdibleYieldValue)
    : (getRecipeBaselineGrams(activeRecipe, false, coreSettings) * rootScaleFactor);
  const totalEdibleWeightFormatted = formatDisplay(totalEdibleWeightGrams, 'g');

  // Memoize grouped and sorted recipes for the selector (Vercel Best Practices: rerender-memo)
  // Memoize grouped and sorted recipes for the selector
  const groupedRecipes = useMemo(() => {
    const groups = filteredRecipesList.reduce((acc, r) => {
      const portionClass = (r.portion_class || r.portionClass || '').toLowerCase();
      const groupLabel =
        FOUNDATION_PREP_IDS.has(r.id) ? 'Foundation Prep' :
        FRIED_CHICKEN_COATING_IDS.has(r.id) ? 'Fried Chicken Sauce (Coating)' :
        FRIED_CHICKEN_DIP_IDS.has(r.id) ? 'Fried Chicken (Dipping Sauce)' :
        KATSU_CURRY_SYSTEM_IDS.has(r.id) ? 'Katsu Curry System' :
        KATSU_SAUCE_IDS.has(r.id) ? 'Katsu Sauce' :
        MARINADE_PREP_IDS.has(r.id) ? 'Marinade / Pre-Prep' :
        MAIN_MEAT_IDS.has(r.id) ? 'Main Meat Dish' :
        MAIN_CARB_IDS.has(r.id) ? 'Main + Carb Dish' :
        CARB_BASE_IDS.has(r.id) || portionClass === 'carb' ? 'Carb Base Dish' :
        SALAD_IDS.has(r.id) || portionClass === 'salad' || portionClass === 'side' ? 'Salad' :
        KIMCHI_IDS.has(r.id) ? 'Kimchi' :
        'Foundation Prep';
      if (!acc[groupLabel]) acc[groupLabel] = [];
      acc[groupLabel].push(r);
      return acc;
    }, {});

    const order = [
      'Foundation Prep',
      'Fried Chicken Sauce (Coating)',
      'Fried Chicken (Dipping Sauce)',
      'Katsu Curry System',
      'Katsu Sauce',
      'Marinade / Pre-Prep',
      'Main Meat Dish',
      'Main + Carb Dish',
      'Carb Base Dish',
      'Salad',
      'Kimchi'
    ];
    return Object.entries(groups)
      .map(([label, items]) => [
        label,
        [...items].sort((a, b) => {
          if (label === 'Foundation Prep') return (FOUNDATION_PREP_ORDER[a.id] ?? 99) - (FOUNDATION_PREP_ORDER[b.id] ?? 99);
          if (label === 'Fried Chicken Sauce (Coating)') return (FRIED_CHICKEN_COATING_ORDER[a.id] ?? 99) - (FRIED_CHICKEN_COATING_ORDER[b.id] ?? 99);
          if (label === 'Fried Chicken (Dipping Sauce)') return (FRIED_CHICKEN_DIP_ORDER[a.id] ?? 99) - (FRIED_CHICKEN_DIP_ORDER[b.id] ?? 99);
          if (label === 'Katsu Curry System') return (KATSU_CURRY_SYSTEM_ORDER[a.id] ?? 99) - (KATSU_CURRY_SYSTEM_ORDER[b.id] ?? 99);
          if (label === 'Main + Carb Dish') return (MAIN_CARB_ORDER[a.id] ?? 99) - (MAIN_CARB_ORDER[b.id] ?? 99);
          if (label === 'Kimchi') return (KIMCHI_ORDER[a.id] ?? 99) - (KIMCHI_ORDER[b.id] ?? 99);
          return a.name.localeCompare(b.name);
        })
      ])
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [filteredRecipesList]);

  const standardBatchYield = useMemo(() => {
    return getStandardBatchYield(activeRecipe);
  }, [activeRecipe, getStandardBatchYield]);

  const totalWeightForActive = useMemo(() => {
    if (!activeRecipe) return { v: 0, u: 'g' };
    // currentEdibleYieldValue reflects only edible mass (excluding process oil)
    return formatDisplay(currentEdibleYieldValue, 'g');
  }, [activeRecipe, currentEdibleYieldValue, formatDisplay]);

  const isBulkMode = useMemo(() => {
    // Volume focus of 300 or 600+ automatically triggers bulk mode for efficiency
    if (volumeFocus >= 300) return true;
    return currentYieldValue >= (activeRecipe?.bulkThreshold || 50);
  }, [currentYieldValue, activeRecipe, volumeFocus]);

  const handleReverseScale = (ing, newQty) => {
    if (!activeRecipe || !newQty || newQty <= 0) return;
    const factor = newQty / ing.qty;
    const newYield = activeRecipe.baseYield * factor;

    const finalVal = portionMode
      ? roundKitchenPortions(newYield / (getPortionSize(activeRecipe) || 1))
      : Number(newYield.toFixed(2));

    const mode = portionMode ? 'portion' : 'weight';
    setPlanIntent({ ...planIntent, [selectedId]: { val: finalVal, mode } });
    setEditingIngId(null);
  };

  const handleSoftDelete = async (recipeId) => {
    if (!window.confirm("Soft delete this recipe? It will be moved to the bin.")) return;
    try {
      const { error } = await supabase.from('sop_recipes').update({ is_deleted: true }).eq('recipe_id', recipeId);
      if (error) throw error;
      setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, is_deleted: true } : r));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete recipe.");
    }
  };

  const handleRestore = async (recipeId) => {
    try {
      const { error } = await supabase.from('sop_recipes').update({ is_deleted: false }).eq('recipe_id', recipeId);
      if (error) throw error;
      setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, is_deleted: false } : r));
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Failed to restore recipe.");
    }
  };

  const handleUpdateRecipe = async () => {
    if (!activeRecipe) return;
    try {
      const { error } = await supabase.from('sop_recipes').update({
        ingredients: activeRecipe.ingredients,
        method: activeRecipe.method,
        bulk_method: activeRecipe.bulkMethod || activeRecipe.bulk_method || [],
        scaling_tips: activeRecipe.scalingTips || {},
        show_on_board: activeRecipe.show_on_board,
        cuisine: activeRecipe.cuisine,
        occasion: activeRecipe.occasion,
        yield_unit: activeRecipe.unit,
        base_yield: activeRecipe.baseYield,
        yield_mode: activeRecipe.yieldMode,
        serving_kind: activeRecipe.serving_kind,
        serving_size: activeRecipe.servingSize,
        batch_yield: activeRecipe.batchYield,
        portion_class: activeRecipe.portion_class || null,
        recorded_serving_weight: activeRecipe.recorded_serving_weight ? parseFloat(activeRecipe.recorded_serving_weight) : null,
        recorded_serving_unit: activeRecipe.recorded_serving_unit || null
      }).eq('recipe_id', activeRecipe.id);
      if (error) throw error;
      // Alert removed per user request for silent saving
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const updateActiveRecipeLocal = (updates) => {
    setRecipes(prev => prev.map(r => r.id === selectedId ? { ...r, ...updates } : r));
  };

  const updateIngredientLocal = (idx, updates) => {
    const newIngredients = [...activeRecipe.ingredients];
    newIngredients[idx] = { ...newIngredients[idx], ...updates };
    updateActiveRecipeLocal({ ingredients: newIngredients });
  };

  const updateIngredientLink = (idx, linkedRecipeId) => {
    if (!activeRecipe?.ingredients) return;
    const nextSku = linkedRecipeId || '';
    updateIngredientLocal(idx, { sku: nextSku });
  };

  const updateRecipeScalingTipsLocal = useCallback((updates) => {
    updateActiveRecipeLocal({
      scalingTips: {
        ...(activeRecipe?.scalingTips || {}),
        ...updates
      }
    });
  }, [activeRecipe?.scalingTips]);

  const updateRecipeMethodStep = useCallback((idx, value, bulk = false) => {
    const source = bulk ? (activeRecipe?.bulkMethod || []) : (activeRecipe?.method || []);
    const next = [...source];
    next[idx] = value;
    updateActiveRecipeLocal(bulk ? { bulkMethod: next } : { method: next });
  }, [activeRecipe?.bulkMethod, activeRecipe?.method]);

  const addRecipeMethodStep = useCallback((bulk = false) => {
    const source = bulk ? (activeRecipe?.bulkMethod || []) : (activeRecipe?.method || []);
    const next = [...source, ''];
    updateActiveRecipeLocal(bulk ? { bulkMethod: next } : { method: next });
  }, [activeRecipe?.bulkMethod, activeRecipe?.method]);

  const removeRecipeMethodStep = useCallback((idx, bulk = false) => {
    const source = bulk ? (activeRecipe?.bulkMethod || []) : (activeRecipe?.method || []);
    const next = source.filter((_, i) => i !== idx);
    updateActiveRecipeLocal(bulk ? { bulkMethod: next } : { method: next });
  }, [activeRecipe?.bulkMethod, activeRecipe?.method]);

  const recipeNotes = useMemo(() => {
    const notes = activeRecipe?.scalingTips?.notes;
    if (Array.isArray(notes)) return notes;
    if (activeRecipe?.note && activeRecipe.note !== 'No operational notes provided.') {
      return [{ title: 'Chef Note', body: activeRecipe.note }];
    }
    return [];
  }, [activeRecipe?.scalingTips?.notes, activeRecipe?.note]);

  const updateRecipeNotes = useCallback((notes) => {
    updateRecipeScalingTipsLocal({ notes: notes.slice(0, 3) });
  }, [updateRecipeScalingTipsLocal]);

  const handleDeleteRecipeNote = useCallback((noteIdx) => {
    const deleted = recipeNotes[noteIdx];
    if (!deleted) return;
    setLastDeletedNote({ note: deleted, index: noteIdx });
    updateRecipeNotes(recipeNotes.filter((_, i) => i !== noteIdx));
    if (expandedNoteIndex === noteIdx) {
      setExpandedNoteIndex(null);
    } else if (expandedNoteIndex > noteIdx) {
      setExpandedNoteIndex(expandedNoteIndex - 1);
    }
  }, [recipeNotes, updateRecipeNotes, expandedNoteIndex]);

  const handleRestoreRecipeNote = useCallback(() => {
    if (!lastDeletedNote) return;
    const next = [...recipeNotes];
    next.splice(Math.min(lastDeletedNote.index, next.length), 0, lastDeletedNote.note);
    updateRecipeNotes(next.slice(0, 3));
    setLastDeletedNote(null);
  }, [lastDeletedNote, recipeNotes, updateRecipeNotes]);

  const normalizeIngredientCategory = useCallback((category) => {
    const nextCategory = String(category || 'OTHER').trim().toUpperCase();
    if (nextCategory === 'WET' || nextCategory === 'LIQUID') return 'WET / LIQUID';
    return nextCategory;
  }, []);

  const persistIngredientCategory = useCallback((category) => {
    const normalized = normalizeIngredientCategory(category);
    if (normalized === 'WET / LIQUID') return 'wet';
    return String(category || 'other').trim() || 'other';
  }, [normalizeIngredientCategory]);

  const handleDeleteIngredient = (idx) => {
    if (!activeRecipe?.ingredients) return;
    const deletedIngredient = activeRecipe.ingredients[idx];
    const newIngredients = activeRecipe.ingredients.filter((_, ingredientIdx) => ingredientIdx !== idx);
    setLastDeletedIngredient(
      deletedIngredient
        ? {
            recipeId: activeRecipe.id,
            ingredient: deletedIngredient,
            index: idx
          }
        : null
    );
    updateActiveRecipeLocal({ ingredients: newIngredients });
    if (editingIngId === idx) {
      setEditingIngId(null);
    } else if (editingIngId > idx) {
      setEditingIngId(editingIngId - 1);
    }
  };

  const handleAddIngredient = (category) => {
    if (!activeRecipe?.ingredients) return;

    const normalizedCategory = normalizeIngredientCategory(category);
    const nextIngredient = {
      name: '',
      qty: 0,
      unit: LIQUID_LIKE_CATEGORIES.has(normalizedCategory) ? 'ml' : 'g',
      sku: '',
      category: persistIngredientCategory(normalizedCategory)
    };

    const currentIngredients = [...activeRecipe.ingredients];
    let insertAt = currentIngredients.length;

    for (let i = currentIngredients.length - 1; i >= 0; i -= 1) {
      if (normalizeIngredientCategory(currentIngredients[i]?.category || currentIngredients[i]?.cat || 'OTHER') === normalizedCategory) {
        insertAt = i + 1;
        break;
      }
    }

    currentIngredients.splice(insertAt, 0, nextIngredient);
    updateActiveRecipeLocal({ ingredients: currentIngredients });
    setEditingIngId(insertAt);
    setLastDeletedIngredient(null);
  };

  const handleRenameIngredientCategory = useCallback((currentCategory, nextCategory) => {
    if (!activeRecipe?.ingredients) return;
    const currentNormalized = normalizeIngredientCategory(currentCategory);
    const nextPersisted = persistIngredientCategory(nextCategory);
    const nextNormalized = normalizeIngredientCategory(nextCategory);
    if (!nextPersisted) return;

    const updatedIngredients = (activeRecipe.ingredients || []).map((ing) => {
      const ingCategory = normalizeIngredientCategory(ing?.category || ing?.cat || 'OTHER');
      if (ingCategory !== currentNormalized) return ing;
      return {
        ...ing,
        category: nextPersisted,
        cat: nextPersisted,
        unit: LIQUID_LIKE_CATEGORIES.has(nextNormalized)
          ? (/^(g|kg)$/i.test(String(ing?.unit || '')) ? 'ml' : (ing?.unit || 'ml'))
          : (String(ing?.unit || '').trim() || 'g')
      };
    });

    updateActiveRecipeLocal({ ingredients: updatedIngredients });
  }, [activeRecipe?.ingredients, normalizeIngredientCategory, persistIngredientCategory]);

  const handleUndoDeleteIngredient = () => {
    if (!lastDeletedIngredient || !activeRecipe || lastDeletedIngredient.recipeId !== activeRecipe.id) return;

    const restoredIngredients = [...(activeRecipe.ingredients || [])];
    const restoreIndex = Math.min(lastDeletedIngredient.index, restoredIngredients.length);
    restoredIngredients.splice(restoreIndex, 0, lastDeletedIngredient.ingredient);
    updateActiveRecipeLocal({ ingredients: restoredIngredients });
    setLastDeletedIngredient(null);
  };

  const getDefaultIntentForRecipe = useCallback((recipe) => {
    if (!recipe) return { val: 0, mode: portionMode ? 'portion' : 'batch' };

    if (portionMode) {
      const yieldUnit = String(recipe.yieldUnit || recipe.yield_unit || '').toLowerCase().trim();
      const savedBaseYield = Number(recipe.baseYield ?? recipe.base_yield ?? 0);
      if (savedBaseYield > 0 && /^portions?$/.test(yieldUnit)) {
        return {
          val: roundKitchenPortions(savedBaseYield),
          mode: 'portion',
          sourceDefault: true
        };
      }
      const baselineGrams = getRecipeBaselineGrams(recipe, false, coreSettings);
      const portionWeight = getRecipePortionWeight(recipe);
      if (!portionWeight) return { val: 0, mode: 'portion' };
      return {
        val: roundKitchenPortions(baselineGrams / portionWeight),
        mode: 'portion'
      };
    }

    return { val: 1, mode: 'batch' };
  }, [portionMode, coreSettings, recipes, getRecipePortionWeight]);

  const handleDefaultAll = useCallback(() => {
    if (portionMode) {
      const reset = {};
      recipes.forEach(r => {
        reset[r.id] = getDefaultIntentForRecipe(r);
      });
      setPlanIntent(reset);
      setMenuMix({});
      return;
    }

    setPlanIntent({});
    setMenuMix({});
  }, [portionMode, recipes, getDefaultIntentForRecipe, setPlanIntent, setMenuMix]);

  const handleDefaultSelected = useCallback(() => {
    if (!activeRecipe?.id) return;

    if (portionMode) {
      setPlanIntent(prev => ({
        ...prev,
        [activeRecipe.id]: getDefaultIntentForRecipe(activeRecipe)
      }));
      return;
    }

    setPlanIntent(prev => ({
      ...prev,
      [activeRecipe.id]: getDefaultIntentForRecipe(activeRecipe)
    }));
  }, [activeRecipe, portionMode, getDefaultIntentForRecipe]);

  const handleEnterEditMode = useCallback(() => {
    handleDefaultAll();
    setEditingIngId(null);
    setEditingCategoryHeader(null);
    setEditingCategoryValue('');
    setCheckedItems({});
    setLastDeletedIngredient(null);
    setShowDeleted(false);
    setIsScalerExportOpen(false);
    setIsEditMode(true);
  }, [handleDefaultAll]);

  const activeDefaultIntent = activeRecipe ? getDefaultIntentForRecipe(activeRecipe) : { val: 0, mode: portionMode ? 'portion' : 'batch' };

  const ingredientCategoryEntries = useMemo(() => {
    const grouped = (activeRecipe?.ingredients || []).reduce((acc, ing) => {
      const category = normalizeIngredientCategory(ing?.category || ing?.cat || 'OTHER');
      if (!acc[category]) acc[category] = [];
      acc[category].push(ing);
      return acc;
    }, {});

    const categories = Object.keys(grouped);

    return categories
      .filter((category) => grouped[category] && grouped[category].length > 0)
      .sort((a, b) => {
        if (a === 'WET / LIQUID') return -1;
        if (b === 'WET / LIQUID') return 1;

        const orderA = EDIT_CATEGORY_ORDER.indexOf(a);
        const orderB = EDIT_CATEGORY_ORDER.indexOf(b);
        const safeOrderA = orderA === -1 ? EDIT_CATEGORY_ORDER.length : orderA;
        const safeOrderB = orderB === -1 ? EDIT_CATEGORY_ORDER.length : orderB;

        if (safeOrderA !== safeOrderB) return safeOrderA - safeOrderB;
        return a.localeCompare(b);
      })
      .map((category) => [category, grouped[category] || []]);
  }, [activeRecipe?.ingredients, normalizeIngredientCategory]);

  useEffect(() => {
    if (!isEditMode) {
      setEditingCategoryHeader(null);
      setEditingCategoryValue('');
    }
  }, [isEditMode, activeRecipe?.id]);

  useEffect(() => {
    setExpandedNoteIndex(null);
    setLastDeletedNote(null);
  }, [activeRecipe?.id]);

  // AUTO-SAVE LOGIC: Syncs to Supabase when active recipe changes
  useEffect(() => {
    if (!activeRecipe || loading) return;

    const handler = setTimeout(async () => {
      // Small check to prevent infinite loops: check if local matches remote
      // But for speed, we just do a quiet upsert
      try {
        await supabase
          .from('sop_recipes')
          .update({
            ingredients: activeRecipe.ingredients,
            method: activeRecipe.method,
            bulk_method: activeRecipe.bulkMethod || activeRecipe.bulk_method,
            scaling_tips: activeRecipe.scalingTips || {},
            cuisine: activeRecipe.cuisine,
            occasion: activeRecipe.occasion,
            show_on_board: activeRecipe.show_on_board,
            is_deleted: activeRecipe.is_deleted
          })
          .eq('recipe_id', activeRecipe.id);
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(handler);
  }, [activeRecipe?.ingredients, activeRecipe?.method, activeRecipe?.bulkMethod, activeRecipe?.scalingTips, activeRecipe?.cuisine, activeRecipe?.occasion, activeRecipe?.show_on_board, activeRecipe?.is_deleted]);

  const applyMultiplier = (m) => {
    const activeSeedIds = Object.keys(planIntent);

    if (activeSeedIds.length === 0) {
      const targetId = selectedId;
      const r = recipes.find(rec => rec.id === targetId);
      if (!r) return;

      const baseVal = portionMode ? (parseFloat(r.portions_per_batch) || portionsPerBatch) : r.baseYield;
      const mode = portionMode ? 'portion' : 'weight';
      setPlanIntent({ [targetId]: { val: Number((baseVal * m).toFixed(2)), mode } });
      return;
    }

    const updated = { ...planIntent };
    activeSeedIds.forEach(id => {
      const intent = updated[id];
      if (intent) {
        updated[id] = { ...intent, val: Number((intent.val * m).toFixed(2)) };
      }
    });
    setPlanIntent(updated);
  };




  // [LOCKED] CORE MARKET AGGREGATION ENGINE - DO NOT MODIFY
  // Handles recursive sub-recipes and unit normalization
  const aggregatedOrder = useMemo(() => {
    const totals = {};

    // Use the demand calculated by BOMEngine as the source of truth
    Object.entries(activeDemand).forEach(([recipeId, totalYield]) => {
      if (totalYield <= 0) return;
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe || !recipe.ingredients) return;

      recipe.ingredients.forEach(ing => {
        const resolvedChildId = resolveRecipeId(ing, recipes);
        if (resolvedChildId) return; // Skip sub-recipes

        const baselineGrams = getRecipeBaselineGrams(recipe, false, coreSettings);
        const ingGrams = toGrams(ing.qty, ing.unit);
        const scaledQtyGrams = (ingGrams / Math.max(0.001, baselineGrams)) * totalYield;

        // Canonical SKU
        const sku = ing.sku || `${(ing.name || 'unknown').toLowerCase().trim().replace(/\s+/g, '-')}-g`;

        if (!totals[sku]) {
          totals[sku] = {
            name: ing.name,
            cat: ing.cat || ing.category || 'other',
            qty: 0,
            unit: 'g' // Aggregate in grams for accuracy, then formatDisplay will handle it
          };
        }
        totals[sku].qty += scaledQtyGrams;
      });
    });

    const grouped = {};
    Object.values(totals).forEach(item => {
      const cat = item.cat || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  }, [activeDemand, recipes]);


  // STEP 5: CROSS-VIEW CONSISTENCY VALIDATION
  useEffect(() => {
    if (!activeDemand || !aggregatedOrder || Object.keys(activeDemand).length === 0) return;

    // Flatten Market view for O(1) comparison
    const flattenedMarket = {};
    Object.values(aggregatedOrder).forEach(categoryItems => {
      categoryItems.forEach(it => {
        // Use normalized key matching aggregatedOrder logic
        const key = (it.name || 'unknown').toLowerCase().trim().replace(/\s+/g, '-');
        flattenedMarket[key] = (flattenedMarket[key] || 0) + it.qty;
      });
    });

    const expectedTotals = {};
    Object.entries(activeDemand).forEach(([recipeId, totalYield]) => {
      if (totalYield <= 0) return;
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe || !recipe.ingredients) return;

      recipe.ingredients.forEach(ing => {
        if (resolveRecipeId(ing, recipes)) return; // Skip sub-recipes

        let bQty = parseFloat(ing.qty) || 0;
        let bUnit = (ing.unit || 'units').toLowerCase();
        if (/^(kg)s?$/.test(bUnit)) { bQty *= 1000; }
        else if (/^(l|liter|litre)s?$/.test(bUnit)) { bQty *= 1000; }

        const recipeMassRaw = sumWeight(recipe);
        const scaled = (bQty / (recipeMassRaw || parseFloat(recipe.baseYield) || 1)) * totalYield;
        const key = (ing.name || 'unknown').toLowerCase().trim().replace(/\s+/g, '-');
        expectedTotals[key] = (expectedTotals[key] || 0) + scaled;
      });
    });

    // Compare and Log Discrepancies
    Object.keys(expectedTotals).forEach(key => {
      const expected = expectedTotals[key];
      const actual = flattenedMarket[key] || 0;
      const delta = Math.abs(expected - actual);

      // Allow 1% drift for floating point math
      if (delta > (expected * 0.01) + 0.01) {
        console.warn(`[VAL] Cross-view drift detected for "${key}": Scaler predicts ${expected.toFixed(2)}, but Market shows ${actual.toFixed(2)}`);
      }
    });
  }, [activeDemand, aggregatedOrder, recipes]);


  const handleCsvDownload = () => {
    if (!activeRecipe) return;
    const recipeMassRaw = sumWeight(activeRecipe);
    const factor = currentYieldValue / (recipeMassRaw || activeRecipe?.baseYield || 1);
    let csv = `RECIPE,${(activeRecipe?.name || 'UNKNOWN').toUpperCase()}\nTARGET YIELD,${currentYieldValue || 0},${activeRecipe?.unit || 'g'}\n\nCATEGORY,ITEM,SKU,SCALED_WEIGHT,UNIT\n`;
    (activeRecipe?.ingredients || []).forEach(ing => {
      const { val: v, unit: u } = formatQuantity((ing?.qty || 0) * factor, ing?.unit);
      csv += `${(ing?.category || 'OTHER').toUpperCase()},${translateIngredient(ing?.name)},${ing?.sku || ''},${v},${u}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeRecipe.id}_recipe.csv`; a.click();
  };

  const escapeCsv = useCallback((value) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }, []);

  const escapeHtml = useCallback((value) => (
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  ), []);

  const downloadFile = useCallback((filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const getRecipeExportSnapshot = useCallback((recipe) => {
    if (!recipe) return null;
    const hasRecipeIntent = !!planIntent[recipe.id];
    const nodeData = hasRecipeIntent ? activeNodes[recipe.id] : null;
    const baselineYield = getRecipeBaselineGrams(recipe, false, coreSettings);
    const baselineEdible = getRecipeBaselineGrams(recipe, true, coreSettings);
    const defaultBatchGrams = getBatchTargetGrams(recipe, 1);
    const defaultScale = !portionMode ? (defaultBatchGrams / Math.max(0.001, baselineYield || 1)) : 1;
    const intent = planIntent[recipe.id];

    let rootScale = 1;
    if (hasRecipeIntent && intent?.val) {
      if (intent.mode === 'batch') {
        rootScale = getBatchTargetGrams(recipe, intent.val) / Math.max(0.001, baselineYield || 1);
      } else if (intent.mode === 'portion') {
        const portionWeight = getRecipePortionWeight(recipe);
        const targetGrams = portionWeight ? intent.val * portionWeight : baselineYield;
        rootScale = targetGrams / Math.max(0.001, baselineYield || 1);
      } else {
        rootScale = intent.val / Math.max(0.001, baselineYield || 1);
      }
    }

    const displayScale = hasRecipeIntent ? rootScale : defaultScale;
    const currentYield = nodeData
      ? nodeData.weight
      : (portionMode ? baselineYield : baselineYield * displayScale);
    const currentEdible = nodeData
      ? (nodeData.edibleWeight || nodeData.weight)
      : (portionMode ? baselineEdible : baselineEdible * displayScale);
    const portionWeight = getRecipePortionWeight(recipe) || coreGetPortionWeight(recipe, coreSettings, recipes);
    const currentPortions = nodeData
      ? Number(nodeData.portions.toFixed(1))
      : Number((currentYield / Math.max(0.001, portionWeight || 1)).toFixed(1));
    const roundedPortions = roundKitchenPortions(currentPortions);
    const factor = portionMode ? (hasRecipeIntent ? rootScale : 1) : displayScale;
    const ingredients = (recipe.ingredients || []).map((ing) => {
      const qty = (Number(ing?.qty) || 0) * factor;
      const display = formatQuantity(qty, ing?.unit);
      return {
        category: (ing?.category || 'other').toUpperCase(),
        name: translateIngredient(ing?.name || ''),
        sku: ing?.sku || '',
        value: display.val,
        unit: display.unit
      };
    });
    const totalWeightDisplay = formatDisplay(currentEdible, 'g');
    const yieldLine = portionMode
      ? `${hasRecipeIntent ? 'Target' : 'Original'} Yield: ${roundedPortions} portions`
      : `${hasRecipeIntent ? 'Target' : 'Default'} Yield: ${Math.round(currentPortions)} portions`;

    return {
      id: recipe.id,
      name: translateIngredient(recipe.name).replace(/^\d+[\s.\-_]*/, ''),
      titleMeta: recipe.tier || '',
      cuisine: recipe.cuisine || '',
      classLabel: recipe.dishStyle || recipe.portion_class || '',
      targetLabel: portionMode ? 'Target Portions' : 'Target Batches',
      targetValue: hasRecipeIntent ? intent?.val ?? (portionMode ? roundedPortions : 1) : (portionMode ? roundedPortions : 1),
      targetUnit: portionMode ? 'Portions' : 'Batches',
      totalWeightValue: `${totalWeightDisplay.v} ${totalWeightDisplay.u}`,
      yieldLine,
      ingredients
    };
  }, [planIntent, activeNodes, coreSettings, portionMode, recipes, getBatchTargetGrams, getRecipePortionWeight, formatQuantity, formatDisplay, translateIngredient]);

  const toggleScalerExportRecipe = useCallback((recipeId) => {
    setScalerExportRecipeIds((prev) => (
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    ));
  }, []);

  const openScalerPrintView = useCallback((recipesToPrint, layout = 'horizontal') => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;
    const gridClass = layout === 'vertical' ? 'sheet-grid-vertical' : 'sheet-grid-horizontal';
    const cardsHtml = recipesToPrint.map((recipe) => {
      const ingredientsByCategory = recipe.ingredients.reduce((acc, ing) => {
        if (!acc[ing.category]) acc[ing.category] = [];
        acc[ing.category].push(ing);
        return acc;
      }, {});
      const sections = Object.entries(ingredientsByCategory).map(([category, items]) => `
        <div class="section">
          <div class="section-title">${escapeHtml(category)}</div>
          <div class="rows">
            ${items.map((ing) => `
              <div class="row">
                <span class="name">${escapeHtml(ing.name)}</span>
                <span class="qty">${escapeHtml(ing.value)} ${escapeHtml(ing.unit)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
      return `
        <article class="recipe-card">
          <div class="recipe-head">
            <div class="title-wrap">
              <h2>${escapeHtml(recipe.name)}</h2>
              <div class="meta-line">${escapeHtml(recipe.classLabel)}${recipe.titleMeta ? ` | ${escapeHtml(recipe.titleMeta)}` : ''}${recipe.cuisine ? ` | ${escapeHtml(recipe.cuisine)}` : ''}</div>
            </div>
            <div class="target-box">
              <div class="target-label">${escapeHtml(recipe.targetLabel)}</div>
              <div class="target-value">${escapeHtml(recipe.targetValue)} ${escapeHtml(recipe.targetUnit)}</div>
            </div>
          </div>
          <div class="weight-line">Total Weight: ${escapeHtml(recipe.totalWeightValue)}</div>
          <div class="yield-line">${escapeHtml(recipe.yieldLine)}</div>
          ${sections}
        </article>
      `;
    }).join('');

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>Scaler Recipe Export</title>
          <style>
            @page { size: A4 ${layout === 'horizontal' ? 'landscape' : 'portrait'}; margin: 8mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #111827; background: #fff; }
            .page { width: 100%; }
            .page-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; }
            .page-header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.08em; }
            .subtitle { font-size: 11px; color: #4b5563; text-transform: uppercase; }
            .${gridClass} { display: grid; grid-template-columns: repeat(${layout === 'vertical' ? 2 : 3}, minmax(0, 1fr)); gap: 10px; align-items: start; }
            .recipe-card { border: 1px solid #d1d5db; padding: 10px; break-inside: avoid; page-break-inside: avoid; }
            .recipe-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
            .title-wrap h2 { margin: 0; font-size: 15px; line-height: 1.15; text-transform: uppercase; }
            .meta-line { margin-top: 4px; font-size: 10px; color: #6b7280; text-transform: uppercase; }
            .target-box { border: 1px solid #d1d5db; padding: 6px 8px; min-width: 120px; text-align: right; }
            .target-label { font-size: 9px; text-transform: uppercase; color: #6b7280; }
            .target-value { font-size: 16px; font-weight: 700; }
            .weight-line { font-size: 12px; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; }
            .yield-line { font-size: 10px; color: #4b5563; margin-bottom: 8px; }
            .section { margin-top: 8px; }
            .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; color: #6b7280; }
            .row { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid #e5e7eb; padding: 4px 0; font-size: 10px; }
            .name { font-weight: 600; }
            .qty { white-space: nowrap; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="page-header">
              <div>
                <h1>Scaler Recipe Export</h1>
                <div class="subtitle">Kitchen recipe print | save as PDF</div>
              </div>
              <div class="subtitle">${escapeHtml(new Date().toLocaleDateString())}</div>
            </div>
            <div class="${gridClass}">
              ${cardsHtml}
            </div>
          </div>
          <script>
            window.addEventListener('load', function () {
              const triggerPrint = function () {
                requestAnimationFrame(function () {
                  requestAnimationFrame(function () {
                    setTimeout(function () {
                      window.focus();
                      window.print();
                    }, 800);
                  });
                });
              };
              if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(triggerPrint).catch(triggerPrint);
              } else {
                triggerPrint();
              }
            });
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  }, [escapeHtml]);

  const handleScalerExport = useCallback(() => {
    const selectedRecipes = filteredRecipesList
      .filter((recipe) => scalerExportRecipeIds.includes(recipe.id))
      .map((recipe) => getRecipeExportSnapshot(recipe))
      .filter(Boolean);
    if (selectedRecipes.length === 0) return;

    if (scalerExportFormat === 'csv') {
      let csv = 'RECIPE,CLASS,CATEGORY,ITEM,SKU,QTY,UNIT,TARGET,TOTAL_WEIGHT\n';
      selectedRecipes.forEach((recipe) => {
        recipe.ingredients.forEach((ing) => {
          csv += [
            escapeCsv(recipe.name),
            escapeCsv(recipe.classLabel),
            escapeCsv(ing.category),
            escapeCsv(ing.name),
            escapeCsv(ing.sku),
            escapeCsv(ing.value),
            escapeCsv(ing.unit),
            escapeCsv(`${recipe.targetValue} ${recipe.targetUnit}`),
            escapeCsv(recipe.totalWeightValue)
          ].join(',') + '\n';
        });
      });
      downloadFile('scaler-recipes.csv', csv, 'text/csv;charset=utf-8');
    } else {
      openScalerPrintView(selectedRecipes, scalerExportLayout);
    }
    setIsScalerExportOpen(false);
  }, [filteredRecipesList, scalerExportRecipeIds, getRecipeExportSnapshot, scalerExportFormat, scalerExportLayout, escapeCsv, downloadFile, openScalerPrintView]);

  if (loading) return (
    <div className="min-h-screen bg-app-bg text-app-accent flex flex-col items-center justify-center font-black uppercase tracking-widest gap-4">
      <Zap className="animate-bounce" size={48} />
      <span>Syncing Operations...</span>
    </div>
  );

  if (recipes.length === 0) return (
    <div className="min-h-screen bg-app-bg text-app-muted flex flex-col items-center justify-center font-black uppercase tracking-widest gap-4">
      <ChefHat size={48} className="opacity-20" />
      <span>No Recipes Found for {clientSlug || 'kabile'}</span>
      <p className="text-[10px] font-bold normal-case opacity-40">Verify client_id in consulting_sops table</p>
    </div>
  );

  return (
    <div className="box-border min-h-screen w-full overflow-x-hidden bg-app-bg text-app-text font-sans p-2 md:p-4 selection:bg-app-accent selection:text-app-bg">

      {/* PROFESSIONAL NAV */}
      <nav
        className="box-border w-full min-w-0 mx-auto mb-5 print:hidden"
        style={{ width: '100%', maxWidth: '1000px' }}
      >
        <div className="grid min-w-0 gap-2 xl:grid-cols-[240px_minmax(0,1fr)_168px] xl:items-center">
        <div className="flex min-w-0 items-center gap-2 xl:w-[240px] xl:justify-self-start">
          {config.logo ? <img src={config.logo} alt={config.name} className="h-8" /> : <ChefHat className="text-app-accent" size={24} />}
          <h1 className="min-w-0 truncate whitespace-nowrap font-black text-[13px] 2xl:text-sm uppercase tracking-tight text-app-text">
            {config.name} <span className="text-app-muted font-light">{config.subTitle}</span>
          </h1>
        </div>

        <div className="flex min-w-0 flex-nowrap items-center justify-center overflow-hidden bg-app-surface border border-app-border rounded-lg p-1 gap-1 xl:justify-self-center">
          <button data-testid="nav-scaler" onClick={() => setView('scaler')} className={`flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 font-bold uppercase text-[8px] 2xl:text-[9px] rounded transition-colors whitespace-nowrap ${view === 'scaler' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <Scale size={12} /> Scaler
          </button>
          <button data-testid="nav-market" onClick={() => setView('ordering')} className={`flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 font-bold uppercase text-[8px] 2xl:text-[9px] rounded transition-colors whitespace-nowrap ${view === 'ordering' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <ShoppingCart size={12} /> Market
          </button>
          <button data-testid="nav-board" onClick={() => setView('board')} className={`flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 font-bold uppercase text-[8px] 2xl:text-[9px] rounded transition-colors whitespace-nowrap ${view === 'board' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <ClipboardCheck size={12} /> Board
          </button>
          <button onClick={() => setView('presentation')} className={`flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 font-bold uppercase text-[8px] 2xl:text-[9px] rounded transition-colors whitespace-nowrap ${view === 'presentation' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <LayoutDashboard size={12} /> Presentation
          </button>
          <button data-testid="nav-settings" onClick={() => setView('settings')} className={`flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 font-bold uppercase text-[8px] 2xl:text-[9px] rounded transition-colors whitespace-nowrap ${view === 'settings' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <SettingsIcon size={12} /> Master Rules
          </button>
        </div>

        <div className="flex w-full min-w-0 xl:w-full xl:justify-self-end xl:justify-end">
          {view === 'scaler' ? (
            <div className="flex w-full flex-nowrap items-center bg-app-surface border border-app-border rounded-lg p-1 gap-1 xl:w-auto">
              <button
                data-testid="mode-batch"
                onClick={() => setPortionMode(false)}
                className={`flex flex-1 items-center gap-1 px-2 py-1.5 min-w-[78px] justify-center text-[8px] font-black uppercase rounded transition-all border xl:flex-none ${!portionMode ? 'bg-app-accent text-app-bg border-app-accent shadow-lg shadow-app-accent/20' : 'bg-app-surface text-app-muted border-app-border hover:text-app-text'}`}
              >
                <Beef size={11} />
                Batch
              </button>
              <button
                data-testid="mode-portion"
                onClick={() => setPortionMode(true)}
                className={`flex flex-1 items-center gap-1 px-2 py-1.5 min-w-[78px] justify-center text-[8px] font-black uppercase rounded transition-all border xl:flex-none ${portionMode ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20' : 'bg-app-surface text-app-muted border-app-border hover:text-app-text'}`}
              >
                <Utensils size={11} />
                Portion
              </button>
            </div>
          ) : (
            <div className="invisible h-[36px] w-full xl:w-[168px]" aria-hidden="true" />
          )}
        </div>
        </div>
      </nav>

      {view === 'board' ? (
        <div
          className="box-border w-full min-w-0 mx-auto overflow-x-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ width: '100%', maxWidth: '1000px' }}
        >
          <Suspense fallback={<div className="h-[600px] flex items-center justify-center bg-app-surface border border-app-border rounded-xl">Loading Command Board...</div>}>
            <CommandBoard
              clientId={clientSlug || 'kabile'}
              onExit={() => setView('scaler')}
              productionTargets={activeDemand}
              portionTargets={boardPortionTargets}
              recipes={recipes.filter(r => !r.is_deleted)}
            />
          </Suspense>
        </div>
      ) : (
      <div
        className={`box-border w-full min-w-0 mx-auto ${view === 'presentation' ? 'overflow-x-auto' : 'overflow-x-hidden'}`}
        style={{ width: '100%', maxWidth: view === 'presentation' ? '1320px' : '1000px' }}
      >
        {view === 'presentation' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 w-full min-w-[1120px] max-w-none mx-auto">
            <Suspense fallback={<div className="h-[600px] flex items-center justify-center bg-app-surface border border-app-border rounded-xl">Loading Presentation Core...</div>}>
              {activeRecipe ? (
                <CinematicSOP
                  clientId={clientSlug || 'kabile'}
                  initialDishName={activeRecipe.name}
                  portionTargets={boardPortionTargets}
                  recipeIdByName={recipeIdByName}
                  onExit={() => setView('scaler')}
                />
              ) : (
                <div className="h-[600px] flex flex-col items-center justify-center bg-app-surface border border-app-border rounded-xl text-app-muted">
                  <ChefHat className="mb-4 opacity-50" size={32} />
                  <p className="font-bold uppercase tracking-widest text-xs">A recipe must be selected in Scaler view first</p>
                </div>
              )}
            </Suspense>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-app-surface border border-app-border rounded-xl shadow-2xl overflow-hidden">
              <div className="bg-app-accent/5 p-8 border-b border-app-border">
                <div className="flex items-center gap-4">
                  <div className="bg-app-accent p-3 rounded-xl text-app-bg shadow-lg shadow-app-accent/20">
                    <SettingsIcon size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-app-text">Master Rules Configuration</h2>
                    <p className="text-xs font-bold text-app-muted uppercase tracking-[0.2em]">Global Operational Standards</p>
                  </div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Visuals & Localization */}
                <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-app-accent flex items-center gap-2">
                      <Sun size={14} /> Appearance & Language
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex flex-col items-center justify-center p-6 bg-app-bg border border-app-border rounded-xl hover:border-app-accent transition-all group">
                        {theme === 'dark' ? <Moon className="text-app-accent mb-2" /> : <Sun className="text-app-accent mb-2" />}
                        <span className="text-[10px] font-black uppercase text-app-text">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                      </button>
                      <button onClick={() => setLanguage(language === 'EN' ? 'TR' : 'EN')} className="flex flex-col items-center justify-center p-6 bg-app-bg border border-app-border rounded-xl hover:border-app-accent transition-all group">
                        <Languages className="text-app-accent mb-2" />
                        <span className="text-[10px] font-black uppercase text-app-text">{language === 'EN' ? 'English (SOP)' : 'Türkçe (SOP)'}</span>
                      </button>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-app-accent flex items-center gap-2">
                      <Gauge size={14} /> Operational Scale
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-app-bg p-4 rounded-xl border border-app-border">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black uppercase text-app-text">Daily Volume Focus</span>
                          <span className="text-app-accent font-black text-xl">{volumeFocus} ppl</span>
                        </div>
                        <input
                          type="range" min="10" max="1000" step="10"
                          value={volumeFocus}
                          onChange={(e) => setVolumeFocus(parseInt(e.target.value))}
                          className="w-full accent-app-accent bg-app-surface h-1.5 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-2 text-[8px] font-black text-app-muted uppercase">
                          <span>Small Batch</span>
                          <span>Industrial Scale</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Master Rules (Portion Weights) */}
                <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-app-accent flex items-center gap-2">
                      <Scale size={14} /> Portion Class Standards
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-app-bg p-6 border border-app-border rounded-xl">
                        <div className="mb-4">
                          <p className="text-xs font-black text-app-text uppercase">Portion Class Standards</p>
                          <p className="text-[8px] text-app-muted uppercase font-bold">Used when a recipe has no recorded serving weight</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            ['Stew', portionWeightStew, setPortionWeightStew],
                            ['Meat Stir Fry', portionWeightMeatStirFry, setPortionWeightMeatStirFry],
                            ['Veg Stir Fry', portionWeightVegStirFry, setPortionWeightVegStirFry],
                            ['Curry', portionWeightCurry, setPortionWeightCurry],
                            ['Carb', portionWeightCarb, setPortionWeightCarb],
                            ['Main + Carb', portionWeightMainCarb, setPortionWeightMainCarb],
                            ['Side', portionWeightSide, setPortionWeightSide],
                            ['Salad', portionWeightSalad, setPortionWeightSalad],
                            ['Marinade', portionWeightMarinade, setPortionWeightMarinade],
                            ['Component', portionWeightComponent, setPortionWeightComponent]
                          ].map(([label, value, setter]) => (
                            <label key={label} className="flex items-center justify-between gap-3 bg-app-surface border border-app-border rounded-lg px-3 py-2">
                              <span className="text-[10px] font-black uppercase text-app-text">{label}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  data-testid={`setting-portion-class-${toTestId(label)}`}
                                  value={value}
                                  onChange={(e) => setter(parseInt(e.target.value) || 0)}
                                  className="bg-app-bg border border-app-border rounded px-2 py-1 w-20 text-right font-black text-lg text-app-accent outline-none focus:border-app-accent"
                                />
                                <span className="text-[9px] font-black text-app-muted">G</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-app-muted uppercase italic bg-app-accent/5 p-3 rounded-lg border border-app-accent/10">
                      Note: Recorded recipe serving weight wins first. If missing, the selected portion class weight is used. Legacy defaults only apply as last fallback.
                    </p>
                  </section>
                </div>
              </div>

              <div className="bg-app-bg/50 p-6 border-t border-app-border flex justify-end">
                <button
                  onClick={() => setView('scaler')}
                  className="px-10 py-4 bg-app-accent text-app-bg font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-app-accent/20 hover:scale-[1.02] transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'scaler' && (
          <div className="w-full min-w-0 space-y-3 animate-in fade-in duration-500">

            {/* NEW TOP TOOLBAR: Search & Global Utility */}
            <div className="flex min-w-0 flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between bg-app-surface border border-app-border p-2.5 rounded-lg shadow-sm">
              <div className="relative min-w-0 flex-1 max-w-full xl:max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                <input
                  type="text"
                  placeholder="Professional Search (Name, Cuisine, Occasion...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-lg pl-10 pr-4 py-2 text-sm font-medium outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 transition-all"
                />
	              </div>
	              <div className="flex min-w-0 flex-wrap items-center gap-1.5 xl:shrink-0">
	                {!showDeleted && filteredRecipesList.length > 0 && activeRecipe && !isEditMode && (
	                  <button
	                    onClick={handleEnterEditMode}
	                    className="flex items-center gap-1 px-2 py-1.5 bg-app-accent text-app-bg hover:scale-105 active:scale-95 rounded-lg text-[9px] font-black uppercase transition-all shadow-lg shadow-app-accent/20"
	                  >
	                    <Pencil size={11} /> Edit Recipe
	                  </button>
	                )}
	                {isEditMode && (
                    <>
	                    <button
	                      type="button"
	                      onClick={handleUndoDeleteIngredient}
	                      disabled={!lastDeletedIngredient || lastDeletedIngredient.recipeId !== activeRecipe.id}
	                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${lastDeletedIngredient && lastDeletedIngredient.recipeId === activeRecipe.id ? 'bg-app-bg text-app-accent border-app-accent/30 hover:border-app-accent' : 'bg-app-bg/60 text-app-muted border-app-border opacity-50 cursor-not-allowed'}`}
	                    >
	                      <Undo2 size={11} /> Undo
	                    </button>
	                    <button
	                      type="button"
	                      onClick={() => {
                          setEditingIngId(null);
                          setLastDeletedIngredient(null);
                          setShowDeleted(false);
                          setIsEditMode(false);
                        }}
	                      className="flex items-center gap-1 px-2 py-1.5 bg-app-bg text-app-muted hover:text-app-text border border-app-border rounded-lg text-[9px] font-black uppercase transition-all"
	                    >
	                      <Undo2 size={11} /> Exit
	                    </button>
	                    <button
                        type="button"
	                      onClick={async () => {
	                        await handleUpdateRecipe();
                          setLastDeletedIngredient(null);
                          setShowDeleted(false);
                          setIsEditMode(false);
                        }}
	                      className="flex items-center gap-1 px-2 py-1.5 bg-app-accent text-app-bg hover:brightness-110 rounded-lg text-[9px] font-black uppercase transition-all shadow-lg shadow-app-accent/20 border border-app-accent"
	                    >
	                      <Save size={11} /> SAVE TEMPLATE
	                    </button>
                      <button
                        onClick={() => setShowDeleted(!showDeleted)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${showDeleted ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20' : 'bg-app-bg text-app-muted border-app-border hover:border-app-muted'}`}
                      >
                        {showDeleted ? <Undo2 size={11} /> : <Trash2 size={11} />}
                        {showDeleted ? "Back to Library" : "Restore Bin"}
                      </button>
                    </>
	                )}
                  {!isEditMode && !showDeleted && filteredRecipesList.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setIsScalerExportOpen((prev) => !prev)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-app-bg text-app-muted hover:border-app-accent hover:text-app-accent border border-app-border rounded-lg text-[9px] font-black uppercase transition-all"
                      >
                        <FileText size={11} /> Export
                      </button>
                      {isScalerExportOpen && (
                        <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-app-border bg-app-surface p-2 shadow-2xl">
                          <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-app-muted">Format</div>
                          <div className="grid grid-cols-2 gap-1 mb-2">
                            {['pdf', 'csv'].map((format) => (
                              <button
                                key={format}
                                onClick={() => setScalerExportFormat(format)}
                                className={`rounded-xl border px-2 py-2 text-[9px] font-black uppercase transition-all ${scalerExportFormat === format ? 'border-app-accent bg-app-accent text-app-bg' : 'border-app-border bg-app-bg text-app-text hover:border-app-accent'}`}
                              >
                                {format === 'pdf' ? 'PDF File' : 'CSV File'}
                              </button>
                            ))}
                          </div>
                          {scalerExportFormat === 'pdf' && (
                            <>
                              <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-app-muted">Layout</div>
                              <div className="grid grid-cols-2 gap-1 mb-2">
                                {['horizontal', 'vertical'].map((layout) => (
                                  <button
                                    key={layout}
                                    onClick={() => setScalerExportLayout(layout)}
                                    className={`rounded-xl border px-2 py-2 text-[9px] font-black uppercase transition-all ${scalerExportLayout === layout ? 'border-app-accent bg-app-accent text-app-bg' : 'border-app-border bg-app-bg text-app-text hover:border-app-accent'}`}
                                  >
                                    {layout}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-[9px] font-black uppercase tracking-widest text-app-muted">Recipes</div>
                            <button
                              onClick={() => setScalerExportRecipeIds(
                                scalerExportRecipeIds.length === filteredRecipesList.length
                                  ? []
                                  : filteredRecipesList.map((recipe) => recipe.id)
                              )}
                              className="text-[9px] font-black uppercase text-app-accent"
                            >
                              {scalerExportRecipeIds.length === filteredRecipesList.length ? 'Clear All' : 'Select All'}
                            </button>
                          </div>
                          <div className="max-h-56 overflow-auto space-y-1 pr-1">
                            {filteredRecipesList.map((recipe) => (
                              <label key={recipe.id} className="flex items-center gap-2 rounded-xl border border-app-border bg-app-bg px-2 py-2 text-[9px] font-black uppercase text-app-text">
                                <input
                                  type="checkbox"
                                  checked={scalerExportRecipeIds.includes(recipe.id)}
                                  onChange={() => toggleScalerExportRecipe(recipe.id)}
                                  className="accent-app-accent"
                                />
                                <span className="truncate">{translateIngredient(recipe.name).replace(/^\d+[\s.\-_]*/, '')}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={handleScalerExport}
                            disabled={scalerExportRecipeIds.length === 0}
                            className="mt-2 w-full rounded-xl bg-app-accent px-3 py-2 text-[9px] font-black uppercase text-app-bg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Export
                          </button>
                        </div>
                      )}
                    </div>
                  )}
	              </div>
            </div>

            {/* HIGH-DENSITY HEADER: Inline Title & Scale */}
            {filteredRecipesList.length > 0 && activeRecipe ? (
              <div className="w-full min-w-0 space-y-3">
		                <div className="w-full min-w-0 bg-app-surface border border-app-border rounded-lg overflow-visible grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] divide-x divide-app-border relative shadow-sm z-20">


                  {/* SELECTOR & STRATEGY MINI */}
		                  <div className="p-2.5 flex items-start gap-2 min-w-0">
		                    <div className="bg-app-accent/10 p-1.5 rounded-xl text-app-accent shrink-0 border border-app-accent/20">
		                      <ChefHat size={18} />
		                    </div>
			                    <div className="relative flex-1 min-w-0 z-30">
		                      <div className="flex items-start justify-between gap-3 mb-1">
			                        <div className="relative flex-1">
		                          {isEditMode ? (
		                            <input
	                              className="w-full bg-app-bg border border-app-accent/20 font-black text-lg text-app-text outline-none px-2 py-1 rounded-lg focus:border-app-accent"
	                              value={activeRecipe.name}
                              onChange={(e) => updateActiveRecipeLocal({ name: e.target.value })}
		                              placeholder="Recipe Name"
		                            />
		                          ) : (
			                            <div className="relative z-40">
			                              <button
                                    data-testid="recipe-title-button"
			                                onClick={() => setIsRecipeMenuOpen(prev => !prev)}
			                                className="w-full text-left flex items-center gap-2 hover:text-app-accent transition-colors pr-6 min-w-0"
			                              >
			                                <span className="font-black text-[18px] md:text-[20px] text-app-text leading-tight truncate whitespace-nowrap min-w-0">
			                                  {translateIngredient(activeRecipe.name).replace(/^\d+[\s.\-_]*/, '')}
			                                </span>
			                                <ChevronDown className={`shrink-0 opacity-50 transition-transform ${isRecipeMenuOpen ? 'rotate-180' : ''}`} size={16} />
			                              </button>
		                              {isRecipeMenuOpen && (
			                                <div
			                                  className="absolute left-0 top-full mt-2 w-full max-h-72 overflow-auto overscroll-contain no-scrollbar bg-app-surface border border-app-border rounded-xl shadow-2xl z-[100] p-2"
			                                  onWheel={(e) => e.stopPropagation()}
			                                  onTouchMove={(e) => e.stopPropagation()}
			                                >
		                                  {groupedRecipes.map(([groupLabel, items]) => (
		                                    <div key={groupLabel} className="mb-2 last:mb-0">
		                                      <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-app-muted">
		                                        {groupLabel}
		                                      </div>
		                                      <div className="space-y-1">
		                                        {items.map(r => {
		                                          const cleanName = translateIngredient(r.name).replace(/^\d+[\s.\-_]*/, '');
		                                          return (
		                                            <button
                                                data-testid={`recipe-option-${toTestId(r.id)}`}
		                                              key={r.id}
		                                              onClick={() => {
		                                                setSelectedId(r.id);
		                                                setCheckedItems({});
		                                                setIsRecipeMenuOpen(false);
		                                              }}
		                                              className={`w-full text-left px-2 py-2 rounded-lg text-sm font-bold transition-colors ${r.id === selectedId ? 'bg-app-accent text-app-bg' : 'text-app-text hover:bg-app-bg'}`}
		                                            >
		                                              {cleanName}
		                                            </button>
		                                          );
		                                        })}
		                                      </div>
		                                    </div>
		                                  ))}
		                                </div>
		                              )}
		                            </div>
		                          )}
		                        </div>

	                        {/* ACTIONS MOVED HERE */}
		                        <div className="flex items-center gap-1 shrink-0">
		                          {showDeleted ? (
		                            <button
		                              onClick={() => handleRestore(activeRecipe.id)}
		                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 text-white hover:brightness-110 rounded-lg text-[8px] font-black uppercase transition-all shadow-lg shadow-green-500/20"
		                            >
		                              <Undo2 size={11} /> Restore Recipe
		                            </button>
		                          ) : (
		                            <button
		                              onClick={() => handleSoftDelete(activeRecipe.id)}
		                              className="flex items-center gap-1 px-1.5 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-[8px] font-black uppercase transition-all"
		                            >
		                              <Trash2 size={11} />
		                            </button>
		                          )}
		                        </div>
	                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="flex items-center gap-1 bg-app-bg px-1.5 py-0.5 rounded border border-app-border">
                          <input
                            type="checkbox"
                            id="show-on-board-top"
                            checked={activeRecipe.show_on_board}
                            onChange={(e) => updateActiveRecipeLocal({ show_on_board: e.target.checked })}
                            className="accent-app-accent"
                          />
                          <label htmlFor="show-on-board-top" className="text-[8px] font-black uppercase text-app-muted cursor-pointer">Live on Board</label>
                        </div>
                        <span className="text-[8px] font-black text-app-muted uppercase tracking-widest bg-app-bg/50 px-1.5 py-0.5 rounded">{activeRecipe.tier}</span>
                        {isEditMode ? (
                          <select
                            className="text-[10px] font-black text-app-accent uppercase tracking-widest bg-app-bg border border-app-border rounded px-2 py-0.5 outline-none"
                            value={activeRecipe.portion_class || DISH_STYLE_TO_PORTION_CLASS[activeRecipe.dishStyle] || 'component'}
                            onChange={(e) => {
                              const nextPortionClass = e.target.value;
                              const syncedDishStyle = PORTION_CLASS_TO_DISH_STYLE[nextPortionClass];
                              updateActiveRecipeLocal({
                                portion_class: nextPortionClass,
                                ...(syncedDishStyle ? { dishStyle: syncedDishStyle } : {})
                              });
                            }}
                          >
                            {PORTION_CLASS_OPTIONS.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[9px] font-black text-app-accent uppercase tracking-widest">{PORTION_CLASS_LABELS[activeRecipe.portion_class || DISH_STYLE_TO_PORTION_CLASS[activeRecipe.dishStyle] || 'component'] || 'Component'}</span>
                        )}
                        
                        {/* YIELD CONTRACT METADATA HIDDEN (V3.1) */}


                        <div className="flex items-center gap-1 bg-app-bg px-1.5 py-0.5 rounded border border-app-border min-w-0">
                          <Globe size={10} className="text-blue-400" />
                          {isEditMode ? (
                            <input
                              className="bg-transparent border-none outline-none text-[10px] font-black text-blue-400 uppercase tracking-widest w-24 sm:w-28 focus:ring-0 min-w-0"
                              value={activeRecipe.cuisine || ''}
                              onChange={(e) => updateActiveRecipeLocal({ cuisine: e.target.value })}
                              placeholder="ADD CUISINE"
                            />
                          ) : (
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                              {activeRecipe.cuisine || 'No Cuisine'}
                            </span>
                          )}
                        </div>

                        {isEditMode && (
                          <div className="flex items-center gap-1.5 bg-app-bg px-2 py-0.5 rounded border border-amber-400/30 min-w-0">
                            <Tag size={10} className="text-amber-400" />
                            <input
                              className="bg-transparent border-none outline-none text-[10px] font-black text-amber-400 uppercase tracking-widest w-28 sm:w-32 focus:ring-0 min-w-0"
                              value={activeRecipe.occasion || ''}
                              onChange={(e) => updateActiveRecipeLocal({ occasion: e.target.value })}
                              placeholder="ADD OCCASION"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS REMOVED FROM SIDE BAR */}

                  {/* COMPACT SCALING BOX */}
	                  <div className="w-full min-w-0 grid grid-cols-1 xl:grid-cols-[120px_188px_186px] 2xl:grid-cols-[124px_194px_192px] items-center gap-2 px-2 py-1.5 bg-app-surface/50 print:hidden">
	                    <div className="text-center min-w-0 shrink-0 bg-app-bg/55 border border-app-border rounded-xl px-2 py-1 flex min-h-[72px] h-full flex-col justify-start self-center">
	                      <label className="block text-[8px] font-black uppercase text-app-muted mb-1 tracking-tight leading-none">
	                        {portionMode ? "Target Portions" : "Target Batches"}
	                      </label>
	                      <div className="flex items-center justify-center gap-1.5 min-h-[30px]">
                        <input
                          data-testid="scaler-target-input"
                          type="number"
                          step={portionMode ? "1" : "0.5"}
                          min="0"
                          value={
                            planIntent[selectedId]?.mode === (portionMode ? 'portion' : 'batch')
                              ? planIntent[selectedId].val
                              : (portionMode
                                ? displayCurrentPortionCount
                                : 1.0)
                          }
	                          onChange={(e) => {
	                            const val = parseFloat(e.target.value) || 0;
	                            if (portionMode) {
	                              handleUpdateTarget(selectedId, val, 'portion');
                            } else {
                              // Batch targeting stores directly as batch mode
	                              handleUpdateTarget(selectedId, val, 'batch');
	                            }
	                          }}
	                          onBlur={() => handleCommitTarget(selectedId, portionMode ? 'portion' : 'batch')}
	                          className={`w-14 bg-app-bg border border-app-border rounded px-2 py-0.5 font-black text-base text-center tabular-nums outline-none focus:ring-1 ${portionMode ? 'text-amber-500 focus:ring-amber-500' : 'text-app-accent focus:ring-app-accent'}`}
	                        />
                        <div className="w-[52px] text-left">
                          <span className="block font-bold text-[8px] text-app-muted uppercase leading-none">
                            {portionMode ? "PORTIONS" : "BATCHES"}
                          </span>
                          <span className="block min-h-[10px] text-[8px] font-black text-app-accent leading-none">
                            {portionMode ? '\u00A0' : '\u00A0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Kitchen Intelligence Display (Simplified V3.1) */}
	                    <div className="flex min-w-0 flex-col justify-start border border-app-border rounded-xl bg-app-bg/35 px-2.5 py-1 min-h-[72px] h-full self-center">
	                      <div className="flex items-start gap-2">
	                        <Scale size={12} className="text-app-accent opacity-50" />
	                        <div className="min-w-0 flex-1">
                          <div className="min-h-[8px]">
                          {isScaled ? (
                            <div className="flex items-baseline gap-1 opacity-40 leading-none">
                              <span className="text-[8px] text-app-muted font-bold line-through">
                                {formatDisplay(getRecipeBaselineGrams(activeRecipe, false, coreSettings), 'g').v}g
                              </span>
                              <span className="text-[7px] text-app-muted font-black">BASE</span>
                            </div>
                          ) : (
                            <div className="invisible flex items-baseline gap-1 leading-none">
                              <span className="text-[9px] font-bold">0g</span>
                              <span className="text-[7px] font-black">BASE</span>
                            </div>
                          )}
                          </div>
                          <div data-testid="scaler-total-weight" className="flex items-baseline gap-1 text-[11px] font-black uppercase text-app-text min-h-[12px] whitespace-nowrap leading-none">
                            <span className="shrink-0">TOTAL WEIGHT:</span>
                            <span className="tabular-nums">{totalEdibleWeightFormatted.v}</span>
                            <span className="text-app-accent">{totalEdibleWeightFormatted.u}</span>
                          </div>
	                          <span className="block text-[8px] text-app-accent mt-0.5 min-h-[10px] leading-none">
	                            {isComponentRecipe
	                              ? `${hasIntent ? 'Target' : 'Original'} Yield: ${totalEdibleWeightFormatted.v}${totalEdibleWeightFormatted.u}`
	                              : (portionMode
	                                ? `${hasIntent ? 'Target' : 'Original'} Yield: ${hasIntent ? displayTargetPortions : displayCurrentPortionCount} portions`
	                                : `${hasIntent ? 'Target' : 'Default'} Yield: ${productionTotalPortions} portions`)}
	                          </span>
                          <span className={`block text-[8px] mt-0.5 min-h-[10px] leading-none ${selectedEstimatedUseGrams > 0.01 ? 'text-blue-300' : 'invisible'}`}>
                            {selectedEstimatedUseGrams > 0.01 ? (
                              <>
                              ESTIMATED USE: {formatDisplay(selectedEstimatedUseGrams, 'g').v} {formatDisplay(selectedEstimatedUseGrams, 'g').u}
                              </>
                            ) : (
                              <>&nbsp;</>
                            )}
                          </span>
                          <span className={`mt-0.5 inline-flex min-h-[10px] items-center gap-1 text-[8px] leading-none ${selectedShortageGrams > 0.01 ? 'text-amber-400' : 'invisible'}`}>
                            {selectedShortageGrams > 0.01 ? (
                              <>
                              <AlertTriangle size={10} className="shrink-0" />
                              NEED MORE: {formatDisplay(selectedShortageGrams, 'g').v} {formatDisplay(selectedShortageGrams, 'g').u}
                              </>
                            ) : (
                              <>
                              <AlertTriangle size={10} className="shrink-0" />
                              &nbsp;
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

		                    <div className="grid shrink-0 min-w-0 self-center grid-cols-3 gap-1.5 w-full xl:w-[186px] 2xl:w-[192px]">
		                      <button
		                        onClick={handleDefaultSelected}
			                        className="bg-app-bg border border-app-border text-app-text hover:border-app-accent hover:text-app-accent shadow-lg shadow-app-border/10 text-[7px] font-black uppercase px-1.5 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 min-h-[34px] w-full text-center leading-tight"
			                      >
			                        <RotateCcw size={10} /> DEFAULT
			                      </button>

		                      <button
		                        onClick={handleDefaultAll}
			                        className={`${Math.abs((planIntent[activeRecipe?.id]?.val ?? activeDefaultIntent.val) - activeDefaultIntent.val) > 0.01 ? 'bg-amber-500 shadow-amber-500/20' : 'bg-app-accent shadow-app-accent/20'} text-app-bg shadow-lg text-[7px] font-black uppercase px-1.5 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 min-h-[34px] w-full text-center leading-tight`}
			                      >
			                        <RotateCcw size={10} /> DEFAULT ALL
			                      </button>

		                      <button
	                          onClick={() => {
	                            const activeIntent = planIntent[activeRecipe?.id];
	                            let activeVal = activeIntent ? activeIntent.val : 1;
	                            let mode = activeIntent ? activeIntent.mode : (portionMode ? 'portion' : 'batch');

                            console.log(`Global Action: Apply All [val:${activeVal}, mode:${mode}] to ${recipes.length} recipes`);

                            const allScaled = { ...planIntent };
                            recipes.forEach(r => {
                              allScaled[r.id] = { val: activeVal, mode };
	                            });
	                            setPlanIntent(allScaled);
	                          }}
			                          className="bg-app-accent/10 border border-app-accent/20 hover:bg-app-accent hover:text-app-bg shadow-lg shadow-app-accent/10 text-[7px] font-black uppercase px-1.5 py-1.5 rounded-lg transition-colors text-app-accent flex items-center justify-center gap-1 min-h-[34px] w-full text-center leading-tight"
			                        >
			                          <Copy size={10} /> APPLY ALL
			                        </button>
	                    </div>
                  </div>
                </div>

                {/* INTEGRATED INGREDIENT BOX (Wrapped Grid, No Scroll) */}
                <div className="w-full min-w-0 bg-app-surface border border-app-border rounded-lg overflow-hidden">
                  <div className="bg-app-bg px-4 py-2.5 border-b border-app-border flex justify-between items-center">
                    <h4 className="font-black uppercase text-[10px] tracking-widest flex items-center gap-2 text-app-muted">
                      <Scale size={14} className="text-app-accent" />
                      Production Scaling
                      {hasIntent && Math.abs((currentYieldValue / (activeRecipe?.baseYield || 1)) - 1) > 0.001 && (
                        <span className="font-normal lowercase ml-1">
                          (x{((activeNodeData?.weight || 0) / (coreGetCanonicalBatchYield(activeRecipe) || 1)).toFixed(2)} scale)
                        </span>
                      )}
                    </h4>
                    <div className="flex gap-3 text-[10px] font-black uppercase text-app-muted tracking-widest">
                      {isEditMode && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="w-32 rounded-md border border-app-accent/25 bg-app-bg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-app-accent outline-none focus:ring-1 focus:ring-app-accent placeholder:text-app-muted"
                            value={pendingIngredientCategory}
                            onChange={(e) => setPendingIngredientCategory(e.target.value)}
                            placeholder="CATEGORY"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddIngredient(pendingIngredientCategory)}
                            className="h-7 rounded-md border border-app-accent/25 bg-app-accent/10 px-2 text-[9px] font-black uppercase tracking-widest text-app-accent transition-all hover:bg-app-accent hover:text-app-bg"
                          >
                            + Add
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowRecipeNotes(prev => !prev)}
                        className="flex items-center gap-1.5 rounded-md border border-app-accent/20 bg-app-bg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-app-accent hover:bg-app-accent/10 transition-colors"
                      >
                        <Info size={12} />
                        Note +
                      </button>
                    </div>
                  </div>

                  {showRecipeNotes && (
                    <div className={`mx-4 mt-3 rounded-xl border border-app-accent/20 bg-app-bg/95 p-4 shadow-2xl shadow-black/30 relative z-20 ${expandedNoteIndex !== null ? 'min-h-[420px]' : ''}`}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-app-accent">
                          <Info size={14} />
                          Recipe Notes
                        </div>
                        <div className="flex items-center gap-2">
                          {recipeNotes.length < 3 && (
                            <button
                              type="button"
                              onClick={() => updateRecipeNotes([...recipeNotes, { title: '', body: '' }])}
                              className="rounded-md border border-app-accent/20 bg-app-accent/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-app-accent hover:bg-app-accent hover:text-app-bg transition-colors"
                            >
                              + Add Note
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowRecipeNotes(false)}
                            className="rounded-md border border-app-border bg-app-surface px-2 py-1 text-[9px] font-black uppercase tracking-widest text-app-muted hover:text-app-text transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      {lastDeletedNote && (
                        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                          <span className="text-[10px] font-bold text-amber-300">
                            Note removed. Restore it if that was accidental.
                          </span>
                          <button
                            type="button"
                            onClick={handleRestoreRecipeNote}
                            className="rounded-md border border-amber-500/30 bg-app-bg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-300 hover:bg-amber-500/20 transition-colors"
                          >
                            Restore
                          </button>
                        </div>
                      )}

                      <div className={`${expandedNoteIndex !== null ? 'hidden' : 'grid grid-cols-1 xl:grid-cols-3 gap-3'}`}>
                        {recipeNotes.map((noteItem, noteIdx) => (
                          <div key={noteIdx} className="rounded-xl border border-app-border bg-app-surface p-3 shadow-inner">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={noteItem.title || ''}
                                onChange={(e) => {
                                  const next = [...recipeNotes];
                                  next[noteIdx] = { ...next[noteIdx], title: e.target.value };
                                  updateRecipeNotes(next);
                                }}
                                placeholder="Note title"
                                className="w-full bg-transparent text-[11px] font-black text-app-accent outline-none border-none"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedNoteIndex(expandedNoteIndex === noteIdx ? null : noteIdx)}
                                  className="rounded-md border border-app-accent/20 bg-app-accent/10 px-2 py-1 text-[9px] font-black uppercase text-app-accent hover:bg-app-accent/20 transition-colors"
                                  title="Expand note"
                                >
                                  <Maximize2 size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecipeNote(noteIdx)}
                                  className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase text-red-300 hover:bg-red-500/20 transition-colors"
                                >
                                  X
                                </button>
                              </div>
                            </div>
                            <textarea
                              rows={6}
                              value={noteItem.body || ''}
                              onChange={(e) => {
                                const next = [...recipeNotes];
                                next[noteIdx] = { ...next[noteIdx], body: e.target.value };
                                updateRecipeNotes(next);
                              }}
                              placeholder="Write a clean kitchen note..."
                              className="w-full resize-none rounded-lg border border-app-border bg-app-bg px-3 py-2 text-[11px] leading-relaxed text-app-text outline-none focus:ring-1 focus:ring-app-accent"
                            />
                          </div>
                        ))}
                        {recipeNotes.length === 0 && (
                          <div className="rounded-xl border border-dashed border-app-border bg-app-surface/50 p-4 text-[11px] text-app-muted">
                            No notes yet. Use `+ Add Note` to add up to 3 quick kitchen notes.
                          </div>
                        )}
                      </div>

                      {expandedNoteIndex !== null && recipeNotes[expandedNoteIndex] && (
                        <div className="rounded-xl border border-app-accent/20 bg-app-surface p-4 shadow-inner">
                          <div className="mb-3 flex items-center justify-between gap-3 border-b border-app-border/50 pb-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-app-accent">
                              <Maximize2 size={14} />
                              Expanded Recipe Note
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedNoteIndex(null)}
                              className="rounded-md border border-app-border bg-app-bg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-app-muted hover:text-app-text transition-colors"
                              title="Return to compact note view"
                            >
                              <Maximize2 size={11} className="rotate-180" />
                            </button>
                          </div>
                          <div className="rounded-xl border border-app-border bg-app-bg p-4">
                            <input
                              type="text"
                              value={recipeNotes[expandedNoteIndex]?.title || ''}
                              onChange={(e) => {
                                const next = [...recipeNotes];
                                next[expandedNoteIndex] = { ...next[expandedNoteIndex], title: e.target.value };
                                updateRecipeNotes(next);
                              }}
                              placeholder="Note title"
                              className="mb-3 w-full bg-transparent text-sm font-black text-app-accent outline-none border-none"
                            />
                            <textarea
                              rows={11}
                              value={recipeNotes[expandedNoteIndex]?.body || ''}
                              onChange={(e) => {
                                const next = [...recipeNotes];
                                next[expandedNoteIndex] = { ...next[expandedNoteIndex], body: e.target.value };
                                updateRecipeNotes(next);
                              }}
                              placeholder="Write a clean kitchen note..."
                              className="w-full resize-none rounded-lg border border-app-border bg-app-surface px-4 py-3 text-[12px] leading-relaxed text-app-text outline-none focus:ring-1 focus:ring-app-accent"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WRAPPED GRID CONTAINER */}
                  <div className={`grid grid-cols-1 p-4 ${isEditMode ? 'md:grid-cols-2 xl:grid-cols-3 gap-4' : 'md:grid-cols-2 lg:grid-cols-4 gap-6'}`}>
                    {ingredientCategoryEntries.map(([category, items]) => (
                      <div key={category} className={`${isEditMode ? 'space-y-1.5' : 'space-y-2'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          {isEditMode && editingCategoryHeader === category ? (
                            <input
                              type="text"
                              autoFocus
                              value={editingCategoryValue}
                              onChange={(e) => setEditingCategoryValue(e.target.value)}
                              onBlur={() => {
                                handleRenameIngredientCategory(category, editingCategoryValue);
                                setEditingCategoryHeader(null);
                                setEditingCategoryValue('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameIngredientCategory(category, editingCategoryValue);
                                  setEditingCategoryHeader(null);
                                  setEditingCategoryValue('');
                                }
                                if (e.key === 'Escape') {
                                  setEditingCategoryHeader(null);
                                  setEditingCategoryValue('');
                                }
                              }}
                              className="min-w-[140px] bg-app-bg border border-app-accent/25 text-app-accent text-[10px] font-black uppercase px-2 py-1 rounded tracking-tighter outline-none focus:ring-1 focus:ring-app-accent"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isEditMode) return;
                                setEditingCategoryHeader(category);
                                setEditingCategoryValue(category);
                              }}
                              className={`text-[10px] font-black uppercase px-2 py-1 rounded inline-block tracking-tighter border text-left ${category === 'WET / LIQUID' ? 'bg-app-accent/20 border-app-accent text-app-text font-black scale-105 transform origin-left' : 'bg-app-accent/5 border-app-accent/10 text-app-accent'} ${isEditMode ? 'cursor-text' : 'cursor-default'}`}
                            >
                              {category}
                              {category === 'WET / LIQUID' && <span className="ml-2 text-[8px] font-normal opacity-70">(Mix in same container)</span>}
                            </button>
                          )}
                          {isEditMode && (
                            <button
                              type="button"
                              onClick={() => handleAddIngredient(category)}
                              className="w-6 h-6 rounded-md border border-app-accent/25 bg-app-accent/10 text-app-accent hover:bg-app-accent hover:text-app-bg transition-all flex items-center justify-center text-sm font-black"
                              title={`Add ingredient to ${category}`}
                            >
                              +
                            </button>
                          )}
                        </div>
                        <div className={isEditMode ? 'space-y-0.5' : 'space-y-1'}>
                          {items.map((ing) => {
                            const idx = (activeRecipe?.ingredients || []).indexOf(ing);
                            const isChecked = checkedItems[idx];

                            // CIRCUIT BREAKER: Use rootScaleFactor for the primary recipe view (Step 2)
                            const factor = portionMode ? (hasIntent ? rootScaleFactor : 1.0) : displayScaleFactor;
                            const isRowScaled = hasIntent && Math.abs(factor - 1) > 0.01; // Slightly higher threshold for UI badge

                            let scaledVal = ing.qty * factor;
                            const isPortionLikeIngredient = /^(portion|portions|pcs|pax|each)s?$/i.test((ing.unit || '').trim());
                            const portionDisplay = isPortionLikeIngredient
                              ? formatPortionDisplay(scaledVal)
                              : null;
                            const linkedRecipeId = resolveRecipeId(ing, recipes);
                            
                            const isInteger = Math.abs((scaledVal || 0) - Math.round(scaledVal || 0)) < 0.01;
                            const isMain = ing.isMain;
                            const isEditing = editingIngId === idx;

                            return (
                              <div
                                data-testid={`ingredient-row-${toTestId(ing.sku || ing.name)}`}
                                key={idx}
                                onClick={() => {
                                  if (!isMain || isEditing) return;
                                  setCheckedItems({ ...checkedItems, [idx]: !isChecked });
                                }}
                                className={`flex items-center justify-between p-2 rounded border transition-all ${isMain ? 'border-l-4 border-l-app-accent ring-1 ring-app-accent/10' : ''} ${isChecked ? 'bg-app-success/5 border-app-success/20 opacity-40' : 'bg-app-bg border-app-border'} ${isMain && !isChecked ? 'hover:border-app-accent' : ''}`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="shrink-0">
                                    {isEditMode ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteIngredient(idx);
                                        }}
                                        className="w-7 h-7 rounded-md border border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center"
                                        title="Delete ingredient"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCheckedItems({ ...checkedItems, [idx]: !isChecked });
                                        }}
                                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${isChecked ? 'bg-app-success border-app-success text-white' : 'border-app-border bg-app-surface'}`}
                                        title={isChecked ? 'Mark ingredient active' : 'Mark ingredient done'}
                                      >
                                        {isChecked && <Check size={8} strokeWidth={4} />}
                                      </button>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {isEditMode ? (
                                      <>
                                        <input
                                          className={`w-full bg-app-bg border border-app-accent/20 outline-none text-[11px] font-bold leading-tight ${isChecked ? 'line-through text-app-muted' : 'text-app-text'} rounded px-1 transition-all focus:border-app-accent`}
                                          value={translateIngredient(ing.name)}
                                          onChange={(e) => updateIngredientLocal(idx, { name: e.target.value })}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <input
                                          className={`w-full bg-app-bg border border-app-accent/10 outline-none text-[8px] text-app-muted uppercase font-medium mt-1 rounded px-1 transition-all focus:border-app-accent`}
                                          value={ing.sku || ''}
                                          onChange={(e) => updateIngredientLocal(idx, { sku: e.target.value })}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="ADD SKU/NOTE"
                                        />
                                        <input
                                          className={`w-full bg-app-bg border border-app-accent/10 outline-none text-[9px] text-app-accent uppercase font-bold mt-1 rounded px-1 transition-all focus:border-app-accent`}
                                          value={normalizeIngredientCategory(ing.category || ing.cat || 'OTHER')}
                                          onChange={(e) => updateIngredientLocal(idx, { category: persistIngredientCategory(e.target.value), cat: persistIngredientCategory(e.target.value) })}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="CATEGORY"
                                        />
                                        <select
                                          className={`w-full bg-app-bg border border-app-accent/10 outline-none text-[9px] text-app-muted uppercase font-medium mt-1 rounded px-1.5 py-1 transition-all focus:border-app-accent`}
                                          value={linkedRecipeId || ''}
                                          onChange={(e) => updateIngredientLink(idx, e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option value="">NO LINK</option>
                                          {linkableRecipes.map(r => (
                                            <option key={r.id} value={r.id}>
                                              {r.name}
                                            </option>
                                          ))}
                                        </select>
                                      </>
                                    ) : (
                                      <>
                                        <p className={`text-[11px] font-bold leading-tight ${isChecked ? 'line-through text-app-muted' : 'text-app-text'}`}>
                                          {translateIngredient(ing.name)}
                                          {isMain && <span className="text-[7px] bg-app-accent/20 text-app-accent px-1 rounded ml-1">MAIN</span>}
                                          {linkedRecipeId && <span className="text-[7px] bg-blue-500/20 text-blue-300 px-1 rounded ml-1 inline-flex items-center gap-1"><Link2 size={8} /> LINKED</span>}
                                        </p>
                                        <p className="text-[8px] text-app-muted uppercase font-medium">{ing.sku}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {isEditMode ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="w-24 sm:w-28 bg-app-bg border border-app-accent/30 text-app-text font-black text-right px-2 py-1 rounded outline-none focus:border-app-accent transition-all tabular-nums"
                                        value={ing.qty !== undefined && ing.qty !== null ? ing.qty : ""}
                                        onChange={(e) => updateIngredientLocal(idx, { qty: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                      />
                                      <input
                                        type="text"
                                        className="w-14 sm:w-16 bg-app-bg border border-app-accent/30 text-app-muted font-black text-left px-2 py-1 rounded outline-none focus:border-app-accent transition-all uppercase tracking-tight"
                                        value={ing.unit || ''}
                                        onChange={(e) => updateIngredientLocal(idx, { unit: e.target.value })}
                                        placeholder="unit"
                                      />
                                      {/* is_process toggle hidden in V3.1 */}

                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-end">
                                      {isScaled ? (
                                        <>
                                          <div className="flex items-baseline gap-1 opacity-40">
                                            <span className="text-[10px] text-app-muted font-bold line-through tabular-nums">
                                              {ing.qty}
                                            </span>
                                            <span className="text-[7px] text-app-muted font-black uppercase tracking-tighter">BASE</span>
                                          </div>
                                          <div data-testid={`ingredient-qty-${toTestId(ing.sku || ing.name)}`} className="flex items-baseline gap-0.5">
                                            <span className={`text-[15px] font-black tabular-nums ${isChecked ? 'text-app-muted' : 'text-app-accent'}`}>
                                              {portionDisplay ? portionDisplay.v : formatDisplay(scaledVal, ing.unit).v}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase ${isChecked ? 'text-app-muted' : 'text-app-accent'}`}>
                                              {portionDisplay ? portionDisplay.u : formatDisplay(scaledVal, ing.unit).u}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <div data-testid={`ingredient-qty-${toTestId(ing.sku || ing.name)}`} className="flex items-baseline gap-0.5">
                                          <span className={`text-[15px] font-black tabular-nums ${isChecked ? 'text-app-muted' : 'text-app-text'}`}>
                                            {ing.qty}
                                          </span>
                                          <span className="text-[9px] font-bold text-app-muted uppercase">
                                            {ing.unit}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PREP STRATEGY: Directly under ingredients, heavily detailed */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {activeRecipe?.note && activeRecipe?.note !== 'No operational notes provided.' && (
                    <div className="md:col-span-12 bg-app-surface border border-app-border rounded-lg p-4 relative overflow-hidden">
                      <div className="flex gap-2 items-center mb-2 font-black text-[10px] uppercase text-app-accent tracking-widest border-b border-app-border/50 pb-2">
                        <Info size={14} /> Critical Prep Strategy & Detailed Intelligence
                      </div>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-xs font-medium leading-relaxed text-app-text italic bg-app-bg/50 p-3 rounded border border-app-border/30 shadow-inner">
                          <i className="fa-solid fa-quote-left text-app-accent opacity-50 mr-2"></i>
                          {activeRecipe.note}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* METHOD / INSTRUCTIONS */}
                  <div className="md:col-span-8 bg-app-surface border border-app-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4 border-b border-app-border pb-2">
                      <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isBulkMode ? 'text-amber-500' : 'text-app-accent'}`}>
                        <Zap size={14} />
                        {isBulkMode ? "Bulk Production Protocol" : "Standard Production Run"}
                      </h4>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => addRecipeMethodStep(isBulkMode)}
                          className="rounded-md border border-app-accent/20 bg-app-accent/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-app-accent hover:bg-app-accent hover:text-app-bg transition-colors"
                        >
                          + Step
                        </button>
                      )}
                    </div>
                    {activeRecipe?.method && Array.isArray(activeRecipe.method) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        {(isBulkMode && Array.isArray(activeRecipe.bulkMethod) ? activeRecipe.bulkMethod : activeRecipe.method).map((step, i) => (
                          <div key={i} className="flex gap-3 text-[11px] font-medium leading-relaxed text-app-text">
                            <span className="font-bold text-app-accent bg-app-accent/10 rounded-full shrink-0 w-5 h-5 flex items-center justify-center text-[10px]">{i + 1}</span>
                            {isEditMode ? (
                              <div className="flex flex-1 items-start gap-2">
                                <textarea
                                  rows={2}
                                  value={step}
                                  onChange={(e) => updateRecipeMethodStep(i, e.target.value, isBulkMode)}
                                  className="w-full resize-none rounded-lg border border-app-border bg-app-bg px-3 py-2 text-[11px] leading-relaxed text-app-text outline-none focus:ring-1 focus:ring-app-accent"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeRecipeMethodStep(i, isBulkMode)}
                                  className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase text-red-300 hover:bg-red-500/20 transition-colors"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <span className="pt-0.5">{step}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SCALING ADVICE */}
                  <div className="md:col-span-4 p-4 bg-app-surface border border-app-border rounded-lg">
                    <div className="flex gap-2 items-center mb-3 font-black text-[10px] uppercase text-app-accent tracking-widest border-b border-app-border/50 pb-2">
                      <Scale size={14} /> Scaling Intel
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[8px] font-black uppercase text-app-muted mb-1">Regular</p>
                        {isEditMode ? (
                          <textarea
                            rows={3}
                            value={activeRecipe.scalingTips?.regular || ''}
                            onChange={(e) => updateRecipeScalingTipsLocal({ regular: e.target.value })}
                            className="w-full resize-none rounded-lg border border-app-border bg-app-bg px-3 py-2 text-[10px] leading-tight text-app-text outline-none focus:ring-1 focus:ring-app-accent"
                            placeholder="Add regular scaling intel..."
                          />
                        ) : (
                          <p className="text-[10px] text-app-text leading-tight italic">"{activeRecipe.scalingTips?.regular || "Maintain standard ratios."}"</p>
                        )}
                      </div>
                      {isBulkMode && (
                        <div className="animate-in slide-in-from-right duration-500 border-l-2 border-amber-500 pl-3">
                          <p className="text-[8px] font-black uppercase text-amber-500 mb-1">Bulk Warning</p>
                          {isEditMode ? (
                            <textarea
                              rows={3}
                              value={activeRecipe.scalingTips?.largeScale || ''}
                              onChange={(e) => updateRecipeScalingTipsLocal({ largeScale: e.target.value })}
                              className="w-full resize-none rounded-lg border border-amber-500/20 bg-app-bg px-3 py-2 text-[10px] leading-tight text-app-text outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="Add bulk production warning..."
                            />
                          ) : (
                            <p className="text-[10px] font-bold text-app-text leading-tight italic">"{activeRecipe.scalingTips?.largeScale || "Monitor heat levels."}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-app-surface border border-app-border rounded-xl p-20 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-app-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-app-accent/20">
                  {showDeleted ? <Trash2 size={32} className="text-red-500 opacity-50" /> : <Search size={32} className="text-app-accent" />}
                </div>
                <h3 className="text-xl font-black text-app-text uppercase tracking-widest mb-2">
                  {showDeleted ? "Restore Bin is Empty" : "No matching SOPs found"}
                </h3>
                <p className="text-app-muted text-sm max-w-md mx-auto mb-8 font-medium">
                  {showDeleted
                    ? "Any recipes you delete will appear here for 30 days. You can restore them to your active library at any time."
                    : `We couldn't find any recipes matching "${searchQuery}". Try searching by name, cuisine, or occasion.`
                  }
                </p>
                <button
                  onClick={() => {
                    if (showDeleted) {
                      setShowDeleted(false);
                    } else {
                      setSearchQuery('');
                    }
                  }}
                  className="px-8 py-3 bg-app-bg border border-app-border hover:border-app-accent text-app-text rounded-lg text-xs font-black uppercase transition-all shadow-lg"
                >
                  {showDeleted ? "Back to Recipe Library" : "Clear Search Filter"}
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'ordering' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-500">

            {/* DAILY PREP SCHEDULE */}
            <section className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-app-surface border border-app-border rounded-lg flex flex-col h-fit overflow-hidden">
                <div className="bg-app-bg px-6 py-5 border-b border-app-border">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2 text-app-muted">
                      <LayoutDashboard size={18} /> {portionMode ? "Portion Target List" : "Batch Target List"}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPlanIntent({})}
                        className="text-[9px] font-black bg-app-surface text-app-danger px-3 py-2 rounded uppercase flex items-center gap-1.5 hover:bg-app-danger/10 transition-all border border-app-danger/20"
                        title="Clear manual overrides only"
                      >
                        <RotateCcw size={12} /> Clear Edits
                      </button>
                      <button
                        onClick={handleDefaultAll}
                        className="text-[9px] font-black bg-app-danger text-white px-3 py-2 rounded uppercase flex items-center gap-1.5 hover:bg-app-danger/90 transition-all shadow-lg shadow-app-danger/20"
                      >
                        <Trash2 size={12} /> Default All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 5, 10].map(m => (
                      <button
                        key={m}
                        onClick={() => applyMultiplier(m)}
                        className="bg-app-bg border border-app-border hover:border-app-accent hover:bg-app-accent/5 py-2 rounded flex flex-col items-center justify-center transition-all group"
                      >
                        <span className="text-[10px] font-black text-app-muted group-hover:text-app-accent uppercase">x{m}</span>
                        <span className="text-[8px] font-black text-app-muted/50 uppercase">Batch</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 space-y-2 overflow-y-auto max-h-[700px] custom-scroll">
                  {recipes.map(recipe => (
                    <div key={recipe.id} className="flex items-center gap-4 bg-app-bg rounded-md p-4 border border-app-border hover:border-app-muted transition-colors group h-[72px] shrink-0">
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-bold text-app-text mb-1 truncate">
                          {translateIngredient(recipe.name).replace(/^\d+[\s.\-_]*/, '')}
                        </div>
                        <div className="text-[10px] font-bold text-app-muted uppercase tracking-wider">{recipe.tier}</div>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step={portionMode ? "1" : "0.5"}
                          value={planIntent[recipe.id]?.val ?? ""}
                          placeholder={portionMode
                            ? roundKitchenPortions(activeNodes[recipe.id]?.portions || (
                              getRecipePortionWeight(recipe)
                                ? (getRecipeBaselineGrams(recipe, false, coreSettings) / Math.max(0.001, getRecipePortionWeight(recipe)))
                                : 0
                            ))
                            : '1.0'
                          }
	                          onChange={(e) => {
	                            const val = parseFloat(e.target.value);
	                            if (!isNaN(val)) {
	                              handleUpdateTarget(recipe.id, val, portionMode ? 'portion' : 'batch');
                            } else if (e.target.value === '') {
                              const next = { ...planIntent };
	                              delete next[recipe.id];
	                              setPlanIntent(next);
	                            }
	                          }}
	                          onBlur={() => handleCommitTarget(recipe.id, portionMode ? 'portion' : 'batch')}
	                          className={`w-24 bg-app-surface border border-app-border rounded px-3 py-1.5 font-bold text-right text-lg tabular-nums outline-none focus:ring-1 ${portionMode ? 'text-amber-500 focus:border-amber-500 focus:ring-amber-500' : 'text-app-accent focus:border-app-accent focus:ring-app-accent'} placeholder:text-app-muted/30`}
	                        />
                        <div className="absolute -top-2.5 -right-2 bg-app-surface text-app-muted text-[8px] font-bold px-1.5 py-0.5 border border-app-border rounded uppercase">
                          {portionMode ? "portions" : "batches"}
                        </div>
                        {planIntent[recipe.id] && activeNodes[recipe.id]?.scale !== undefined && Math.abs(activeNodes[recipe.id].scale - 1) > 0.001 && (
                          <div className={`absolute -bottom-2 -left-0 text-[7px] font-black px-1 rounded-sm border ${activeNodes[recipe.id].scale > 1.01 ? 'bg-app-danger/10 text-app-danger border-app-danger/20' : 'bg-app-accent/10 text-app-accent border-app-accent/20'}`}>
                            x{activeNodes[recipe.id].scale.toFixed(2)} SCALE
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CONSOLIDATED MARKET LIST */}
            <section className="lg:col-span-7 bg-app-surface border border-app-border rounded-lg flex flex-col min-h-[600px] overflow-hidden">
              <div className="bg-app-accent text-app-bg px-6 py-5 flex justify-between items-center gap-3 border-b border-app-border">
                <h2 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                  <ShoppingCart size={18} /> Aggregated Order
                </h2>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsMarketExportOpen((prev) => !prev)}
                    className="px-4 py-2 hover:bg-app-bg/20 border border-app-bg/30 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 text-app-bg"
                  >
                    <FileSpreadsheet size={14} className="opacity-80" />
                    Export
                  </button>
                  {isMarketExportOpen && (
                    <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-2xl border border-app-bg/30 bg-app-surface p-2 shadow-2xl">
                      <button
                        onClick={() => {
                          let csv = "CATEGORY,ITEM,STOCK_REQUIRED,UNIT\n";
                          Object.entries(aggregatedOrder).forEach(([cat, items]) => {
                            items.forEach(i => {
                              const { val: v, unit: u } = formatQuantity(i.qty, i.unit);
                              csv += `${translateIngredient(cat)},${translateIngredient(i.name)},${v},${u}\n`;
                            });
                          });
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `market_order.csv`;
                          a.click();
                          setIsMarketExportOpen(false);
                        }}
                        className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-left text-[10px] font-black uppercase text-app-text transition-all hover:border-app-accent hover:text-app-accent flex items-center gap-2"
                      >
                        <FileSpreadsheet size={14} />
                        CSV File
                      </button>
                      <button
                        onClick={() => {
                          const rows = Object.entries(aggregatedOrder).flatMap(([cat, items]) =>
                            items.map((i) => {
                              const display = formatQuantity(i.qty, i.unit);
                              return `<tr><td style="padding:8px 10px;border-bottom:1px solid #333;">${translateIngredient(cat)}</td><td style="padding:8px 10px;border-bottom:1px solid #333;">${translateIngredient(i.name)}</td><td style="padding:8px 10px;border-bottom:1px solid #333;text-align:right;">${display.val}</td><td style="padding:8px 10px;border-bottom:1px solid #333;">${display.unit}</td></tr>`;
                            })
                          ).join('');
                          const printWindow = window.open('', '_blank', 'width=900,height=700');
                          if (!printWindow) return;
                          printWindow.document.open();
                          printWindow.document.write(`<!doctype html>
                            <html>
                              <head>
                                <title>Market Order</title>
                                <style>
                                  @page { size: A4 portrait; margin: 10mm; }
                                  * { box-sizing: border-box; }
                                  body { font-family: Inter, Arial, sans-serif; margin: 0; color: #111; }
                                  .page { width: 100%; }
                                  h1 { font-size: 18px; margin-bottom: 16px; }
                                  table { width: 100%; border-collapse: collapse; font-size: 12px; }
                                  th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #111; }
                                  @media print { html, body { margin: 0; padding: 0; } }
                                </style>
                              </head>
                              <body>
                                <div class="page">
                                  <h1>Kabile Market Order</h1>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Category</th>
                                        <th>Item</th>
                                        <th style="text-align:right;">Qty</th>
                                        <th>Unit</th>
                                      </tr>
                                    </thead>
                                    <tbody>${rows}</tbody>
                                  </table>
                                </div>
                                <script>
                                  window.addEventListener('load', function () {
                                    setTimeout(function () {
                                      window.focus();
                                      window.print();
                                    }, 300);
                                  });
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          setIsMarketExportOpen(false);
                        }}
                        className="mt-2 w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-left text-[10px] font-black uppercase text-app-text transition-all hover:border-app-accent hover:text-app-accent flex items-center gap-2"
                      >
                        <FileText size={14} />
                        PDF File
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-0 flex-1 overflow-y-auto max-h-[700px] custom-scroll">
                {Object.keys(aggregatedOrder).length === 0 ? (
                  <div className="p-20 flex flex-col items-center justify-center h-full text-center">
                    <Package size={48} className="text-app-border mb-4" />
                    <div className="text-app-muted font-bold text-lg mb-2">No Active Targets</div>
                    <p className="text-xs text-app-muted max-w-[250px]">Input daily production targets on the left to calculate required stock quantities.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[60%]" />
                      <col className="w-[40%]" />
                    </colgroup>
                    <tbody className="divide-y divide-app-border">
                      {Object.entries(aggregatedOrder).map(([cat, items]) => (
                        <React.Fragment key={cat}>
                          <tr className="bg-app-bg"><td colSpan="2" className="px-6 py-2 border-y border-app-border"><span className="text-[10px] font-bold uppercase text-app-muted tracking-widest flex items-center gap-2"><Tag size={10} /> {translateIngredient(cat)}</span></td></tr>
                          {items.map((item, i) => (
                            <tr data-testid={`market-row-${toTestId(item.name)}`} key={i} className="hover:bg-app-bg transition-colors h-[64px]">
                              <td className="px-6 py-4 font-medium text-[15px] text-app-text truncate">{translateIngredient(item.name)}</td>
                              <td data-testid={`market-qty-${toTestId(item.name)}`} className="px-6 py-4 text-right whitespace-nowrap overflow-hidden">
                                <span className="font-bold text-2xl tabular-nums text-app-accent">
                                  {formatDisplay(item.qty, item.unit).v}
                                </span>
                                <span className="text-[11px] font-bold text-app-muted uppercase ml-2">
                                  {formatDisplay(item.qty, item.unit).u}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="p-6 border-t border-app-border bg-app-bg">
                <button onClick={() => {
                  let text = `*KABILE MARKET ORDER - ${new Date().toLocaleDateString()}*\n\n`;
                  Object.entries(aggregatedOrder).forEach(([cat, items]) => {
                    text += `--- *${translateIngredient(cat)}* ---\n`;
                    items.forEach(i => {
                      const { val: v, unit: u } = formatQuantity(i.qty, i.unit);
                      text += `• ${translateIngredient(i.name)}: ${v} ${u}\n`;
                    });
                    text += `\n`;
                  });
                  const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
                  alert("WhatsApp list copied.");
                }} className="w-full py-4 bg-app-surface border border-app-border hover:border-app-accent text-app-text font-bold uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-colors rounded">
                  <Copy size={16} className="text-app-accent" /> Copy for WhatsApp
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
      )}
      <footer className="text-center text-app-muted text-[10px] font-bold uppercase tracking-widest py-12 flex justify-center items-center gap-2 opacity-30 mt-10">
        <Utensils size={12} /> Operations Suite
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <Routes>
      <Route path="/:clientSlug" element={<SopMain />} />
      <Route path="/" element={<Navigate to="/kabile" replace />} />
    </Routes>
  );
}
