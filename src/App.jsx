import React, { useState, useMemo, useEffect } from 'react';
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
  Languages
} from 'lucide-react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { useSettings } from './SettingsContext';
import SettingsModal from './SettingsModal';

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

// MASTER_RECIPES removed - now fetched from Supabase

const SopMain = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('scaler');
  const [selectedId, setSelectedId] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const {
    language,
    unitSystem,
    volumeFocus,
    batchSettings,
    translateIngredient
  } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [portionMode, setPortionMode] = useState(false);
  const [editingIngId, setEditingIngId] = useState(null);

  const { clientSlug } = useParams();
  const config = CLIENT_CONFIGS[clientSlug] || CLIENT_CONFIGS['kabile'];

  // Fetch Recipes from Supabase
  useEffect(() => {
    async function getRecipes() {
      setLoading(true);
      const { data, error } = await supabase
        .from('consulting_sops')
        .select('*')
        .eq('client_id', clientSlug || 'kabile');

      if (error) {
        console.error('Error fetching recipes:', error);
      } else {
        const parsed = data.map(row => {
          const r = typeof row.recipe_json === 'string' ? JSON.parse(row.recipe_json) : row.recipe_json;
          return { ...r };
        });
        setRecipes(parsed);
        if (parsed.length > 0) {
          setSelectedId(parsed[0].id);
          const initYields = {};
          parsed.forEach(r => initYields[r.id] = r.baseYield);
          setDailyProduction(initYields);
        }
      }
      setLoading(false);
    }
    getRecipes();
  }, [clientSlug]);

  // Apply Static Theme & Dynamic Brand Colors
  useEffect(() => {
    // Branding is separate from Theme
    document.documentElement.style.setProperty('--app-accent', config.accentColor);
    document.documentElement.style.setProperty('--app-accent-hover', `${config.accentColor}dd`);
  }, [config]);

  // SHARED STATE: Initialized with Base Yields
  const [dailyProduction, setDailyProduction] = useState({});

  const activeRecipe = useMemo(() =>
    recipes.find(r => r.id === selectedId) || recipes[0],
    [selectedId, recipes]);

  const currentYieldValue = activeRecipe ? dailyProduction[selectedId] : 0;

  // PORTION LOGIC Helper: Intelligent weights based on dish style
  const getPortionSize = (recipe) => {
    if (!recipe) return 250;

    // 1. Database Override (Explicitly set by chef)
    if (recipe.portionSize) return recipe.portionSize;

    // 2. Unit Override (If unit is already in Portions)
    const unit = (recipe.unit || '').toLowerCase();
    if (unit.includes('portion')) return 1;

    // 3. Category & Style Intelligence
    const style = (recipe.dishStyle || recipe.style || '').toLowerCase();
    const cat = (recipe.dishCategory || '').toLowerCase();

    // Condiments / Coatings / Sauces (High concentration, small portions)
    if (['sauce', 'glaze', 'marinade', 'coating', 'paste', 'dip'].includes(style) ||
      ['condiment', 'sauce', 'pickle'].includes(cat)) {
      return 40; // 40g/ml standard for coatings/sauces
    }

    // Sides / Small Starters / Snacks
    if (['side', 'snack', 'vegetable_dish', 'appetizer'].includes(cat) ||
      ['steamed', 'raw'].includes(style)) {
      return 100; // 100g standard side
    }

    // Foundational Prep (Bulk batches)
    if (style === 'prep' || cat === 'base' || cat === 'stock') {
      return 1000; // 1kg foundational unit
    }

    // Default: Main Dish / Protein / Carbohydrate
    return 250; // 250g/ml standard main portion
  };

  const currentPortionCount = useMemo(() => {
    if (!activeRecipe) return 0;
    if (activeRecipe.unit?.toLowerCase().includes('portion')) return Math.round(currentYieldValue);
    return Math.round(currentYieldValue / getPortionSize(activeRecipe));
  }, [currentYieldValue, activeRecipe]);

  const isBulkMode = useMemo(() => {
    // Volume focus of 300 or 600+ automatically triggers bulk mode for efficiency
    if (volumeFocus >= 300) return true;
    return currentYieldValue >= (activeRecipe?.bulkThreshold || 50);
  }, [currentYieldValue, activeRecipe, volumeFocus]);

  // [LOCKED] CORE ROUNDING LOGIC - DO NOT MODIFY WITHOUT AUDIT
  const chefRound = (val, unit = '') => {
    if (val <= 0) return 0;
    const u = (unit || '').toLowerCase();

    // 1. Bulk Units (kg, L, Liter, lb, qt) - aggressive 0.5 steps
    if (['kg', 'l', 'liter', 'lb', 'qt'].some(x => u.includes(x))) {
      // User requested decimal precision (e.g. 2.3kg for 2332g)
      const r = Math.round(val * 10) / 10;
      return r > 0 ? r : Math.ceil(val * 10) / 10; // never zero a positive value
    }

    // 1.5 Medium Imperial Units (oz, fl oz, cup) - 0.25 steps (quarter cups/ounces)
    if (['oz', 'fl oz', 'cup'].some(x => u.includes(x))) {
      const fraction = Math.round(val * 4) / 4;
      return fraction > 0 ? fraction : Math.round(val * 10) / 10;
    }

    // 2. Small Units (g, ml) - 0 / 5 rule
    if (val < 1) return Math.ceil(val * 10) / 10;   // e.g. 0.2 -> 0.2, 0.09 -> 0.1
    if (val < 5) return Math.round(val * 2) / 2;     // e.g. 1.44 -> 1.5
    if (val < 10) return Math.round(val);             // e.g. 8.2 -> 8
    return Math.round(val / 5) * 5;                   // e.g. 104 -> 105, 39 -> 40
  };

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
        const ideal = ing.qty * f;
        let displayUnit = ing.unit || '';
        let displayVal = ideal;

        // Match formatQuantity logic for accurate chefRound targeting
        const uMatch = displayUnit.toLowerCase();
        if (uMatch === 'g' && ideal >= 1000) { displayVal = ideal / 1000; displayUnit = 'kg'; }
        else if (uMatch === 'ml' && ideal >= 1000) { displayVal = ideal / 1000; displayUnit = 'L'; }

        const roundedDisplay = chefRound(displayVal, displayUnit);

        // Convert back to base unit for error comparison
        let roundedBase = roundedDisplay;
        if (displayUnit === 'kg' && uMatch === 'g') roundedBase = roundedDisplay * 1000;
        if (displayUnit === 'L' && uMatch === 'ml') roundedBase = roundedDisplay * 1000;

        // Minimize relative error (percentage) so small ingredients like salt hold equal weight
        const error = Math.abs(ideal - roundedBase) / (ideal || 1);
        variance += error;
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



  // [LOCKED] CORE UNIT FORMATTER - DO NOT MODIFY WITHOUT AUDIT
  // Combined value/unit formatter for ordering
  const formatQuantity = (val, unit = '') => {
    let displayVal = val;
    let displayUnit = unit || '';

    const uMatch = displayUnit.toLowerCase();
    if (unitSystem === 'imperial') {
      if (uMatch === 'g' || uMatch === 'kg') {
        let oz = displayVal;
        if (uMatch === 'kg') oz = displayVal * 1000;
        oz = oz * 0.035274;
        if (oz >= 16) {
          displayVal = oz / 16;
          displayUnit = 'lb';
        } else {
          displayVal = oz;
          displayUnit = 'oz';
        }
      } else if (uMatch === 'ml' || uMatch === 'l' || uMatch === 'liter') {
        let floz = displayVal;
        if (uMatch !== 'ml') floz = displayVal * 1000;
        floz = floz * 0.033814;
        if (floz >= 32) {
          displayVal = floz / 32;
          displayUnit = 'qt';
        } else if (floz >= 8) {
          displayVal = floz / 8;
          displayUnit = 'cup';
        } else {
          displayVal = floz;
          displayUnit = 'fl oz';
        }
      }
    } else {
      // Auto-scale units for metric readability
      if (uMatch === 'g' && val >= 1000) {
        displayVal = val / 1000;
        displayUnit = 'kg';
      } else if (uMatch === 'ml' && val >= 1000) {
        displayVal = val / 1000;
        displayUnit = 'L';
      }
    }

    const rounded = chefRound(displayVal, displayUnit);

    // Formatting the number string
    let valStr = rounded.toString();
    const duLower = displayUnit.toLowerCase();
    if (['kg', 'l', 'lb', 'qt'].some(u => duLower.includes(u))) {
      valStr = rounded.toFixed(1).replace(/\.0$/, "");
    }

    return { val: valStr, unit: displayUnit };
  };

  const formatValue = (val, unit) => {
    const { val: v } = formatQuantity(val, unit);
    return v;
  };

  // [LOCKED] CORE MARKET AGGREGATION ENGINE - DO NOT MODIFY
  // Handles recursive sub-recipes and unit normalization
  const aggregatedOrder = useMemo(() => {
    const totals = {};
    const SKU_TO_RECIPE_MAP = {
      'INT-MAG-SOY': 'magic-soy',
      'INT-BBQ-SCE': 'bbq-sauce',
      'INT-SWT-SWP': 'sweet-spicy-sauce',
      'INT-CHK-COAT': 'chicken-coating-flour',
      'INT-CHK-STRCH': 'chicken-coating-starch',
      'INT-EGG-WSH': 'egg-wash',
      'INT-TTE-SCE': 'tteokkochi-sauce',
      'INT-CUR-ROUX': 'curry-roux',
      'INT-CUR-BASE': 'curry-vege-base'
    };

    const processRecipe = (recipeId, yieldRequested, seen = new Set(), depth = 0) => {
      // Loop Protection
      if (depth > 6 || seen.has(recipeId)) return;
      seen.add(recipeId);

      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach(ing => {
        const subRecipeId = SKU_TO_RECIPE_MAP[ing.sku] || recipes.find(r => r.id === ing.sku)?.id;
        let qtyToProcess = ing.qty;

        if (subRecipeId) {
          const subRecipe = recipes.find(r => r.id === subRecipeId);
          if (subRecipe) {
            const subUnit = (subRecipe.unit || '').toLowerCase();
            const reqUnit = (ing.unit || '').toLowerCase();
            // Normalization: Grams requested from a Kilogram recipe / ml requested from a Liter recipe
            const isSubMetric = subUnit === 'kg' || subUnit === 'l' || subUnit === 'liter' || subUnit === 'litre';
            const isReqSmall = reqUnit === 'g' || reqUnit === 'ml';

            if (isSubMetric && isReqSmall) {
              qtyToProcess /= 1000;
            }
          }
          const scaledSubYield = (qtyToProcess / recipe.baseYield) * yieldRequested;
          processRecipe(subRecipeId, scaledSubYield, new Set(seen), depth + 1);
        } else {
          // Leaf ingredient aggregation
          let baseQty = ing.qty;
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

          const scaledQty = (baseQty / recipe.baseYield) * yieldRequested;
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

  const formatDisplay = (val, unit) => {
    const { val: v, unit: u } = formatQuantity(val, unit);
    return { v, u };
  };

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
        </div>

        <div className="flex bg-app-surface border border-app-border rounded-lg p-1 gap-1">
          <button
            onClick={() => setPortionMode(!portionMode)}
            className={`flex items-center gap-2 px-4 py-1.5 min-w-[140px] justify-center text-[10px] font-black uppercase rounded transition-all border ${portionMode ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20' : 'bg-app-surface text-app-accent border-app-border'}`}
          >
            {portionMode ? <Utensils size={14} /> : <Beef size={14} />}
            {portionMode ? "Test (Portions)" : "Production Mode"}
          </button>
          <div className="w-px h-4 bg-app-border my-auto mx-1" />
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase text-app-muted hover:text-app-text hover:bg-app-bg rounded transition-all"
          >
            <SettingsIcon size={14} /> Settings
          </button>
        </div>
      </nav>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

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
                      step={portionMode ? "10" : "0.5"}
                      min="0"
                      value={portionMode
                        ? currentPortionCount
                        : (currentYieldValue / (volumeFocus * getPortionSize(activeRecipe)) || 0).toFixed(1)
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const pSize = getPortionSize(activeRecipe);
                        if (portionMode) {
                          // Enforce 50 portion minimum floor
                          const finalPortions = Math.max(val, batchSettings.minPortions || 50);
                          if (activeRecipe.unit?.toLowerCase().includes('portion')) {
                            setDailyProduction({ ...dailyProduction, [selectedId]: finalPortions });
                          } else {
                            const requiredYield = finalPortions * pSize;
                            setDailyProduction({ ...dailyProduction, [selectedId]: Number(requiredYield.toFixed(2)) });
                          }
                        } else {
                          // REDEFINED BATCH: 1 Batch = volumeFocus * portionSize
                          const requiredYield = val * (volumeFocus * pSize);
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

                {/* Portion Intelligence Display */}
                <div className="flex flex-col justify-center border-l border-app-border pl-6">
                  <div className="flex items-center gap-2">
                    <Utensils size={12} className="text-app-accent opacity-50" />
                    <div className="text-[10px] font-black text-app-text uppercase">
                      ~{currentPortionCount} <span className="text-app-muted">Portions</span>
                    </div>
                  </div>
                  <div className="text-[8px] font-bold text-app-muted uppercase tracking-tight">
                    {volumeFocus} ppl / batch  <span className="text-app-accent ml-1">(1 port. = {getPortionSize(activeRecipe)}g/ml)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 ml-auto">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const reset = {};
                        recipes.forEach(r => reset[r.id] = r.baseYield);
                        setDailyProduction(reset);
                      }}
                      className="bg-app-bg border border-app-border hover:border-app-accent text-[8px] font-black uppercase px-2 py-1 rounded transition-colors text-app-muted hover:text-app-text"
                    >
                      Default All
                    </button>
                    <button
                      onClick={() => {
                        const zero = {};
                        recipes.forEach(r => zero[r.id] = 0);
                        setDailyProduction(zero);
                      }}
                      className="bg-app-bg border border-app-border hover:border-app-danger/20 hover:text-app-danger text-[8px] font-black uppercase px-2 py-1 rounded transition-colors text-app-muted"
                    >
                      Zero All
                    </button>
                    <button
                      onClick={() => {
                        const allScaled = { ...dailyProduction };

                        recipes.forEach(r => {
                          if (portionMode) {
                            // In portion mode: set every recipe to the same portion count
                            if (r.unit?.toLowerCase().includes('portion')) {
                              allScaled[r.id] = currentPortionCount;
                            } else {
                              allScaled[r.id] = Number((currentPortionCount * getPortionSize(r)).toFixed(2));
                            }
                          } else {
                            // In production mode: apply the current batch count multiplier
                            const currentBatchFactor = currentYieldValue / (volumeFocus * getPortionSize(activeRecipe)) || 0;
                            allScaled[r.id] = Number((currentBatchFactor * (volumeFocus * getPortionSize(r))).toFixed(2));
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
              <div className="md:col-span-12 bg-app-surface border border-app-border rounded-lg p-4 relative overflow-hidden">
                <div className="flex gap-2 items-center mb-2 font-black text-[10px] uppercase text-app-accent tracking-widest border-b border-app-border/50 pb-2">
                  <Info size={14} /> Critical Prep Strategy & Detailed Intelligence
                </div>
                <div className="prose prose-invert max-w-none">
                  <p className="text-xs font-medium leading-relaxed text-app-text italic bg-app-bg/50 p-3 rounded border border-app-border/30">
                    "{activeRecipe.note}"
                  </p>
                </div>
              </div>

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
                              const finalPortions = Math.max(val, batchSettings.minPortions || 50);
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
