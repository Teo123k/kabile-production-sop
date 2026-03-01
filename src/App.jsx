import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import CinematicSOP from './CinematicSOP';
import CommandBoard from './CommandBoard';
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
  Gauge
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
    coreGetPortionWeight(recipe, coreSettings)
    , [coreSettings]);

  const getPortionSize = useCallback((recipe) =>
    coreGetPortionSize(recipe, coreSettings)
    , [coreSettings]);


  // SHARED STATE: Initialized with Base Yields
  const [dailyProduction, setDailyProduction] = useState({});


  // Fetch Recipes from Supabase with Rich Data Merging
  useEffect(() => {
    async function getRecipes() {
      setLoading(true);
      try {
        // Fetch from multiple tables to extract the richest possible operational data
        const [recipeRes, legacyRes] = await Promise.all([
          supabase.from('sop_recipes').select('*').eq('client_id', clientSlug || 'kabile'),
          supabase.from('consulting_sops').select('*').eq('client_id', clientSlug || 'kabile')
        ]);

        const normalize = (s) => (s || '').toLowerCase().trim().replace(/^\d+[\s.\-_]*/, '').replace(/[\s\-_]/g, '');

        let baseData = recipeRes.data || [];
        if (baseData.length === 0) {
          baseData = legacyRes.data || [];
        }

        const parsed = baseData.map(row => {
          // Find the underlying legacy row to extract the rich strategy JSON
          const normName = normalize(row.recipe_name || row.dish_name);
          const legacyMatch = (legacyRes.data || []).find(l =>
            normalize(l.dish_name) === normName ||
            normalize(l.recipe_json?.id) === normalize(row.recipe_id)
          );

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
            production_batch_size: row.production_batch_size || null
          };
        });

        setRecipes(parsed);
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
      const initialDemand = calculateBOM(recipes, volumeFocus, menuMix, getPortionSize);
      setDailyProduction(initialDemand);
    }
  }, [recipes]);

  // Apply Static Theme & Dynamic Brand Colors
  useEffect(() => {
    document.documentElement.style.setProperty('--app-accent', config.accentColor);
    document.documentElement.style.setProperty('--app-accent-hover', `${config.accentColor}dd`);
  }, [config]);

  // Reactive Sync: Update yields when Master Rules (Volume/Mix/Portion) change
  useEffect(() => {
    if (recipes.length === 0) return;
    const updatedDemand = calculateBOM(recipes, volumeFocus, menuMix, getPortionSize);
    setDailyProduction(updatedDemand);
  }, [volumeFocus, menuMix, mainPortionSize, sidePortionSize, starterPortionSize]);

  // CALCULATE BOM EXPLOSION
  const explodedTargets = useMemo(() => {
    // dailyProduction holds the current state overrides.
    // To ensure recursive rules ALWAYS apply if a user manually changes "magic soy" top level demand,
    // we pass the entire updated dailyProduction through a secondary BOM cascade if needed.
    // But for now, dailyProduction ALREADY contains the exploded values initialized by Settings.
    return dailyProduction;
  }, [dailyProduction]);

  const activeRecipe = useMemo(() =>
    recipes.find(r => r.id === selectedId) || recipes[0],
    [selectedId, recipes]);

  const currentYieldValue = activeRecipe ? dailyProduction[selectedId] : 0;

  const currentPortionCount = useMemo(() => {
    if (!activeRecipe) return 0;
    const pSize = getPortionSize(activeRecipe);
    if (!pSize || pSize === 0) return 0;
    return Math.round(currentYieldValue / pSize);
  }, [currentYieldValue, activeRecipe, getPortionSize]);

  const standardBatchYield = useMemo(() => {
    if (!activeRecipe) return 0;
    const style = (activeRecipe.dishStyle || activeRecipe.style || '').toLowerCase();
    const cat = (activeRecipe.dishCategory || '').toLowerCase();
    const name = (activeRecipe.name || '').toLowerCase();
    const isPrep = ['prep', 'base', 'stock'].includes(style) || ['base', 'stock'].includes(cat) || name.includes('base');

    if (isPrep) {
      return parseFloat(activeRecipe.production_batch_size) || parseFloat(activeRecipe.baseYield) || 1;
    }
    return portionsPerBatch * getPortionSize(activeRecipe);
  }, [activeRecipe, portionsPerBatch, getPortionSize]);

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

    setDailyProduction({ ...dailyProduction, [selectedId]: Number(bestYield.toFixed(2)) });
  };

  const handleReverseScale = (ing, newQty) => {
    if (!activeRecipe || !newQty || newQty <= 0) return;
    // factor = newQty / baseQty
    const factor = newQty / ing.qty;
    const newYield = activeRecipe.baseYield * factor;
    setDailyProduction({ ...dailyProduction, [selectedId]: Number(newYield.toFixed(2)) });
    setEditingIngId(null);
  };

  const applyMultiplier = (m) => {
    const updated = { ...dailyProduction };
    Object.keys(updated).forEach(id => {
      // If currently zero, we default to 1 batch * m
      const current = updated[id] || 0;
      if (current === 0) {
        const r = recipes.find(rec => rec.id === id);
        if (r) updated[id] = Number((r.baseYield * m).toFixed(2));
      } else {
        updated[id] = Number((current * m).toFixed(2));
      }
    });
    setDailyProduction(updated);
  };




  // [LOCKED] CORE MARKET AGGREGATION ENGINE - DO NOT MODIFY
  // Handles recursive sub-recipes and unit normalization
  const aggregatedOrder = useMemo(() => {
    const totals = {};

    const processRecipe = (recipeId, yieldRequested, seen = new Set(), depth = 0) => {
      // Loop Protection & Zero Safety
      if (depth > 8 || seen.has(recipeId) || !yieldRequested || yieldRequested <= 0) return;
      seen.add(recipeId);

      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) return;

      const safeBaseYield = parseFloat(recipe.baseYield) || 1;

      recipe.ingredients.forEach(ing => {
        if (!ing) return;
        const subRecipeId = resolveRecipeIdBySku(ing.sku, recipes);
        let qtyToProcess = parseFloat(ing.qty) || 0;
        if (qtyToProcess <= 0) return;

        if (subRecipeId) {
          const subRecipe = recipes.find(r => r.id === subRecipeId);
          if (subRecipe) {
            const subUnit = (subRecipe.unit || '').toLowerCase();
            const reqUnit = (ing.unit || '').toLowerCase();
            const isSubMetric = subUnit === 'kg' || subUnit === 'l' || subUnit === 'liter' || subUnit === 'litre';
            const isReqSmall = reqUnit === 'g' || reqUnit === 'ml';

            if (isSubMetric && isReqSmall) {
              qtyToProcess /= 1000;
            }
          }
          const scaledSubYield = (qtyToProcess / safeBaseYield) * yieldRequested;
          processRecipe(subRecipeId, scaledSubYield, new Set(seen), depth + 1);
        } else {
          // Leaf ingredient aggregation
          let baseQty = qtyToProcess;
          let baseUnit = ing.unit || 'units';
          const u = baseUnit.toLowerCase();

          // Normalize ALL leaf ingredients to grams/ml
          if (u === 'kg') {
            baseQty *= 1000;
            baseUnit = 'g';
          } else if (u === 'l' || u === 'liter') {
            baseQty *= 1000;
            baseUnit = 'ml';
          }

          const scaledQty = (baseQty / safeBaseYield) * yieldRequested;
          const sku = ing.sku || `${ing.name.replace(/\s+/g, '-').toUpperCase()}-${baseUnit}`;

          if (!totals[sku]) {
            totals[sku] = { name: ing.name, cat: ing.cat || ing.category || 'other', qty: 0, unit: baseUnit };
          }
          totals[sku].qty += scaledQty;
        }
      });
    };

    Object.entries(dailyProduction).forEach(([recipeId, yieldRequested]) => {
      if (yieldRequested > 0) processRecipe(recipeId, yieldRequested);
    });

    const grouped = {};
    Object.values(totals).forEach(item => {
      const cat = item.cat || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  }, [dailyProduction, recipes]);


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

  if (!activeRecipe) return (
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
          <div className="animate-in zoom-in-95 duration-500">
            <CinematicSOP
              clientId={clientSlug || 'kabile'}
              initialDishName={activeRecipe?.name}
              onExit={() => setView('scaler')}
            />
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
            <CommandBoard
              clientId={clientSlug || 'kabile'}
              onExit={() => setView('scaler')}
              productionTargets={dailyProduction}
            />
          </div>
        )}

        {view === 'scaler' && (
          <div className="space-y-4 animate-in fade-in duration-500">

            {/* HIGH-DENSITY HEADER: Inline Title & Scale (Image Removed) */}
            <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_auto] divide-x divide-app-border">

              {/* SELECTOR & STRATEGY MINI */}
              <div className="p-3 flex items-center gap-4 min-w-0">
                <div className="bg-app-accent/10 p-2 rounded text-app-accent shrink-0">
                  <ChefHat size={16} />
                </div>
                <div className="relative flex-1 min-w-0">
                  <select
                    value={selectedId}
                    onChange={(e) => { setSelectedId(e.target.value); setCheckedItems({}); }}
                    className="w-full appearance-none bg-transparent font-black text-xl text-app-text outline-none cursor-pointer pr-8 truncate"
                  >
                    {Object.entries(
                      recipes.reduce((acc, r) => {
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
                      }, {})
                    ).sort((a, b) => {
                      // Custom sort for professional kitchen order
                      const order = ['Foundational Prep (Tier 1)', 'Marinades & Pre-Prep', 'Finishing Sauces', 'Main Dishes', 'Sides & Condiments'];
                      return order.indexOf(a[0]) - order.indexOf(b[0]);
                    }).map(([groupLabel, items]) => (
                      <optgroup key={groupLabel} label={groupLabel} className="bg-app-surface text-app-muted text-[10px] uppercase">
                        {items.map(r => {
                          const cleanName = translateIngredient(r.name).replace(/^\d+[\s.\-_]*/, '');
                          return (
                            <option key={r.id} value={r.id} className="text-app-text text-base">
                              {cleanName}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-app-text" size={16} />
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-black text-app-muted uppercase tracking-widest bg-app-bg px-2 py-0.5 rounded">{activeRecipe.tier}</span>
                    <span className="text-[10px] font-black text-app-accent uppercase tracking-widest">{activeRecipe.dishStyle || 'Production'}</span>
                  </div>
                </div>
              </div>

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
                      value={portionMode
                        ? currentPortionCount
                        : (currentYieldValue / standardBatchYield || 0).toFixed(1)
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (portionMode) {
                          const pSize = getPortionSize(activeRecipe);
                          if (activeRecipe.unit?.toLowerCase().includes('portion')) {
                            setDailyProduction({ ...dailyProduction, [selectedId]: val });
                          } else {
                            setDailyProduction({ ...dailyProduction, [selectedId]: Number((val * pSize).toFixed(2)) });
                          }
                        } else {
                          const requiredYield = val * standardBatchYield;
                          setDailyProduction({ ...dailyProduction, [selectedId]: Number(requiredYield.toFixed(2)) });
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
                      Yield Target: {formatDisplay(currentYieldValue, activeRecipe.unit).v} <span className="text-app-accent">{formatDisplay(currentYieldValue, activeRecipe.unit).u}</span>
                      {(activeRecipe.unit || '').toLowerCase().includes('portion') && (
                        <span className="block text-[10px] text-app-accent mt-0.5">Total weight: {totalWeightForActive.v}{totalWeightForActive.u}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[9px] font-bold text-app-muted uppercase tracking-tight leading-tight">
                    Standard Batch Size: <span className="text-white">{formatDisplay(standardBatchYield, activeRecipe.unit).v} {formatDisplay(standardBatchYield, activeRecipe.unit).u}</span>
                    <span className="text-app-accent ml-1 block mt-0.5">
                      {['prep', 'base', 'stock'].includes((activeRecipe.dishStyle || activeRecipe.style || '').toLowerCase())
                        ? '(Base Yield for 1 Standard Batch)'
                        : `(${portionsPerBatch} portions @ ${formatDisplay(getPortionWeight(activeRecipe), 'g').v}${formatDisplay(getPortionWeight(activeRecipe), 'g').u}/per portion)`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 ml-auto">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const baseYields = {};
                        recipes.forEach(r => baseYields[r.id] = (parseFloat(r.baseYield) || 1));
                        setDailyProduction(baseYields);
                      }}
                      className="bg-app-bg border border-app-border hover:border-app-accent text-[8px] font-black uppercase px-2 py-1 rounded transition-colors text-app-muted hover:text-app-text"
                    >
                      Default All
                    </button>
                    <button
                      onClick={() => {
                        const batch = {};
                        recipes.forEach(r => {
                          const style = (r.dishStyle || r.style || '').toLowerCase();
                          const cat = (r.dishCategory || '').toLowerCase();
                          const isPrep = ['prep', 'base', 'stock'].includes(style) || ['base', 'stock'].includes(cat);
                          if (isPrep) {
                            batch[r.id] = parseFloat(r.production_batch_size) || parseFloat(r.baseYield) || 1;
                          } else {
                            // If unit is Portion, getPortionSize returns 1, so target is portionsPerBatch count
                            // If unit is kg/g, getPortionSize returns grams, so target is total weight
                            batch[r.id] = portionsPerBatch * getPortionSize(r);
                          }
                        });
                        setDailyProduction(batch);
                      }}
                      className="bg-app-bg border border-app-border hover:border-app-accent/50 hover:text-app-accent text-[8px] font-black uppercase px-2 py-1 rounded transition-colors text-app-muted"
                    >
                      Batch All
                    </button>
                    <button
                      onClick={() => {
                        const allScaled = { ...dailyProduction };
                        const currentInputVal = portionMode
                          ? currentPortionCount
                          : (currentYieldValue / standardBatchYield || 0);

                        recipes.forEach(r => {
                          const style = (r.dishStyle || r.style || '').toLowerCase();
                          const cat = (r.dishCategory || '').toLowerCase();
                          const isPrep = ['prep', 'base', 'stock'].includes(style) || ['base', 'stock'].includes(cat);

                          if (portionMode) {
                            if (r.unit?.toLowerCase().includes('portion')) {
                              allScaled[r.id] = currentInputVal;
                            } else {
                              allScaled[r.id] = Number((currentInputVal * getPortionSize(r)).toFixed(2));
                            }
                          } else {
                            let thisStandardBatch = isPrep
                              ? (parseFloat(r.production_batch_size) || parseFloat(r.baseYield) || 1)
                              : (portionsPerBatch * getPortionSize(r));
                            allScaled[r.id] = Number((currentInputVal * thisStandardBatch).toFixed(2));
                          }
                        });
                        setDailyProduction(allScaled);
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
                  <span className="font-normal lowercase ml-1">(x{((currentYieldValue / (volumeFocus * getPortionSize(activeRecipe))) || 0).toFixed(1)} batches)</span>
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
                              <div className="min-w-0">
                                <p className={`text-[11px] font-bold leading-tight truncate ${isChecked ? 'line-through text-app-muted' : 'text-app-text'}`}>
                                  {translateIngredient(ing.name)} {isMain && <span className="text-[7px] bg-app-accent/20 text-app-accent px-1 rounded ml-1">MAIN</span>}
                                </p>
                                <p className="text-[8px] text-app-muted uppercase font-medium truncate">{ing.sku}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                              {isEditing ? (
                                <input
                                  autoFocus
                                  type="number"
                                  className="w-16 bg-app-accent text-app-bg font-black text-right px-1 rounded outline-none"
                                  onBlur={(e) => handleReverseScale(ing, parseFloat(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleReverseScale(ing, parseFloat(e.target.value));
                                    if (e.key === 'Escape') setEditingIngId(null);
                                  }}
                                />
                              ) : (
                                <span
                                  onClick={() => { if (isMain && !isChecked) setEditingIngId(idx); }}
                                  className={`text-[14px] font-black tabular-nums transition-all ${isChecked ? 'text-app-muted' : isInteger ? 'text-app-accent' : 'text-app-text'} ${isMain && !isChecked ? 'underline decoration-dotted cursor-pointer hover:scale-110' : ''}`}
                                >
                                  {formatDisplay(scaledVal, ing.unit).v}
                                </span>
                              )}
                              <span className="text-[8px] font-bold text-app-muted uppercase ml-1">{formatDisplay(scaledVal, ing.unit).u}</span>
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
                        const reset = {};
                        recipes.forEach(r => reset[r.id] = 0);
                        setDailyProduction(reset);
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
                          value={portionMode
                            ? (recipe.unit?.toLowerCase().includes('portion') ? Math.round(dailyProduction[recipe.id] || 0) : Math.round((dailyProduction[recipe.id] || 0) / getPortionSize(recipe)))
                            : formatDisplay(dailyProduction[recipe.id] || 0, recipe.unit).v
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (portionMode) {
                              const pSize = getPortionSize(recipe);
                              const finalPortions = val;
                              if (recipe.unit?.toLowerCase().includes('portion')) {
                                setDailyProduction({ ...dailyProduction, [recipe.id]: finalPortions });
                              } else {
                                setDailyProduction({ ...dailyProduction, [recipe.id]: Number((finalPortions * pSize).toFixed(2)) });
                              }
                            } else {
                              const { u } = formatDisplay(dailyProduction[recipe.id] || 0, recipe.unit);
                              let finalVal = val;
                              if ((u === 'kg' || u === 'L') && val < 500) { // If currently in kg/L mode, input is scaled (500 threshold to prevent loop if someone types 1000 in ml mode)
                                finalVal = val * 1000;
                              }
                              setDailyProduction({ ...dailyProduction, [recipe.id]: Number(finalVal.toFixed(2)) });
                            }
                          }}
                          className={`w-24 bg-app-surface border border-app-border rounded px-3 py-1.5 font-bold text-right text-lg outline-none focus:ring-1 ${portionMode ? 'text-amber-500 focus:border-amber-500 focus:ring-amber-500' : 'text-app-accent focus:border-app-accent focus:ring-app-accent'}`}
                        />
                        <div className="absolute -top-2.5 -right-2 bg-app-surface text-app-muted text-[9px] font-bold px-1.5 py-0.5 border border-app-border rounded uppercase">
                          {portionMode ? "ppl" : formatDisplay(dailyProduction[recipe.id] || 0, recipe.unit).u}
                        </div>
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
                  {portionMode && <span className="ml-2 bg-app-bg text-amber-500 text-[10px] px-2 py-0.5 rounded border border-amber-500/50">TEST MODE</span>}
                </h2>
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
