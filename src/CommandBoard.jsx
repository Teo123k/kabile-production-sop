import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useSettings } from './SettingsContext';

/**
 * CommandBoard Component
 * A digital kitchen command board for tracking shift readiness across 3 phases.
 * Single-page dashboard view (no external scrolling).
 * Side-by-side columns: Weekly, Daily, Service.
 */
const CommandBoard = ({ clientId = 'kabile', onExit, productionTargets = {} }) => {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { language, volumeFocus, translateIngredient } = useSettings();
    const [checkedTasks, setCheckedTasks] = useState(() => {
        const saved = localStorage.getItem(`command_board_checks_${clientId}`);
        return saved ? JSON.parse(saved) : {};
    });

    // ── Data Fetching ──────────────────────────────────────────────────────────

    // ── Data Fetching ──────────────────────────────────────────────────────────
    useEffect(() => {
        async function fetchBoardData() {
            setLoading(true);

            // Fetch both Board Tasks and Full Recipe Metadata
            const [boardRes, recipeRes] = await Promise.all([
                supabase.from('sop_board_tasks').select('*').eq('client_id', clientId),
                supabase.from('consulting_sops').select('*').eq('client_id', clientId)
            ]);

            if (boardRes.error || recipeRes.error) {
                console.error('Error fetching data:', boardRes.error || recipeRes.error);
            } else {
                const recipesRaw = (recipeRes.data || []).map(row => {
                    const r = typeof row.recipe_json === 'string' ? JSON.parse(row.recipe_json) : row.recipe_json;
                    return { ...r, db_id: row.id };
                });

                const boardTasks = (boardRes.data || []).map(row => {
                    const taskData = typeof row.tasks_json === 'string' ? JSON.parse(row.tasks_json) : row.tasks_json;

                    // IMPROVED: Robust matching for prefixes like "21. Flour Mix"
                    const normalize = (s) => (s || '').toLowerCase().replace(/^\d+\.\s*/, '').replace(/[\s-]/g, '');
                    const rowNameNorm = normalize(row.dish_name);

                    const meta = recipesRaw.find(r => {
                        const rNameNorm = normalize(r.name || r.title || '');
                        const rIdNorm = normalize(r.id || '');
                        return rNameNorm === rowNameNorm || rIdNorm === rowNameNorm;
                    });

                    return {
                        id: row.id,
                        dish_name: row.dish_name,
                        staff_role: row.staff_role,
                        data: taskData,
                        meta: meta || {}
                    };
                });
                setRecipes(boardTasks);
            }
            setLoading(false);
        }
        fetchBoardData();
    }, [clientId]);

    // ── Persistence ───────────────────────────────────────────────────────────
    useEffect(() => {
        localStorage.setItem(`command_board_checks_${clientId}`, JSON.stringify(checkedTasks));
    }, [checkedTasks, clientId]);

    // ── Task Logic ────────────────────────────────────────────────────────────
    const toggleTask = (recipeId, category, index) => {
        const key = `${recipeId}-${category}-${index}`;
        setCheckedTasks(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const resetBoard = () => {
        if (window.confirm('Wipe board for new shift?')) {
            setCheckedTasks({});
        }
    };

    // ── Station Routing ──────────────────────────────────────────────────────
    const processStationTags = (label) => {
        if (typeof label !== 'string') return label;
        // Find [STATION] and wrap in span
        return label.replace(/\[([A-Z]+)\]/g, (match, p1) => {
            return `<span class="station-tag">${p1}</span>`;
        });
    };

    // ── BOM Helper ────────────────────────────────────────────────────────────
    const renderBOM = (recipe) => {
        const recipeId = recipe.meta?.id;
        const portions = productionTargets[recipeId] || 0;
        if (portions === 0) return null;

        const ingredients = recipe.meta?.ingredients || [];
        if (ingredients.length === 0) return null;

        const baseYield = recipe.meta?.baseYield || 1;
        const isTier1 = recipe.meta?.tier?.includes('Tier 1');

        // Batch Logic: Round UP to nearest full batch for foundations
        const scaleFactor = isTier1
            ? Math.ceil(portions / baseYield) // e.g. 40L target / 11L base = 4 batches
            : portions / baseYield;

        // Show top 5 ingredients
        const mainIngs = ingredients.filter(i => i.qty > 0).slice(0, 5);

        return (
            <div className="bom-header">
                <div className="bom-title">
                    {isTier1 ? `REQUIRED FOR ${scaleFactor} BATCHES:` : 'REQUIRED MATERIALS:'}
                </div>
                <div className="bom-items">
                    {mainIngs.map((ing, i) => {
                        const scaledVal = isTier1
                            ? ing.qty * scaleFactor
                            : ing.qty * scaleFactor;
                        return (
                            <span key={i} className="bom-pill">
                                {formatValue(scaledVal, ing.unit)} {translateIngredient(ing.name)}
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ── Render Helpers ────────────────────────────────────────────────────────
    const renderTaskLabel = (processedLabel) => {
        // Since we use dangerouslySetInnerHTML for station tags
        if (typeof processedLabel === 'string' && processedLabel.includes('class="station-tag"')) {
            return <span dangerouslySetInnerHTML={{ __html: processedLabel }} />;
        }
        return processedLabel;
    };
    const stats = useMemo(() => {
        let total = 0;
        let done = 0;

        recipes.forEach(r => {
            const p = r.data || {};
            const weeklyCount = (p.weekly?.length || 0);
            const dailyCount = (p.morning?.tasks?.length || 0) + (p.morning?.forward?.length || 0);
            const serviceCount = (p.service?.length || 0);

            total += weeklyCount + dailyCount + serviceCount;

            Object.keys(checkedTasks).forEach(key => {
                if (key.startsWith(`${r.id}-`) && checkedTasks[key]) {
                    done++;
                }
            });
        });

        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        return { total, done, percent };
    }, [recipes, checkedTasks]);

    // ── Reactive Logic ────────────────────────────────────────────────────────
    const formatValue = (val, unit) => {
        if (!val) return "";
        if (val >= 1000 && (unit === 'g' || unit === 'ml')) {
            const newVal = (val / 1000).toFixed(1).replace(/\.0$/, "");
            const newUnit = unit === 'g' ? 'kg' : 'L';
            return `${newVal}${newUnit}`;
        }
        return `${Math.round(val)}${unit || ''}`;
    };

    const processTaskLabel = (recipe, label) => {
        if (typeof label !== 'string') return label;
        if (!label.includes('{{qty}}')) return label;

        // NEW: Inheritance logic - if sub-recipe, look at parent portions
        let portions = 0;
        if (recipe.meta?.is_sub_recipe && recipe.meta?.parent_sku) {
            const parent = recipes.find(r =>
                r.meta?.id === recipe.meta.parent_sku ||
                r.dish_name.toLowerCase().replace(/ /g, '-') === recipe.meta.parent_sku
            );
            if (parent) portions = productionTargets[parent.id] || 0;
        } else {
            portions = productionTargets[recipe.id] || 0;
        }

        const ratio = recipe.meta?.ratio || 1;
        const qty = portions * ratio;

        let unit = recipe.meta?.unit || '';
        if (label.includes('{{unit}}')) {
            if (qty >= 1000 && (unit === 'g' || unit === 'ml')) {
                const formatted = formatValue(qty, unit);
                return label.replace('{{qty}}', formatted.replace(/[a-zA-Z]/g, '')).replace('{{unit}}', formatted.replace(/[0-9.]/g, ''));
            }
            return label.replace('{{qty}}', Math.round(qty)).replace('{{unit}}', unit);
        }

        return label.replace('{{qty}}', formatValue(qty, unit));
    };

    // ── Absorption Helpers ────────────────────────────────────────────────────
    const visibleMainRecipes = useMemo(() => {
        return recipes.filter(r => !r.meta?.is_sub_recipe);
    }, [recipes]);

    const getAbsorbedTasks = (parentSku, category) => {
        const subRecipes = recipes.filter(r => r.meta?.is_sub_recipe && r.meta?.parent_sku === parentSku);
        return subRecipes.flatMap(sub => {
            const tasks = category === 'morning-fwd' ? (sub.data?.morning?.forward || []) :
                category === 'morning-std' ? (sub.data?.morning?.tasks || []) :
                    category === 'weekly' ? (sub.data?.weekly || []) :
                        (sub.data?.service || []);

            return tasks.map(t => ({
                label: typeof t === 'string' ? `[${sub.dish_name}] ${t}` : { ...t, label: `[${sub.dish_name}] ${t.label}` },
                recipe: sub // Pass sub-recipe context for its own ratios
            }));
        });
    };

    // ── Render Helpers ────────────────────────────────────────────────────────
    const renderTaskRows = (recipe, category, tasks, isForward = false) => {
        // Collect absorbed tasks first
        const absorbed = getAbsorbedTasks(recipe.meta?.id || recipe.dish_name.toLowerCase().replace(/ /g, '-'), category);

        // Merge with standard tasks
        const allTasks = [
            ...tasks.map(t => ({ label: t, recipe })),
            ...absorbed
        ];

        if (allTasks.length === 0) return null;
        const staff = recipe.staff_role || 'js';

        return allTasks.map((item, idx) => {
            const isTactical = typeof item.label === 'object';
            const rawLabel = processStationTags(isTactical ? item.label.label : item.label);
            const processedLabel = processTaskLabel(item.recipe, rawLabel);

            const key = `${recipe.id}-${category}-${idx}`;
            const isChecked = checkedTasks[key];

            return (
                <div
                    key={key}
                    className={`task-row ${isChecked ? 'checked' : ''} ${isTactical ? 'tactical-task' : ''}`}
                    onClick={() => toggleTask(recipe.id, category, idx)}
                >
                    <div className="check-box"></div>
                    <div className="task-content">
                        <span className="task-label">{renderTaskLabel(processedLabel)}</span>
                        <div className="tags">
                            {staff.includes('s') && <span className="tag-role tag-s">SENIOR</span>}
                            {staff.includes('j') && <span className="tag-role tag-j">JUNIOR</span>}
                            {isForward && (
                                <span className="fwd-alert">
                                    <i className="fa-solid fa-clock-rotate-left"></i> TOMORROW
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
                <i className="fa-solid fa-spinner fa-spin text-3xl mb-4"></i>
                <p className="uppercase tracking-widest text-xs font-black">Syncing Kitchen State...</p>
            </div>
        );
    }

    return (
        <div className="command-board-wrapper">
            <style>{`
                :root {
                    --bg-dark: var(--bg);
                    --panel-bg: var(--surface);
                    --weekly-blue: #3b82f6;
                    --daily-amber: #f59e0b;
                    --service-green: #10b981;
                    --border-color: var(--border);
                    --text-color: var(--text);
                    --text-dim-color: var(--text-dim);
                }

                .command-board-wrapper {
                    background-color: var(--bg);
                    font-family: 'Inter', sans-serif;
                    color: var(--text);
                    height: calc(100vh - 140px);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    margin-top: -10px;
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    padding: 10px 15px;
                    flex: 1;
                    min-height: 0;
                }

                .board-column {
                    background: var(--surface-low);
                    border: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }

                .col-header {
                    padding: 10px 15px;
                    background: var(--surface);
                    border-bottom: 1px solid var(--border-color);
                    font-size: 11px;
                    font-weight: 900;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .col-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                }

                .recipe-box {
                    margin-bottom: 15px;
                    background: var(--surface);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 12px;
                    transition: all 0.3s ease;
                }
                .recipe-box.active-box {border-color: var(--service-green); box-shadow: 0 0 15px rgba(34, 197, 94, 0.1); }
                .recipe-box.active-box .recipe-name {color: var(--service-green); }

                .recipe-control {
                    background: var(--surface-low);
                    padding: 6px 10px;
                    border-left: 2px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }
                .recipe-name {font-size: 10px; font-weight: 900; text-transform: uppercase; color: var(--text-dim-color); }

                .task-row {
                    background: var(--surface);
                    border: 1px solid var(--border-color);
                    padding: 8px 10px;
                    display: flex;
                    gap: 10px;
                    cursor: pointer;
                    transition: 0.1s;
                    margin-bottom: 2px;
                }
                .task-row:hover {border-color: var(--highlight); background: var(--surface-high); }
                .task-row.checked {opacity: 0.3; filter: grayscale(1); }

                .portions-input {
                    background: var(--bg);
                    border: 1px solid var(--border-color);
                    color: var(--service-green);
                    font-size: 11px;
                    font-weight: 900;
                    width: 45px;
                    padding: 2px 5px;
                    border-radius: 2px;
                    text-align: center;
                    outline: none;
                }
                .portions-input:focus {border-color: var(--service-green); }

                .check-box {
                    width: 14px;
                    height: 14px;
                    border: 1px solid var(--border-color);
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 1px;
                }
                .checked .check-box {background: var(--highlight); border-color: var(--highlight); }
                .checked .check-box::after {content: "✓"; color: #fff; font-size: 9px; font-weight: 900; }

                .task-content {display: flex; flex-direction: column; gap: 2px; }
                .task-label {font-size: 9px; font-weight: 800; text-transform: uppercase; line-height: 1.1; color: var(--text); display: flex; align-items: center; gap: 4px; }
                .station-tag {background: var(--highlight); color: white; font-size: 7px; font-weight: 900; padding: 1px 4px; border-radius: 2px; vertical-align: middle; }
                .checked .task-label {text-decoration: line-through; color: var(--muted); }

                .bom-header {background: var(--surface-low); border: 1px solid #22c55e33; border-radius: 4px; padding: 6px 8px; margin-bottom: 10px; }
                .bom-title {font-size: 8px; font-weight: 900; color: var(--service-green); margin-bottom: 4px; letter-spacing: 0.05em; }
                .bom-items {display: flex; flex-wrap: wrap; gap: 4px; }
                .bom-pill {font-size: 9px; font-weight: 700; color: var(--text); background: var(--surface); padding: 2px 6px; border-radius: 100px; border: 1px solid var(--border-color); white-space: nowrap; }

                .tags {display: flex; gap: 4px; align-items: center; margin-top: 1px; }
                .tag-role {font-size: 6px; font-weight: 900; padding: 0px 3px; border-radius: 1px; color: #fff; }
                .tag-s {background: #8b5cf6; }
                .tag-j {background: #10b981; color: #000; }
                .fwd-alert {color: var(--daily-amber); font-weight: 900; font-size: 6px; display: flex; align-items: center; gap: 2px; }

                .btn-sm {font-size: 9px; padding: 4px 10px; background: transparent; border: 1px solid var(--border-color); color: var(--text-dim-color); text-transform: uppercase; font-weight: 900; cursor: pointer; border-radius: 2px; }
                .btn-sm:hover {color: var(--text); border-color: var(--text); background: var(--surface); }

                .col-content::-webkit-scrollbar {width: 3px; }
                .col-content::-webkit-scrollbar-thumb {background: var(--border-color); }

                /* TACTICAL CALCULATOR STYLES */
                .tactical-task {border-left: 2px solid var(--service-green); }
                .tactical-btn {font-size: 7px; color: var(--service-green); background: rgba(16, 185, 129, 0.1); padding: 1px 4px; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 2px; font-weight: 900; margin-left: 4px; transition: 0.2s; }
                .tactical-btn:hover {background: var(--service-green); color: #000; }

                .tactical-modal-overlay {position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .tactical-modal {background: #121214; border: 1px solid #27272a; width: 90%; max-width: 320px; border-radius: 8px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                .modal-header {background: #1a1a1c; padding: 12px 15px; border-bottom: 1px solid #27272a; display: flex; justify-content: space-between; align-items: center; }
                .modal-content {padding: 20px; }
                .input-group {margin - bottom: 20px; }
                .modal-input {width: 100%; background: #000; border: 1px solid #3f3f46; border-radius: 4px; padding: 12px; font-size: 24px; font-weight: 900; color: var(--service-green); text-align: center; outline: none; transition: 0.2s; }
                .modal-input:focus {border - color: var(--service-green); box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
                .result-box {background: #1a1a1c; border: 1px dashed #3f3f46; border-radius: 6px; padding: 15px; text-align: center; }
                .result-value {font - size: 32px; font-weight: 900; color: #fff; line-height: 1; }
                .result-label {font - size: 10px; font-weight: 900; text-transform: uppercase; color: var(--text-dim); margin-top: 5px; }

                @media print {
                  .dashboard - grid {display: block; height: auto; }
                .command-board-wrapper {height: auto; }
                .board-column {border: 1px solid #000; margin-bottom: 20px; page-break-inside: avoid; }
                .task-row {background: #fff; border: 1px solid #000; opacity: 1 !important; filter: none !important; }
                .task-label {color: #000; }
                .print-hidden {display: none !important; }
                }
            `}</style>

            {/* BAR PINS TO TOP */}
            <div className="board-header print-hidden">
                <div className="flex gap-4">
                    <button className="btn-sm" onClick={resetBoard}>Reset Board</button>
                    <button className="btn-sm" onClick={() => window.print()}>Export PDF</button>
                    <button className="btn-sm px-4 border-amber-900/40 text-amber-500/80" onClick={onExit}>Exit</button>
                </div>
                <div className="progress-hud">
                    <div className="flex flex-col items-end">
                        <div className="bar-text">Shift Readiness: {stats.percent}%</div>
                        <div className="text-[10px] font-black text-app-accent uppercase tracking-tighter">
                            Volume Focus: {volumeFocus} Portions
                        </div>
                    </div>
                    <div className="bar-container">
                        <div className="bar-fill" style={{ width: `${stats.percent}%` }}></div>
                    </div>
                    <div className="bar-text">{stats.done} / {stats.total} Tasks</div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* 1. WEEKLY */}
                <div className="board-column" style={{ borderTop: '3px solid var(--weekly-blue)' }}>
                    <div className="col-header" style={{ color: 'var(--weekly-blue)' }}>
                        <i className="fa-solid fa-calendar-days"></i> 1. Weekly Foundations
                    </div>
                    <div className="col-content">
                        {visibleMainRecipes.map(r => {
                            const weeklyTasks = r.data?.weekly || [];
                            const absorbed = getAbsorbedTasks(r.meta?.id || r.dish_name.toLowerCase().replace(/ /g, '-'), 'weekly');
                            if (weeklyTasks.length === 0 && absorbed.length === 0) return null;
                            const isActive = (productionTargets[r.meta?.id] || 0) > 0;
                            return (
                                <div key={r.id} className={`recipe-box ${isActive ? 'active-box' : ''}`}>
                                    <div className="recipe-control" style={{ borderLeftColor: 'var(--weekly-blue)' }}>
                                        <span className="recipe-name">{r.dish_name.replace(/^\d+[\s.\-_]*/, '')}</span>
                                        <div className="text-[10px] font-black text-var(--weekly-blue) tracking-widest px-2 py-0.5 border border-[#3f3f46] rounded bg-[#000]">STATIC ROUTINE</div>
                                    </div>
                                    {renderBOM(r)}
                                    {renderTaskRows(r, 'weekly', weeklyTasks)}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. DAILY */}
                <div className="board-column" style={{ borderTop: '3px solid var(--daily-amber)' }}>
                    <div className="col-header" style={{ color: 'var(--daily-amber)' }}>
                        <i className="fa-solid fa-sun"></i> 2. Daily Processing
                    </div>
                    <div className="col-content">
                        {visibleMainRecipes
                            .filter(r => (productionTargets[r.meta?.id] || 0) > 0) // AUTO-FILTER FOR DAILY
                            .map(r => {
                                const standardTasks = r.data?.morning?.tasks || [];
                                const forwardTasks = r.data?.morning?.forward || [];
                                const absorbedStd = getAbsorbedTasks(r.meta?.id || r.dish_name.toLowerCase().replace(/ /g, '-'), 'morning-std');
                                const absorbedFwd = getAbsorbedTasks(r.meta?.id || r.dish_name.toLowerCase().replace(/ /g, '-'), 'morning-fwd');

                                if (standardTasks.length === 0 && forwardTasks.length === 0 && absorbedStd.length === 0 && absorbedFwd.length === 0) return null;

                                const recipeId = r.meta?.id;
                                const portions = productionTargets[recipeId] || 0;
                                const unit = r.meta?.unit || 'PORTIONS';
                                const isActive = portions > 0;

                                const isTier1 = r.meta?.tier?.includes('Tier 1');
                                const baseYield = r.meta?.baseYield || 1;
                                const batchCount = Math.ceil(portions / baseYield);

                                return (
                                    <div key={r.id} className={`recipe-box ${isActive ? 'active-box' : ''}`}>
                                        <div className="recipe-control" style={{ borderLeftColor: 'var(--daily-amber)' }}>
                                            <span className="recipe-name">{r.dish_name.replace(/^\d+[\s.\-_]*/, '')}</span>
                                            <div className="text-[11px] font-black text-var(--daily-amber) tracking-widest px-2 py-1 border border-[#3f3f46] rounded bg-[#000]">
                                                {isTier1
                                                    ? `TARGET: ${batchCount} BATCH${batchCount > 1 ? 'ES' : ''} (${portions}${unit})`
                                                    : `TARGET: ${portions} ${unit.toUpperCase()}`
                                                }
                                            </div>
                                        </div>
                                        {renderBOM(r)}
                                        {renderTaskRows(r, 'morning-std', standardTasks)}
                                        {renderTaskRows(r, 'morning-fwd', forwardTasks, true)}
                                    </div>
                                );
                            })}
                        {visibleMainRecipes.filter(r => (productionTargets[r.meta?.id] || 0) > 0).length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2 p-10 text-center">
                                <i className="fa-solid fa-check-double text-2xl"></i>
                                <span className="text-[10px] uppercase font-black tracking-widest">No Active Daily Targets</span>
                                <span className="text-[8px] uppercase tracking-wider font-bold">Set goals via the Scaler/Market.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. SERVICE */}
                <div className="board-column" style={{ borderTop: '3px solid var(--service-green)' }}>
                    <div className="col-header" style={{ color: 'var(--service-green)' }}>
                        <i className="fa-solid fa-bolt"></i> 3. Pre-Service Ready
                    </div>
                    <div className="col-content">
                        {visibleMainRecipes.map(r => {
                            const serviceTasks = r.data?.service || [];
                            const absorbed = getAbsorbedTasks(r.meta?.id || r.dish_name.toLowerCase().replace(/ /g, '-'), 'service');
                            if (serviceTasks.length === 0 && absorbed.length === 0) return null;
                            const isActive = (productionTargets[r.meta?.id] || 0) > 0;
                            return (
                                <div key={r.id} className={`recipe-box ${isActive ? 'active-box' : ''}`}>
                                    <div className="recipe-control" style={{ borderLeftColor: 'var(--service-green)' }}>
                                        <span className="recipe-name">{r.dish_name.replace(/^\d+[\s.\-_]*/, '')}</span>
                                    </div>
                                    {renderBOM(r)}
                                    {renderTaskRows(r, 'service', serviceTasks)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default CommandBoard;
