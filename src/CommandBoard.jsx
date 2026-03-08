import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useSettings } from './SettingsContext';
import {
    ChefHat,
    Clock,
    CheckCircle2,
    FileText,
    Trash2,
    RotateCcw,
    Utensils,
    Scale,
    Timer,
    Zap,
    ClipboardCheck
} from 'lucide-react';

/**
 * CommandBoard Component - Overhauled for Chef Execution
 * Focus: High Readability, Smart Tooling, Grouped Prep Tasks.
 */
const CommandBoard = ({ clientId = 'kabile', onExit, productionTargets = {}, recipes: masterRecipes = [] }) => {
    const [boardRecords, setBoardRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const { language, volumeFocus, translateIngredient } = useSettings();
    const [checkedTasks, setCheckedTasks] = useState(() => {
        const saved = localStorage.getItem(`command_board_checks_${clientId}`);
        return saved ? JSON.parse(saved) : {};
    });
    const [boardMode, setBoardMode] = useState('production'); // 'production' or 'test'

    const normalize = (val) => {
        const s = (val || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
        const noLeadingNum = s.replace(/^[0-9]+[\.\)\s-]+/, '').trim();
        const clean = noLeadingNum.replace(/\s*\(.*?\)\s*/g, '').trim();
        return clean;
    };

    // ── Data Fetching (Tasks Only) ─────────────────────────────────────────────
    useEffect(() => {
        async function fetchBoardData() {
            if (masterRecipes.length === 0) return;
            setLoading(true);
            try {
                const [presentationRes, boardTasksRes] = await Promise.all([
                    supabase.from('sop_presentations').select('*').eq('client_id', clientId),
                    supabase.from('sop_board_tasks').select('*').eq('client_id', clientId)
                ]);

                const presentationData = presentationRes.data || [];
                const sopBoardTasksData = boardTasksRes.data || [];

                const boardsMap = new Map();

                // 1. Initialize with Master Recipes to ensure catch-all
                masterRecipes.forEach(r => {
                    const norm = normalize(r.name);
                    boardsMap.set(norm, {
                        dish_name: r.name,
                        data: {},
                        hasTasks: false,
                        staff_role: 'js',
                        meta: r
                    });
                });

                const mergeTaskSource = (dish_name, json) => {
                    const data = typeof json === 'string' ? JSON.parse(json) : json;
                    if (!data) return;
                    const norm = normalize(dish_name);
                    const existing = boardsMap.get(norm);
                    const hasTasks = data.weekly || data.morning || data.service;

                    if (existing) {
                        boardsMap.set(norm, {
                            ...existing,
                            data: { ...existing.data, ...data },
                            hasTasks: !!(existing.hasTasks || hasTasks)
                        });
                    } else if (hasTasks) {
                        boardsMap.set(norm, {
                            dish_name,
                            data,
                            hasTasks: true,
                            staff_role: data.staff || 'js',
                            meta: masterRecipes.find(mr => normalize(mr.name) === norm) || {}
                        });
                    }
                };

                presentationData.forEach(row => {
                    try {
                        mergeTaskSource(row.dish_name, row.presentation_json);
                    } catch (e) {
                        console.error(`Error parsing presentation for ${row.dish_name}:`, e);
                    }
                });
                sopBoardTasksData.forEach(row => {
                    try {
                        mergeTaskSource(row.dish_name, row.tasks_json);
                    } catch (e) {
                        console.error(`Error parsing tasks for ${row.dish_name}:`, e);
                    }
                });

                const recipesMap = new Map();
                masterRecipes.forEach(r => {
                    recipesMap.set(normalize(r.name), r);
                    recipesMap.set(normalize(r.id), r);
                });

                const finalBoardItems = Array.from(boardsMap.values()).map(row => {
                    return {
                        id: row.meta?.id || row.dish_name,
                        dish_name: row.dish_name,
                        staff_role: row.staff_role,
                        data: row.data,
                        meta: row.meta || {},
                        hasTasks: row.hasTasks
                    };
                });

                setBoardRecords(finalBoardItems);
            } catch (err) {
                console.error("Board fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchBoardData();
    }, [clientId, masterRecipes.length]);

    // ── Persistence & Updates ────────────────────────────────────────────────
    const handleUpdateTaskLabel = async (recipe, category, index, newLabel) => {
        // Optimistic local update
        setBoardRecords(prev => prev.map(r => {
            if (r.id !== recipe.id && r.dish_name !== recipe.dish_name) return r;
            const newData = { ...r.data };
            let targetArray = null;
            if (category === 'weekly') {
                if (!newData.weekly) newData.weekly = [];
                if (Array.isArray(newData.weekly)) targetArray = newData.weekly;
                else if (newData.weekly?.batch) targetArray = newData.weekly.batch;
            } else if (category === 'morning') {
                if (!newData.morning) newData.morning = [];
                if (Array.isArray(newData.morning)) targetArray = newData.morning;
                else if (newData.morning?.tasks) targetArray = newData.morning.tasks;
            } else if (category === 'service' || category.startsWith('test')) {
                if (!newData.service) newData.service = [];
                if (Array.isArray(newData.service)) targetArray = newData.service;
                else if (newData.service?.setup) targetArray = newData.service.setup;
            }

            // If we are editing a fallback (method), initialize the array with the method steps if empty
            if (targetArray && targetArray.length === 0 && recipe.meta?.method) {
                targetArray.push(...recipe.meta.method);
            }

            if (targetArray && targetArray[index] !== undefined) {
                if (typeof targetArray[index] === 'string') targetArray[index] = newLabel;
                else targetArray[index].label = newLabel;
            } else if (targetArray && index === targetArray.length) {
                // Handle appending if needed (though UI usually edits existing)
                targetArray.push(newLabel);
            }

            return { ...r, data: newData };
        }));

        // Quiet background sync to Supabase
        const currentRecord = boardRecords.find(r => r.id === recipe.id || r.dish_name === recipe.dish_name);
        if (currentRecord) {
            const updatedData = { ...currentRecord.data };
            // Ensure the specific label change is reflected in the object being sent
            let targetArray = null;
            if (category === 'weekly') {
                if (!updatedData.weekly) updatedData.weekly = [];
                if (Array.isArray(updatedData.weekly)) targetArray = updatedData.weekly;
                else if (updatedData.weekly?.batch) targetArray = updatedData.weekly.batch;
            } else if (category === 'morning') {
                if (!updatedData.morning) updatedData.morning = [];
                if (Array.isArray(updatedData.morning)) targetArray = updatedData.morning;
                else if (updatedData.morning?.tasks) targetArray = updatedData.morning.tasks;
            } else if (category === 'service' || category.startsWith('test')) {
                if (!updatedData.service) updatedData.service = [];
                if (Array.isArray(updatedData.service)) targetArray = updatedData.service;
                else if (updatedData.service?.setup) targetArray = updatedData.service.setup;
            }

            if (targetArray && targetArray.length === 0 && recipe.meta?.method) {
                targetArray.push(...recipe.meta.method);
            }

            if (targetArray && targetArray[index] !== undefined) {
                if (typeof targetArray[index] === 'string') targetArray[index] = newLabel;
                else targetArray[index].label = newLabel;
            }

            await supabase
                .from('sop_board_tasks')
                .upsert({
                    dish_name: recipe.dish_name,
                    tasks_json: updatedData,
                    client_id: clientId
                }, { onConflict: 'dish_name,client_id' });
        }
    };

    useEffect(() => {
        localStorage.setItem(`command_board_checks_${clientId}`, JSON.stringify(checkedTasks));
    }, [checkedTasks, clientId]);

    const toggleTask = (recipeId, category, index) => {
        const key = `${recipeId}-${category}-${index}`;
        setCheckedTasks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const resetBoard = () => {
        if (window.confirm('Wipe board for new shift?')) setCheckedTasks({});
    };

    // ── Render Helpers ────────────────────────────────────────────────────────
    const getWeeklyTasks = (data, meta) => {
        if (Array.isArray(data?.weekly) && data.weekly.length > 0) return data.weekly;
        if (data?.weekly?.batch?.length > 0 || data?.weekly?.buffer?.length > 0) {
            return [...(data.weekly.batch || []), ...(data.weekly.buffer || [])];
        }
        // Fallback: If it's a foundational prep, use the recipe method
        if ((meta?.dishStyle === 'prep' || meta?.dishCategory === 'base') && meta?.method) {
            return meta.method;
        }
        return [];
    };

    const getMorningTasks = (data, meta) => {
        if (Array.isArray(data?.morning) && data.morning.length > 0) return data.morning;
        if (data?.morning?.tasks?.length > 0) return data.morning.tasks;
        // Fallback: Use recipe method if weekly didn't claim it
        const isPrep = meta?.dishStyle === 'prep' || meta?.dishCategory === 'base';
        if (!isPrep && meta?.method) return meta.method;
        return [];
    };

    const getForwardTasks = (data) => Array.isArray(data?.morning) ? [] : (data?.morning?.forward || []);

    const getServiceTasks = (data, meta) => {
        if (Array.isArray(data?.service) && data.service.length > 0) return data.service;
        if (data?.service?.setup?.length > 0 || data?.service?.garnish?.length > 0) {
            return [...(data.service.setup || []), ...(data.service.garnish || [])];
        }
        return [];
    };

    const filteredRecords = useMemo(() => {
        // If in Test Mode, only show items with an explicit production target (selected in Scale page)
        if (boardMode === 'test') {
            return boardRecords.filter(r => (productionTargets[r.id] || productionTargets[r.meta?.id]) > 0);
        }
        // In Production Mode, show items with targets or designated for board
        return boardRecords.filter(r => (productionTargets[r.id] || productionTargets[r.meta?.id]) > 0 || r.meta?.show_on_board);
    }, [boardRecords, boardMode, productionTargets]);

    const stats = useMemo(() => {
        let total = 0, done = 0;
        filteredRecords.forEach(r => {
            const p = r.data || {};
            total += getWeeklyTasks(p).length + getMorningTasks(p).length + getForwardTasks(p).length + getServiceTasks(p).length;
            Object.keys(checkedTasks).forEach(key => { if (key.startsWith(`${r.id}-`) && checkedTasks[key]) done++; });
        });
        return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
    }, [filteredRecords, checkedTasks]);

    const renderSmartTooling = (recipe) => {
        const yieldVal = productionTargets[recipe.id] || productionTargets[recipe.meta?.id] || 0;
        if (yieldVal === 0) return null;
        return (
            <div className="tooling-box">
                <div className="tooling-title"><Utensils size={10} className="mr-1" /> RECOMMENDED TOOLS:</div>
                <div className="tooling-items">
                    <span className="tool-pill">Standard Mixing Bowl</span>
                </div>
            </div>
        );
    };

    const renderGroupedTasks = (recipe, category, tasks, isForward = false) => {
        if (!tasks || tasks.length === 0) return null;

        return (
            <div className="task-group">
                {tasks.map((t, idx) => {
                    const label = typeof t === 'string' ? t : (t.label || '');
                    const key = `${recipe.id}-${category}-${idx}`;
                    const isChecked = checkedTasks[key];
                    return (
                        <div key={key} className={`task-row group ${isChecked ? 'checked' : ''}`} onClick={() => toggleTask(recipe.id, category, idx)}>
                            <div className="check-box">
                                {isChecked && <CheckCircle2 size={12} />}
                            </div>
                            <div className="task-content">
                                <input
                                    className={`bg-transparent border-none outline-none w-full task-label ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'} focus:ring-0 cursor-text`}
                                    value={label}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleUpdateTaskLabel(recipe, category, idx, e.target.value)}
                                />
                                {isForward && <span className="fwd-tag shrink-0">TOMORROW</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
            <RotateCcw className="animate-spin mb-4" size={32} />
            <p className="uppercase tracking-widest text-xs font-black">Syncing Kitchen State...</p>
        </div>
    );

    return (
        <div className="command-board-wrapper">
            <style>{`
                .command-board-wrapper { background-color: var(--bg); font-family: 'Inter', sans-serif; height: calc(100vh - 120px); display: flex; flex-direction: column; }
                .board-header { padding: 15px 25px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
                .dashboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; padding: 15px; flex: 1; min-height: 0; }
                .board-column { background: var(--surface-low); border: 1px solid var(--border); display: flex; flex-direction: column; border-radius: 8px; overflow: hidden; }
                .col-header { padding: 15px; background: var(--surface); border-bottom: 2px solid var(--border); font-size: 14px; font-weight: 900; text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
                .col-content { flex: 1; overflow-y: auto; padding: 15px; }
                .recipe-box { margin-bottom: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 15px; }
                .recipe-box.active-box { border-left: 6px solid var(--app-accent); }
                .recipe-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed var(--border); padding-bottom: 8px; }
                .recipe-name { font-size: 14px; font-weight: 900; text-transform: uppercase; color: var(--text); }
                .recipe-target { font-size: 10px; font-weight: 900; color: var(--app-accent); }
                .task-row { padding: 10px; background: var(--bg); border: 1px solid var(--border); margin-bottom: 4px; border-radius: 6px; display: flex; gap: 10px; cursor: pointer; transition: all 0.2s; }
                .task-row:hover { border-color: var(--app-accent); transform: translateX(4px); }
                .task-row.checked { opacity: 0.4; background: transparent; }
                .check-box { width: 16px; height: 16px; border: 2px solid var(--border); border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .checked .check-box { background: var(--app-accent); border-color: var(--app-accent); color: var(--bg); }
                .task-label { font-size: 11px; font-weight: 700; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .progress-hud { display: flex; align-items: center; gap: 20px; }
                .bar-container { width: 100px; height: 8px; background: var(--border); border-radius: 100px; overflow: hidden; }
                .bar-fill { height: 100%; background: var(--app-accent); transition: width 0.3s ease; }
            `}</style>

            <div className="board-header">
                <div className="flex items-center gap-6">
                    <div className="flex gap-1.5 bg-zinc-800/50 p-1 rounded-lg border border-zinc-700/50">
                        <button onClick={() => setBoardMode('production')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${boardMode === 'production' ? 'bg-app-accent text-app-bg shadow-lg shadow-app-accent/20' : 'text-zinc-400 hover:text-zinc-200'}`}>Production Mode</button>
                        <button onClick={() => setBoardMode('test')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${boardMode === 'test' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}>Test Mode</button>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="progress-hud">
                        <div className="flex flex-col items-end">
                            <div className="text-[10px] font-black mb-1 opacity-50 tracking-widest">KITCHEN READINESS: {stats.percent}%</div>
                            <div className="bar-container bg-zinc-800"><div className="bar-fill" style={{ width: `${stats.percent}%` }}></div></div>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-zinc-800"></div>
                    <div className="flex gap-2">
                        <button className="px-5 py-2 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-black uppercase rounded-xl transition-all" onClick={resetBoard}><RotateCcw size={14} className="inline mr-2 opacity-50" /> RESET BOARD</button>
                    </div>
                </div>
            </div>

            {filteredRecords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-app-muted bg-app-surface border border-dashed border-app-border rounded-xl m-10">
                    <ClipboardCheck size={48} className="opacity-20 mb-4" />
                    <p className="font-black uppercase tracking-widest text-[10px]">No active recipes for this mode</p>
                    <button onClick={onExit} className="mt-4 text-[10px] font-black text-app-accent hover:underline">Pick Recipes in Scaler View</button>
                </div>
            ) : (
                <div className="dashboard-grid">
                    {boardMode === 'production' ? (
                        <>
                            <div className="board-column" style={{ borderTop: '4px solid #3b82f6' }}>
                                <div className="col-header flex justify-between items-center">
                                    <div className="flex items-center gap-2"><ChefHat size={16} className="text-blue-400" /> Foundations (Weekly)</div>
                                    <div className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">BATCH & BUFFER</div>
                                </div>
                                <div className="col-content">
                                    {filteredRecords.map(r => {
                                        const tasks = getWeeklyTasks(r.data, r.meta);
                                        if (tasks.length === 0) return null;
                                        return (
                                            <div key={r.id} className="recipe-box hover:border-blue-500/30 transition-all">
                                                <div className="recipe-header">
                                                    <span className="recipe-name text-blue-400">{translateIngredient(r.dish_name)}</span>
                                                    {renderSmartTooling(r)}
                                                </div>
                                                {renderGroupedTasks(r, 'weekly', tasks)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="board-column" style={{ borderTop: '4px solid #f59e0b' }}>
                                <div className="col-header flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Timer size={16} className="text-amber-500" /> Daily Prep</div>
                                    <div className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">MORNING MISE</div>
                                </div>
                                <div className="col-content">
                                    {filteredRecords.map(r => {
                                        const tasks = getMorningTasks(r.data, r.meta);
                                        if (tasks.length === 0) return null;
                                        return (
                                            <div key={r.id} className="recipe-box active-box border-amber-500/20">
                                                <div className="recipe-header">
                                                    <span className="recipe-name text-amber-500">{translateIngredient(r.dish_name)}</span>
                                                    {renderSmartTooling(r)}
                                                </div>
                                                {renderGroupedTasks(r, 'morning', tasks)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="board-column" style={{ borderTop: '4px solid #10b981' }}>
                                <div className="col-header flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Zap size={16} className="text-emerald-500" /> Pre-Service</div>
                                    <div className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">SETUP & GARNISH</div>
                                </div>
                                <div className="col-content">
                                    {filteredRecords.map(r => {
                                        const tasks = getServiceTasks(r.data, r.meta);
                                        if (tasks.length === 0) return null;
                                        return (
                                            <div key={r.id} className="recipe-box hover:border-emerald-500/30 transition-all">
                                                <div className="recipe-header">
                                                    <span className="recipe-name text-emerald-500">{translateIngredient(r.dish_name)}</span>
                                                    {renderSmartTooling(r)}
                                                </div>
                                                {renderGroupedTasks(r, 'service', tasks)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="board-column lg:col-span-3" style={{ borderTop: '4px solid #f59e0b', gridColumn: 'span 3' }}>
                            <div className="col-header flex justify-between items-center bg-amber-500/5">
                                <div className="flex items-center gap-2 text-amber-500"><Timer size={16} /> Recipe Testing Flow (Step-by-Step Logic)</div>
                                <div className="text-[9px] bg-amber-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">PRIORITY: TIME-SENSITIVE FIRST</div>
                            </div>
                            <div className="col-content grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredRecords.map(r => {
                                    const allTasks = [...getWeeklyTasks(r.data, r.meta), ...getMorningTasks(r.data, r.meta), ...getServiceTasks(r.data, r.meta)];

                                    // Chef logic: Long tasks first (Boiling, Roasting, Braising)
                                    const longTasks = allTasks.filter(t => {
                                        const l = (typeof t === 'string' ? t : t.label).toLowerCase();
                                        return l.includes('boil') || l.includes('roast') || l.includes('braise') || l.includes('oven') || l.includes('cook') || l.includes('simmer');
                                    });
                                    const parallelTasks = allTasks.filter(t => !longTasks.includes(t));

                                    return (
                                        <div key={r.id} className="recipe-box active-box border-amber-500/30 bg-zinc-900/50">
                                            <div className="recipe-header border-b border-zinc-800 pb-2 mb-3">
                                                <span className="recipe-name text-amber-500 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                    {translateIngredient(r.dish_name)}
                                                </span>
                                                {renderSmartTooling(r)}
                                            </div>

                                            {longTasks.length > 0 && (
                                                <div className="mb-6">
                                                    <div className="text-[9px] font-black text-red-400 uppercase mb-3 flex items-center gap-2 bg-red-500/10 p-2 rounded border border-red-500/20">
                                                        <Clock size={12} /> 1. PROLONGED EXECUTION (FIRE FIRST)
                                                    </div>
                                                    {renderGroupedTasks(r, 'test-long', longTasks)}
                                                </div>
                                            )}

                                            {parallelTasks.length > 0 && (
                                                <div>
                                                    <div className="text-[9px] font-black text-emerald-400 uppercase mb-3 flex items-center gap-2 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                                                        <Zap size={12} /> 2. PARALLEL WORK & PLATING
                                                    </div>
                                                    {renderGroupedTasks(r, 'test-parallel', parallelTasks)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CommandBoard;
