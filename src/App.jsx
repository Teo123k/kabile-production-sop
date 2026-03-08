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
  Timer
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
  resolveRecipeId,
  resolveRecipeIdBySku
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


const SopMain = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('scaler');
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
  const [offlineStatus, setOfflineStatus] = useState(false);
  const [editIngBase, setEditIngBase] = useState(null); // {idx, field}
  const [isEditMode, setIsEditMode] = useState(false);

  const { clientSlug } = useParams();
  const config = CLIENT_CONFIGS[clientSlug] || CLIENT_CONFIGS['kabile'];

  const coreSettings = useMemo(() => ({
    mainPortionSize,
    sidePortionSize,
    starterPortionSize,
    portionsPerBatch
  }), [mainPortionSize, sidePortionSize, starterPortionSize, portionsPerBatch]);

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

  const getPortionSize = useCallback((recipe) =>
    coreGetPortionSize(recipe, coreSettings, recipes)
    , [coreSettings, recipes]);

  const getStandardBatchYield = useCallback((recipe) =>
    coreGetStandardBatchYield(recipe, coreSettings, recipes)
    , [coreSettings, recipes]);


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
          if (legacyMatch && legacyMatch.presentation_json) {
            const pjson = typeof legacyMatch.presentation_json === 'string' ? JSON.parse(legacyMatch.presentation_json) : legacyMatch.presentation_json;
            if (pjson.strategy) strategy = pjson.strategy;
          }

          const r = typeof row.recipe_json === 'string' ? JSON.parse(row.recipe_json) : (row.recipe_json || {});

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
            // Prioritize the deep strategy narrative, then standard note
            note: strategy.note || row.note || r.note || 'No operational notes provided.',
            dishStyle: row.dish_style || r.dishStyle || r.style || 'stewed',
            dishCategory: row.tier || row.cuisine_type || r.dishCategory || r.category || 'Tier 2 (Daily)',
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

      const pWeight = getPortionWeight(r);
      const bYield = r.baseYield || 1;

      if (mode === 'portion') {
        rawScales[id] = (numericVal * pWeight) / bYield;
      } else if (mode === 'batch') {
        // Use the standard batch yield (respects Prep vs Main dish logic)
        const stdYield = getStandardBatchYield(r);
        rawScales[id] = (numericVal * stdYield) / bYield;
      } else if (mode === 'weight') {
        rawScales[id] = numericVal / bYield;
      }
    });

    // Step 2: Fallback to volumeFocus ONLY if no manual plan exists for ANY recipe
    const hasManualPlan = Object.values(planIntent).some(v => (parseFloat(v.val) || 0) > 0);

    if (!hasManualPlan) {
      recipes.forEach(r => {
        if (rootRecipeIds.has(r.id) && rawScales[r.id] === undefined) {
          const mix = menuMix && menuMix[r.id] !== undefined ? parseFloat(menuMix[r.id]) / 100 : 1;
          const targetPortions = volumeFocus * mix;
          const pWeight = getPortionWeight(r);
          const bYield = r.baseYield || 1;
          rawScales[r.id] = (targetPortions * pWeight) / bYield;
        }
      });
    }

    return calculateBOM(recipes, rawScales, portionsPerBatch);
  }, [recipes, volumeFocus, menuMix, planIntent, coreSettings, rootRecipeIds, getPortionWeight, getStandardBatchYield, portionsPerBatch]);

  const activeNodes = bomResult.nodes || {};
  const activeDemand = bomResult.demand || {};
  const activeOrigins = bomResult.activeOrigins || {};

  // Unified Target Resolver (Vercel Best Practices: js-early-exit)
  const handleUpdateTarget = useCallback((recipeId, val, modeOverride = null) => {
    const r = recipes.find(rec => rec.id === recipeId);
    if (!r) return;

    // Use current view mode as default if no override provided
    const mode = modeOverride || (portionMode ? 'portion' : 'batch');

    setPlanIntent(prev => ({
      ...prev,
      [recipeId]: { val, mode }
    }));
  }, [recipes, portionMode]);

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

  // If activeRecipe switches due to search, update selectedId
  useEffect(() => {
    if (activeRecipe && activeRecipe.id !== selectedId) {
      setSelectedId(activeRecipe.id);
    }
  }, [activeRecipe?.id, selectedId]);

  const activeNodeData = activeRecipe ? activeNodes[activeRecipe.id] : null;
  const currentYieldValue = activeNodeData ? activeNodeData.weight : (activeRecipe?.baseYield || 0);
  const currentPortionCount = activeNodeData
    ? Math.round(activeNodeData.portions)
    : (activeRecipe ? Math.round(activeRecipe.baseYield / Math.max(0.001, getPortionWeight(activeRecipe))) : 0);

  // Memoize grouped and sorted recipes for the selector (Vercel Best Practices: rerender-memo)
  // Memoize grouped and sorted recipes for the selector
  const groupedRecipes = useMemo(() => {
    const groups = filteredRecipesList.reduce((acc, r) => {
      const style = r.dishStyle || r.style || 'Other';
      const groupLabel =
        style === 'prep' ? 'Foundational Prep (Tier 1)' :
          style === 'marinade' ? 'Marinades & Pre-Prep' :
            ['sauce', 'glaze'].includes(style) ? 'Finishing Sauces' :
              ['grilled', 'fried', 'stir_fried', 'stew'].includes(style) ? 'Main Dishes' :
                'Sides & Condiments';
      if (!acc[groupLabel]) acc[groupLabel] = [];
      acc[groupLabel].push(r);
      return acc;
    }, {});

    const order = ['Foundational Prep (Tier 1)', 'Marinades & Pre-Prep', 'Finishing Sauces', 'Main Dishes', 'Sides & Condiments'];
    return Object.entries(groups).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [filteredRecipesList]);

  const standardBatchYield = useMemo(() => {
    return getStandardBatchYield(activeRecipe);
  }, [activeRecipe, getStandardBatchYield]);

  const totalWeightForActive = useMemo(() => {
    if (!activeRecipe) return { v: 0, u: 'g' };
    const pWeight = getPortionWeight(activeRecipe);
    const unit = (activeRecipe.unit || '').toLowerCase();
    if (unit.includes('portion')) {
      return formatDisplay(currentYieldValue * pWeight, 'g');
    }
    return formatDisplay(currentYieldValue, activeRecipe.unit);
  }, [activeRecipe, currentYieldValue, getPortionWeight, formatDisplay]);

  const isBulkMode = useMemo(() => {
    // Volume focus of 300 or 600+ automatically triggers bulk mode for efficiency
    if (volumeFocus >= 300) return true;
    return currentYieldValue >= (activeRecipe?.bulkThreshold || 50);
  }, [currentYieldValue, activeRecipe, volumeFocus]);


  const handleRoundAndFix = () => {
    if (!activeRecipe) return;

    let bestYield = currentYieldValue;
    let minTotalVariance = Infinity;

    // Search range: ±15% of current yield.
    const searchRange = Math.max(activeRecipe.baseYield * 0.1, currentYieldValue * 0.15);
    const step = activeRecipe.baseYield * 0.01; // Fine granularity

    for (let y = Math.max(0.1, currentYieldValue - searchRange); y <= currentYieldValue + searchRange; y += step) {
      const f = y / activeRecipe.baseYield;
      let variance = 0;

      activeRecipe.ingredients.forEach(ing => {
        // Only optimize measurable quantities
        if (!ing.qty || ing.qty <= 0) return;

        const ideal = ing.qty * f;
        let displayUnit = (ing.unit || '').toLowerCase();
        let displayVal = ideal;

        // Match formatQuantity logic for accurate chefRound targeting
        if (displayUnit === 'g' && ideal >= 1000) { displayVal = ideal / 1000; displayUnit = 'kg'; }
        else if (displayUnit === 'ml' && ideal >= 1000) { displayVal = ideal / 1000; displayUnit = 'L'; }

        const roundedDisplay = chefRound(displayVal, displayUnit);

        // Calculate absolute mathematical distance from the rounded 'clean' number
        // High penalty for decimal values (we want 150g, not 151.2g)
        const error = Math.abs(displayVal - roundedDisplay) / (displayVal || 1);

        // Add additional penalty if the rounded number itself is not a whole integer
        // (This heavily pushes the solver toward choosing a yield that makes ingredients land on round integers like 50, 100, instead of 53.5)
        const integerPenalty = Number.isInteger(roundedDisplay) ? 0 : 0.5;

        variance += (error + integerPenalty);
      });

      if (variance < minTotalVariance) {
        minTotalVariance = variance;
        bestYield = y;
      }
    }

    const finalVal = portionMode
      ? Math.round(bestYield / (getPortionSize(activeRecipe) || 1))
      : Number(bestYield.toFixed(2));

    const mode = portionMode ? 'portion' : 'weight';
    setPlanIntent({ ...planIntent, [selectedId]: { val: finalVal, mode } });
  };

  const handleReverseScale = (ing, newQty) => {
    if (!activeRecipe || !newQty || newQty <= 0) return;
    const factor = newQty / ing.qty;
    const newYield = activeRecipe.baseYield * factor;

    const finalVal = portionMode
      ? Math.round(newYield / (getPortionSize(activeRecipe) || 1))
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
        bulk_method: activeRecipe.bulk_method,
        show_on_board: activeRecipe.show_on_board,
        cuisine: activeRecipe.cuisine,
        occasion: activeRecipe.occasion,
        yield_unit: activeRecipe.unit,
        base_yield: activeRecipe.baseYield
      }).eq('recipe_id', activeRecipe.id);
      if (error) throw error;
      // Alert removed per user request for silent saving
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save updates.");
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
  }, [activeRecipe?.ingredients, activeRecipe?.cuisine, activeRecipe?.occasion, activeRecipe?.show_on_board, activeRecipe?.is_deleted]);

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
        // Use professional resolver to check if this is a sub-recipe
        const resolvedChildId = resolveRecipeId(ing, recipes);
        if (resolvedChildId) return; // Skip sub-recipes to avoid double counting

        let baseQty = parseFloat(ing.qty) || 0;
        let baseUnit = (ing.unit || 'units').toLowerCase();

        // Standardize weight/volume to base units (g/ml) for aggregation
        if (/^(kg)s?$/.test(baseUnit)) { baseQty *= 1000; baseUnit = 'g'; }
        else if (/^(l|liter|litre)s?$/.test(baseUnit)) { baseQty *= 1000; baseUnit = 'ml'; }

        const scaledQty = (baseQty / (parseFloat(recipe.baseYield) || 1)) * totalYield;
        // Canonical SKU or fallback to normalized name-unit pair
        const sku = ing.sku || `${ing.name.toLowerCase().trim().replace(/\s+/g, '-')}-${baseUnit}`;

        if (!totals[sku]) {
          totals[sku] = {
            name: ing.name,
            cat: ing.cat || ing.category || 'other',
            qty: 0,
            unit: baseUnit
          };
        }
        totals[sku].qty += scaledQty;
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


  const handleCsvDownload = () => {
    const factor = currentYieldValue / activeRecipe.baseYield;
    let csv = `RECIPE,${activeRecipe.name.toUpperCase()}\nTARGET YIELD,${currentYieldValue},${activeRecipe.unit}\n\nCATEGORY,ITEM,SKU,SCALED_WEIGHT,UNIT\n`;
    activeRecipe.ingredients.forEach(ing => {
      const { val: v, unit: u } = formatQuantity(ing.qty * factor, ing.unit);
      csv += `${ing.cat || ing.category || 'other'},${ing.name.replace(/,/g, '')},${ing.sku},${v},${u}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeRecipe.id}_recipe.csv`; a.click();
  };

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
    <div className="min-h-screen bg-app-bg text-app-text font-sans p-2 md:p-6 selection:bg-app-accent selection:text-app-bg">

      {/* PROFESSIONAL NAV */}
      <nav className="max-w-[1280px] mx-auto flex items-center justify-between gap-3 mb-6 print:hidden">
        <div className="flex items-center gap-2">
          {config.logo ? <img src={config.logo} alt={config.name} className="h-8" /> : <ChefHat className="text-app-accent" size={24} />}
          <h1 className="font-black text-lg uppercase tracking-tight text-app-text">
            {config.name} <span className="text-app-muted font-light">{config.subTitle}</span>
          </h1>
        </div>

        <div className="flex items-center bg-app-surface border border-app-border rounded-lg p-1 gap-1">
          <button onClick={() => setView('scaler')} className={`flex items-center gap-2 px-6 py-2.5 font-bold uppercase text-[10px] rounded transition-colors ${view === 'scaler' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <Scale size={14} /> Scaler
          </button>
          <button onClick={() => setView('ordering')} className={`flex items-center gap-2 px-6 py-2.5 font-bold uppercase text-[10px] rounded transition-colors ${view === 'ordering' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <ShoppingCart size={14} /> Market
          </button>
          <button onClick={() => setView('board')} className={`flex items-center gap-2 px-6 py-2.5 font-bold uppercase text-[10px] rounded transition-colors ${view === 'board' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <ClipboardCheck size={14} /> Board
          </button>
          <button onClick={() => setView('presentation')} className={`flex items-center gap-2 px-6 py-2.5 font-bold uppercase text-[10px] rounded transition-colors ${view === 'presentation' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <LayoutDashboard size={14} /> Presentation
          </button>
          <button onClick={() => setView('settings')} className={`flex items-center gap-2 px-6 py-2.5 font-bold uppercase text-[10px] rounded transition-colors ${view === 'settings' ? 'bg-app-accent text-app-bg' : 'text-app-muted hover:text-app-text'}`}>
            <SettingsIcon size={14} /> Master Rules
          </button>
        </div>

        <div className="flex bg-app-surface border border-app-border rounded-lg p-1 gap-1">
          <button
            onClick={() => setPortionMode(!portionMode)}
            className={`flex items-center gap-2 px-4 py-1.5 min-w-[140px] justify-center text-[10px] font-black uppercase rounded transition-all border ${portionMode ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20' : 'bg-app-surface text-app-accent border-app-border'}`}
          >
            {portionMode ? <Utensils size={14} /> : <Beef size={14} />}
            {portionMode ? "Test (Portions)" : "Production Mode"}
          </button>
        </div>
      </nav>

      <div className="max-w-[1280px] mx-auto">
        {view === 'presentation' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
            <Suspense fallback={<div className="h-[600px] flex items-center justify-center bg-app-surface border border-app-border rounded-xl">Loading Presentation Core...</div>}>
              {activeRecipe ? (
                <CinematicSOP
                  clientId={clientSlug || 'kabile'}
                  initialDishName={activeRecipe.name}
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
                      <Scale size={14} /> Master Portion Weights (Standard)
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between p-6 bg-app-bg border border-app-border rounded-xl relative overflow-hidden group">
                        <div className="relative z-10">
                          <p className="text-xs font-black text-app-text uppercase">Main Dish Portion</p>
                          <p className="text-[8px] text-app-muted uppercase font-bold">Standard Weight (g/ml)</p>
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                          <input
                            type="number"
                            value={mainPortionSize}
                            onChange={(e) => setMainPortionSize(parseInt(e.target.value) || 0)}
                            className="bg-app-surface border border-app-border rounded p-2 w-20 text-right font-black text-2xl text-app-accent outline-none focus:border-app-accent"
                          />
                          <span className="text-[10px] font-black text-app-muted">G</span>
                        </div>
                        <Beef className="absolute -bottom-2 -right-2 text-app-accent/5" size={80} />
                      </div>

                      <div className="flex items-center justify-between p-6 bg-app-bg border border-app-border rounded-xl relative overflow-hidden group">
                        <div className="relative z-10">
                          <p className="text-xs font-black text-app-text uppercase">Batch Size (Standard)</p>
                          <p className="text-[8px] text-app-muted uppercase font-bold">Portions per Batch</p>
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                          <input
                            type="number"
                            value={portionsPerBatch}
                            onChange={(e) => setPortionsPerBatch(parseInt(e.target.value) || 0)}
                            className="bg-app-surface border border-app-border rounded p-2 w-20 text-right font-black text-2xl text-app-accent outline-none focus:border-app-accent"
                          />
                          <span className="text-[10px] font-black text-app-muted">PORTIONS</span>
                        </div>
                        <Package className="absolute -bottom-2 -right-2 text-app-accent/5" size={80} />
                      </div>

                      <div className="flex items-center justify-between p-6 bg-app-bg border border-app-border rounded-xl relative overflow-hidden group">
                        <div className="relative z-10">
                          <p className="text-xs font-black text-app-text uppercase">Side Dish Portion</p>
                          <p className="text-[8px] text-app-muted uppercase font-bold">Heuristic Weight (g/ml)</p>
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                          <input
                            type="number"
                            value={sidePortionSize}
                            onChange={(e) => setSidePortionSize(parseInt(e.target.value) || 0)}
                            className="bg-app-surface border border-app-border rounded p-2 w-20 text-right font-black text-2xl text-app-accent outline-none focus:border-app-accent"
                          />
                          <span className="text-[10px] font-black text-app-muted">G</span>
                        </div>
                        <Wind className="absolute -bottom-2 -right-2 text-app-accent/5" size={80} />
                      </div>

                      <div className="flex items-center justify-between p-6 bg-app-bg border border-app-border rounded-xl relative overflow-hidden group">
                        <div className="relative z-10">
                          <p className="text-xs font-black text-app-text uppercase">Starter Dish Portion</p>
                          <p className="text-[8px] text-app-muted uppercase font-bold">Standard Weight (g/ml)</p>
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                          <input
                            type="number"
                            value={starterPortionSize}
                            onChange={(e) => setStarterPortionSize(parseInt(e.target.value) || 0)}
                            className="bg-app-surface border border-app-border rounded p-2 w-20 text-right font-black text-2xl text-app-accent outline-none focus:border-app-accent"
                          />
                          <span className="text-[10px] font-black text-app-muted">G</span>
                        </div>
                        <Utensils className="absolute -bottom-2 -right-2 text-app-accent/5" size={80} />
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-app-muted uppercase italic bg-app-accent/5 p-3 rounded-lg border border-app-accent/10">
                      Note: These weights are used globally to calculate portion counts from total production yields.
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

        {view === 'board' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Suspense fallback={<div className="h-[600px] flex items-center justify-center bg-app-surface border border-app-border rounded-xl">Loading Command Board...</div>}>
              <CommandBoard
                clientId={clientSlug || 'kabile'}
                onExit={() => setView('scaler')}
                productionTargets={activeDemand}
                recipes={recipes.filter(r => r.show_on_board && !r.is_deleted)}
              />
            </Suspense>
          </div>
        )}

        {view === 'scaler' && (
          <div className="space-y-4 animate-in fade-in duration-500">

            {/* NEW TOP TOOLBAR: Search & Global Utility */}
            <div className="flex items-center justify-between gap-4 bg-app-surface border border-app-border p-3 rounded-lg shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                <input
                  type="text"
                  placeholder="Professional Search (Name, Cuisine, Occasion...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-lg pl-10 pr-4 py-2 text-sm font-medium outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                {isEditMode && (
                  <button
                    onClick={async () => {
                      await handleUpdateRecipe();
                      setIsEditMode(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-app-accent text-app-bg hover:brightness-110 rounded-lg text-[10px] font-black uppercase transition-all shadow-lg shadow-app-accent/20 border border-app-accent"
                  >
                    <Save size={12} /> SAVE TEMPLATE
                  </button>
                )}
                <button
                  onClick={() => setShowDeleted(!showDeleted)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all border ${showDeleted ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20' : 'bg-app-bg text-app-muted border-app-border hover:border-app-muted'}`}
                >
                  {showDeleted ? <Undo2 size={14} /> : <Trash2 size={14} />}
                  {showDeleted ? "Back to Library" : "Restore Bin"}
                </button>
              </div>
            </div>

            {/* HIGH-DENSITY HEADER: Inline Title & Scale */}
            {filteredRecipesList.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_auto] divide-x divide-app-border relative shadow-sm">


                  {/* SELECTOR & STRATEGY MINI */}
                  <div className="p-4 flex items-center gap-4 min-w-0">
                    <div className="bg-app-accent/10 p-3 rounded-xl text-app-accent shrink-0 border border-app-accent/20">
                      <ChefHat size={24} />
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <div className="relative flex-1">
                          {isEditMode ? (
                            <input
                              className="w-full bg-app-bg border border-app-accent/20 font-black text-2xl text-app-text outline-none px-2 py-1 rounded-lg focus:border-app-accent"
                              value={activeRecipe.name}
                              onChange={(e) => updateActiveRecipeLocal({ name: e.target.value })}
                              placeholder="Recipe Name"
                            />
                          ) : (
                            <>
                              <select
                                value={selectedId}
                                onChange={(e) => { setSelectedId(e.target.value); setCheckedItems({}); }}
                                className="w-full appearance-none bg-transparent font-black text-2xl text-app-text outline-none cursor-pointer pr-8 hover:text-app-accent transition-colors py-1"
                              >
                                {groupedRecipes.map(([groupLabel, items]) => (
                                  <optgroup key={groupLabel} label={groupLabel} className="bg-app-surface text-app-muted text-[10px] uppercase font-black">
                                    {items.map(r => {
                                      const cleanName = translateIngredient(r.name).replace(/^\d+[\s.\-_]*/, '');
                                      return (
                                        <option key={r.id} value={r.id} className="text-app-text text-base font-bold">
                                          {cleanName}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-app-text" size={20} />
                            </>
                          )}
                        </div>

                        {/* ACTIONS MOVED HERE */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!showDeleted ? (
                            <>
                              <button
                                onClick={() => handleSoftDelete(activeRecipe.id)}
                                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-xs font-black uppercase transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestore(activeRecipe.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white hover:brightness-110 rounded-lg text-xs font-black uppercase transition-all shadow-lg shadow-green-500/20"
                            >
                              <Undo2 size={14} /> Restore Recipe
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-app-bg px-2 py-0.5 rounded border border-app-border">
                          <input
                            type="checkbox"
                            id="show-on-board-top"
                            checked={activeRecipe.show_on_board}
                            onChange={(e) => updateActiveRecipeLocal({ show_on_board: e.target.checked })}
                            className="accent-app-accent"
                          />
                          <label htmlFor="show-on-board-top" className="text-[9px] font-black uppercase text-app-muted cursor-pointer">Live on Board</label>
                        </div>
                        <span className="text-[10px] font-black text-app-muted uppercase tracking-widest bg-app-bg/50 px-2 py-0.5 rounded">{activeRecipe.tier}</span>
                        <span className="text-[10px] font-black text-app-accent uppercase tracking-widest">{activeRecipe.dishStyle || 'Production'}</span>

                        <div className="flex items-center gap-1.5 bg-app-bg px-2 py-0.5 rounded border border-app-border">
                          <Globe size={10} className="text-blue-400" />
                          {isEditMode ? (
                            <input
                              className="bg-transparent border-none outline-none text-[10px] font-black text-blue-400 uppercase tracking-widest w-24 focus:ring-0"
                              value={activeRecipe.cuisine || ''}
                              onChange={(e) => updateActiveRecipeLocal({ cuisine: e.target.value })}
                              placeholder="ADD CUISINE"
                            />
                          ) : (
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                              {activeRecipe.cuisine || 'No Cuisine'}
                            </span>
                          )}
                        </div>

                        {isEditMode && (
                          <div className="flex items-center gap-1.5 bg-app-bg px-2 py-0.5 rounded border border-amber-400/30">
                            <Tag size={10} className="text-amber-400" />
                            <input
                              className="bg-transparent border-none outline-none text-[10px] font-black text-amber-400 uppercase tracking-widest w-24 focus:ring-0"
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
                  <div className="flex items-center gap-6 px-6 bg-app-surface/50 print:hidden">
                    <div className="text-center">
                      <label className="block text-[8px] font-black uppercase text-app-muted mb-1 tracking-tighter">
                        {portionMode ? "Target Portions" : "Target Batches"}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={portionMode ? "1" : "0.1"}
                          min="0"
                          value={
                            planIntent[selectedId]?.mode === (portionMode ? 'portion' : 'batch')
                              ? planIntent[selectedId].val
                              : (portionMode
                                ? currentPortionCount
                                : Number((currentYieldValue / standardBatchYield).toFixed(2)))
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (portionMode) {
                              handleUpdateTarget(selectedId, val, 'portion');
                            } else {
                              // In Production Mode, input is 'batches' — store directly as batch mode
                              handleUpdateTarget(selectedId, val, 'batch');
                            }
                          }}
                          className={`w-20 bg-app-bg border border-app-border rounded px-2 py-1 font-black text-2xl text-center outline-none focus:ring-1 ${portionMode ? 'text-amber-500 focus:ring-amber-500' : 'text-app-accent focus:ring-app-accent'}`}
                        />
                        <div className="text-left">
                          <span className="block font-bold text-[10px] text-app-muted uppercase leading-none">
                            {portionMode ? "PPL" : "BATCHES"}
                          </span>
                          {!portionMode && (
                            <span className="text-[10px] font-black text-app-accent">
                              {formatDisplay(currentYieldValue, activeRecipe.unit).v} {formatDisplay(currentYieldValue, activeRecipe.unit).u}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Kitchen Intelligence Display */}
                    <div className="flex flex-col justify-center border-l border-app-border pl-6">
                      <div className="flex items-center gap-2">
                        <Scale size={12} className="text-app-accent opacity-50" />
                        <div className="text-[14px] font-black text-app-text uppercase">
                          TOTAL WEIGHT: {totalWeightForActive.v} <span className="text-app-accent">{totalWeightForActive.u}</span>
                          <span className="block text-[10px] text-app-accent mt-0.5">
                            {['base', 'stock', 'prep'].includes((activeRecipe.dishStyle || '').toLowerCase())
                              ? `Batch Size: ${formatDisplay(currentYieldValue, activeRecipe.unit).v} ${formatDisplay(currentYieldValue, activeRecipe.unit).u}`
                              : `Target Yield: ${currentPortionCount} portions`}
                          </span>
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-app-muted uppercase tracking-tight leading-tight">
                        Standard Batch Size: <span className="text-white">{formatDisplay(standardBatchYield, activeRecipe.unit).v} {formatDisplay(standardBatchYield, activeRecipe.unit).u}</span>
                        <span className="text-app-accent ml-1 block mt-0.5">
                          {['prep', 'base', 'stock'].includes((activeRecipe.dishStyle || activeRecipe.style || '').toLowerCase())
                            ? '(Base Yield for ' + portionsPerBatch + ' portions)'
                            : `(${portionsPerBatch} portions @ ${formatDisplay(getPortionWeight(activeRecipe), 'g').v}${formatDisplay(getPortionWeight(activeRecipe), 'g').u}/per portion)`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 ml-auto">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const reset = {};
                            recipes.forEach(r => reset[r.id] = { val: r.baseYield || 1, mode: 'weight' });
                            setPlanIntent(reset);
                          }}
                          className={`${Math.abs(currentYieldValue - (activeRecipe?.baseYield || 1)) > 0.01 ? 'bg-amber-500 shadow-amber-500/20' : 'bg-app-accent shadow-app-accent/20'} text-app-bg hover:scale-105 active:scale-95 shadow-lg text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-2`}
                        >
                          <RotateCcw size={14} /> DEFAULT ALL
                        </button>
                        {Math.abs(currentYieldValue - (activeRecipe?.baseYield || 1)) <= 0.01 && !isEditMode && (
                          <button
                            onClick={() => setIsEditMode(true)}
                            className="bg-app-accent text-app-bg hover:scale-105 active:scale-95 shadow-lg shadow-app-accent/20 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                          >
                            <Pencil size={14} /> EDIT RECIPE
                          </button>
                        )}

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
                          className="bg-app-accent/10 border border-app-accent/20 hover:bg-app-accent hover:text-app-bg text-[8px] font-black uppercase px-2 py-1 rounded transition-all text-app-accent"
                        >
                          Apply All
                        </button>
                      </div>
                      <button onClick={handleRoundAndFix} className="bg-app-success text-white hover:bg-green-700 px-3 py-1 rounded font-black uppercase text-[9px] flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-app-success/10">
                        <Zap size={10} /> Fix
                      </button>
                    </div>
                  </div>
                </div>

                {/* INTEGRATED INGREDIENT BOX (Wrapped Grid, No Scroll) */}
                <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
                  <div className="bg-app-bg px-4 py-2.5 border-b border-app-border flex justify-between items-center">
                    <h4 className="font-black uppercase text-[10px] tracking-widest flex items-center gap-2 text-app-muted">
                      <Scale size={14} className="text-app-accent" />
                      Production Scaling
                      <span className="font-normal lowercase ml-1">(x{((currentYieldValue / (activeRecipe.baseYield || 1)) || 0).toFixed(1)} batches)</span>
                    </h4>
                    <div className="flex gap-6 text-[10px] font-black uppercase text-app-muted tracking-widest">
                      <span className="flex items-center gap-1.5"><Package size={12} className="text-app-accent" /> P: {activeRecipe.prepTime || 'N/A'}</span>
                      <span className="flex items-center gap-1.5"><Zap size={12} className="text-app-accent" /> C: {activeRecipe.cookTime || 'N/A'}</span>
                    </div>
                  </div>

                  {/* WRAPPED GRID CONTAINER */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 p-4 gap-6">
                    {Object.entries(
                      activeRecipe.ingredients.reduce((acc, ing) => {
                        let cat = (ing.category || ing.cat || 'other').toUpperCase();
                        // PAIRING LOGIC: Combine Wet & Liquid for physical prep container sharing
                        if (cat === 'WET' || cat === 'LIQUID') cat = 'WET / LIQUID';

                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(ing);
                        return acc;
                      }, {})
                    ).sort((a, b) => {
                      // Put Wet/Liquid first as they are the most common mixables
                      if (a[0] === 'WET / LIQUID') return -1;
                      if (b[0] === 'WET / LIQUID') return 1;
                      return a[0].localeCompare(b[0]);
                    }).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <h5 className={`text-[10px] font-black uppercase px-2 py-1 rounded inline-block tracking-tighter mb-1 border ${category === 'WET / LIQUID' ? 'bg-app-accent/20 border-app-accent text-app-text font-black scale-105 transform origin-left' : 'bg-app-accent/5 border-app-accent/10 text-app-accent'}`}>
                          {category}
                          {category === 'WET / LIQUID' && <span className="ml-2 text-[8px] font-normal opacity-70">(Mix in same container)</span>}
                        </h5>
                        <div className="space-y-1">
                          {items.map((ing) => {
                            const idx = activeRecipe.ingredients.indexOf(ing);
                            const factor = currentYieldValue / activeRecipe.baseYield;
                            const isChecked = checkedItems[idx];

                            // SPECIAL SCALING LOGIC: Kimchi Cabbage vs Paste Ratio
                            // If Kimchi (prep/side), ensure paste follows cabbage usage
                            let scaledVal = ing.qty * factor;
                            if (activeRecipe.id === 'kimchi' && ing.name.toLowerCase().includes('cabbage')) {
                              // Cabbage is the lead; paste should scale to it
                              scaledVal = ing.qty * factor;
                            } else if (activeRecipe.id === 'kimchi' && ing.category?.toLowerCase() === 'paste') {
                              // Paste ratio calculation (approx 20% of cabbage weight)
                              // In the seed, 12kg cabbage matches 2kg paste (2/12 = 16.6%)
                              // We use intelligent scaling based on the base recipe ratio
                              const cabbageIng = activeRecipe.ingredients.find(i => i.name.toLowerCase().includes('cabbage'));
                              if (cabbageIng) {
                                const baseRatio = ing.qty / cabbageIng.qty;
                                const currentCabbageQty = cabbageIng.qty * factor;
                                scaledVal = currentCabbageQty * baseRatio;
                              }
                            }

                            const isInteger = Math.abs(scaledVal - Math.round(scaledVal)) < 0.01;
                            const isMain = ing.isMain;
                            const isEditing = editingIngId === idx;

                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (!isMain || isEditing) return;
                                  setCheckedItems({ ...checkedItems, [idx]: !isChecked });
                                }}
                                className={`flex items-center justify-between p-2 rounded border transition-all ${isMain ? 'border-l-4 border-l-app-accent ring-1 ring-app-accent/10' : ''} ${isChecked ? 'bg-app-success/5 border-app-success/20 opacity-40' : 'bg-app-bg border-app-border'} ${isMain && !isChecked ? 'hover:border-app-accent' : ''}`}
                              >
                                <div className="flex items-center gap-2 min-w-0" onClick={(e) => {
                                  if (isMain && !isChecked) {
                                    e.stopPropagation();
                                    setEditingIngId(idx);
                                  } else {
                                    setCheckedItems({ ...checkedItems, [idx]: !isChecked });
                                  }
                                }}>
                                  <div className={`w-3 h-3 rounded flex items-center justify-center border ${isChecked ? 'bg-app-success border-app-success text-white' : 'border-app-border bg-app-surface'}`}>
                                    {isChecked && <Check size={8} strokeWidth={4} />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {isEditMode ? (
                                      <>
                                        <input
                                          className={`w-full bg-app-bg border border-app-accent/20 outline-none text-[11px] font-bold leading-tight ${isChecked ? 'line-through text-app-muted' : 'text-app-text'} rounded px-1 transition-all focus:border-app-accent ${Math.abs(currentYieldValue - activeRecipe.baseYield) > 0.01 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                          value={translateIngredient(ing.name)}
                                          onChange={(e) => updateIngredientLocal(idx, { name: e.target.value })}
                                          onClick={(e) => e.stopPropagation()}
                                          disabled={Math.abs(currentYieldValue - activeRecipe.baseYield) > 0.01}
                                          title={Math.abs(currentYieldValue - activeRecipe.baseYield) > 0.01 ? 'Reset to Default (Original) to edit master template' : ''}
                                        />
                                        <input
                                          className={`w-full bg-app-bg border border-app-accent/10 outline-none text-[8px] text-app-muted uppercase font-medium mt-1 rounded px-1 transition-all focus:border-app-accent ${Math.abs(currentYieldValue - activeRecipe.baseYield) > 0.01 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                          value={ing.sku || ''}
                                          onChange={(e) => updateIngredientLocal(idx, { sku: e.target.value })}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="ADD SKU/NOTE"
                                          disabled={Math.abs(currentYieldValue - activeRecipe.baseYield) > 0.01}
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <p className={`text-[11px] font-bold leading-tight ${isChecked ? 'line-through text-app-muted' : 'text-app-text'}`}>
                                          {translateIngredient(ing.name)} {isMain && <span className="text-[7px] bg-app-accent/20 text-app-accent px-1 rounded ml-1">MAIN</span>}
                                        </p>
                                        <p className="text-[8px] text-app-muted uppercase font-medium">{ing.sku}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {isEditMode ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <input
                                        type="number"
                                        step="0.01"
                                        className={`w-16 bg-app-bg border border-app-accent/30 text-app-text font-black text-right px-1 py-0.5 rounded outline-none focus:border-app-accent transition-all ${Math.abs(currentYieldValue - activeRecipe.baseYield) > 0.01 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        value={ing.qty !== undefined && ing.qty !== null ? ing.qty : ""}
                                        onChange={(e) => updateIngredientLocal(idx, { qty: parseFloat(e.target.value) || 0 })}
                                        disabled={Math.abs(currentYieldValue - activeRecipe.baseYield) > 0.01}
                                        placeholder="0"
                                      />
                                    </div>
                                  ) : (
                                    <span
                                      className={`text-[14px] font-black tabular-nums transition-all ${isChecked ? 'text-app-muted' : isInteger ? 'text-app-accent' : 'text-app-text'}`}
                                    >
                                      {formatDisplay(scaledVal, ing.unit).v}
                                    </span>
                                  )}
                                  <span className="text-[8px] font-bold text-app-muted uppercase ml-1">
                                    {isEditMode ? ing.unit : formatDisplay(scaledVal, ing.unit).u}
                                  </span>
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
                  {activeRecipe.note && activeRecipe.note !== 'No operational notes provided.' && (
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                      {(isBulkMode && activeRecipe.bulkMethod ? activeRecipe.bulkMethod : activeRecipe.method).map((step, i) => (
                        <div key={i} className="flex gap-3 text-[11px] font-medium leading-relaxed text-app-text">
                          <span className="font-bold text-app-accent bg-app-accent/10 rounded-full shrink-0 w-5 h-5 flex items-center justify-center text-[10px]">{i + 1}</span>
                          <span className="pt-0.5">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SCALING ADVICE */}
                  <div className="md:col-span-4 p-4 bg-app-surface border border-app-border rounded-lg">
                    <div className="flex gap-2 items-center mb-3 font-black text-[10px] uppercase text-app-accent tracking-widest border-b border-app-border/50 pb-2">
                      <Scale size={14} /> Scaling Intel
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[8px] font-black uppercase text-app-muted mb-1">Regular</p>
                        <p className="text-[10px] text-app-text leading-tight italic">"{activeRecipe.scalingTips?.regular || "Maintain standard ratios."}"</p>
                      </div>
                      {isBulkMode && (
                        <div className="animate-in slide-in-from-right duration-500 border-l-2 border-amber-500 pl-3">
                          <p className="text-[8px] font-black uppercase text-amber-500 mb-1">Bulk Warning</p>
                          <p className="text-[10px] font-bold text-app-text leading-tight italic">"{activeRecipe.scalingTips?.largeScale || "Monitor heat levels."}"</p>
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
                      <LayoutDashboard size={18} /> {portionMode ? "Tester Target List" : "Daily Production List"}
                    </h2>
                    <button
                      onClick={() => {
                        setPlanIntent({});
                      }}
                      className="text-[10px] font-bold bg-app-danger/10 text-app-danger px-3 py-1.5 rounded uppercase flex items-center gap-2 hover:bg-app-danger/20 transition-colors border border-app-danger/20"
                    >
                      <Trash2 size={14} /> Clear
                    </button>
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
                    <div key={recipe.id} className="flex items-center gap-4 bg-app-bg rounded-md p-4 border border-app-border hover:border-app-muted transition-colors group">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-app-text mb-1">
                          {translateIngredient(recipe.name).replace(/^\d+[\s.\-_]*/, '')}
                        </div>
                        <div className="text-[10px] font-bold text-app-muted uppercase tracking-wider">{recipe.tier}</div>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step={portionMode ? "1" : "0.1"}
                          value={planIntent[recipe.id]?.val ?? ""}
                          placeholder={portionMode
                            ? Math.round(activeNodes[recipe.id]?.portions || (recipe.baseYield / Math.max(0.001, getPortionWeight(recipe))))
                            : (activeNodes[recipe.id]?.scale || 1.0).toFixed(1)
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
                          className={`w-24 bg-app-surface border border-app-border rounded px-3 py-1.5 font-bold text-right text-lg outline-none focus:ring-1 ${portionMode ? 'text-amber-500 focus:border-amber-500 focus:ring-amber-500' : 'text-app-accent focus:border-app-accent focus:ring-app-accent'} placeholder:text-app-muted/30`}
                        />
                        <div className="absolute -top-2.5 -right-2 bg-app-surface text-app-muted text-[9px] font-bold px-1.5 py-0.5 border border-app-border rounded uppercase">
                          {portionMode ? "ppl" : "batches"}
                        </div>
                        {/* COMPUTER INDICATOR */}
                        {(() => {
                          const node = activeNodes[recipe.id];
                          if (!node || node.scale <= 0) return null;
                          const intent = planIntent[recipe.id];
                          const manualVal = parseFloat(intent?.val) || 0;

                          // Compare in the correct unit context
                          const isUnderPlanned = portionMode
                            ? (node.portions > (manualVal + 0.05))
                            : (node.scale > (manualVal + 0.01));

                          if (!isUnderPlanned) return null;

                          return (
                            <div className={`absolute top-[105%] right-0 flex items-center gap-1 text-[9px] font-black uppercase bg-app-bg px-2 py-0.5 rounded border shadow-md whitespace-nowrap z-20 ${portionMode ? 'text-amber-500 border-amber-500/30' : 'text-app-accent border-app-accent/30'}`}>
                              <Zap size={10} fill="currentColor" /> Suggested: {portionMode
                                ? `${Math.round(node.portions)} ppl`
                                : `${node.scale.toFixed(1)} bth`}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CONSOLIDATED MARKET LIST */}
            <section className="lg:col-span-7 bg-app-surface border border-app-border rounded-lg flex flex-col min-h-[600px] overflow-hidden">
              <div className="bg-app-accent text-app-bg px-6 py-5 flex justify-between items-center border-b border-app-border">
                <h2 className="font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                  <ShoppingCart size={18} /> Aggregated Order
                  {portionMode && <span className="ml-2 bg-app-bg text-amber-500 text-[10px] px-2 py-0.5 rounded border border-amber-500/50 uppercase">Test Mode</span>}
                </h2>
                {Object.keys(activeOrigins).length > 0 && (
                  <div className="flex gap-2 mr-auto ml-4 max-w-[40%] overflow-x-auto no-scroll pb-1">
                    {Object.entries(activeOrigins).map(([id, val]) => {
                      const r = recipes.find(rec => rec.id === id);
                      if (!r) return null;
                      const pSize = getPortionSize(r) || 1;
                      const pCount = Math.round(val * (r.baseYieldPortions || 1));
                      return (
                        <div key={id} className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold whitespace-nowrap ${portionMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-app-accent/10 border-app-accent/30 text-app-accent'}`}>
                          <span>{r.name.split(' ').slice(0, 2).join(' ')}</span>
                          <span className="opacity-50">|</span>
                          <span>{portionMode ? `${pCount} ppl` : formatDisplay(val, r.unit).v + formatDisplay(val, r.unit).u}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => {
                  let csv = "CATEGORY,ITEM,STOCK_REQUIRED,UNIT\n";
                  Object.entries(aggregatedOrder).forEach(([cat, items]) => {
                    items.forEach(i => {
                      const { val: v, unit: u } = formatQuantity(i.qty, i.unit);
                      csv += `${translateIngredient(cat)},${translateIngredient(i.name)},${v},${u}\n`;
                    });
                  });
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `market_order.csv`; a.click();
                }} className="bg-app-bg/20 hover:bg-app-bg/30 p-2 rounded transition-colors text-app-bg">
                  <FileSpreadsheet size={18} />
                </button>
              </div>
              <div className="p-0 flex-1 overflow-y-auto max-h-[700px] custom-scroll">
                {Object.keys(aggregatedOrder).length === 0 ? (
                  <div className="p-20 flex flex-col items-center justify-center h-full text-center">
                    <Package size={48} className="text-app-border mb-4" />
                    <div className="text-app-muted font-bold text-lg mb-2">No Active Targets</div>
                    <p className="text-xs text-app-muted max-w-[250px]">Input daily production targets on the left to calculate required stock quantities.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-app-border">
                      {Object.entries(aggregatedOrder).map(([cat, items]) => (
                        <React.Fragment key={cat}>
                          <tr className="bg-app-bg"><td colSpan="2" className="px-6 py-2 border-y border-app-border"><span className="text-[10px] font-bold uppercase text-app-muted tracking-widest flex items-center gap-2"><Tag size={10} /> {translateIngredient(cat)}</span></td></tr>
                          {items.map((item, i) => (
                            <tr key={i} className="hover:bg-app-bg transition-colors">
                              <td className="px-6 py-4 font-medium text-[15px] text-app-text">{translateIngredient(item.name)}</td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
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
