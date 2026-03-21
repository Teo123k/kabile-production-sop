import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useSettings } from './SettingsContext';
import { Pencil, Check, X } from 'lucide-react';

const SLIDE_STYLES = `
        .slider-window {
          width: 1120px;
          height: 630px;
          position: relative;
          border: 1px solid var(--border);
          overflow: hidden;
          background: var(--bg);
          box-shadow: 0 0 100px rgba(0,0,0,0.5);
          font-family: 'Inter', sans-serif;
          color: var(--text);
        }

        .slides-container {
          display: flex;
          transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          height: 100%;
          width: 100%;
        }

        .slide {
          min-width: 1120px;
          height: 100%;
          display: grid;
          grid-template-rows: 100px 1fr 60px;
        }

        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.6);
          border: 1px solid var(--border);
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
          backdrop-filter: blur(5px);
        }
        .nav-btn:hover { background: var(--highlight); border-color: var(--highlight); }
        .prev { left: 15px; }
        .next { right: 15px; }

        .slide-header {
          padding: 0 50px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .header-title-box h2 { font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: -1px; margin: 0; }
        .header-title-box p { font-family: 'JetBrains Mono'; font-size: 10px; color: var(--highlight); text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px 0; }
        .header-viz { width: 140px; height: 70px; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; background: #000; }
        .header-viz img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; filter: contrast(1.1); }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 16px;
          padding: 24px 36px 36px 36px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .dashboard-grid::-webkit-scrollbar { width: 6px; }
        .dashboard-grid::-webkit-scrollbar-track { background: var(--bg); }
        .dashboard-grid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        .dashboard-grid::-webkit-scrollbar-thumb:hover { background: var(--highlight); }

        .timeline-column {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .op-card {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 16px;
          position: relative;
          border-left: 3px solid var(--border);
        }
        .op-card.active-phase { border-left-color: var(--highlight); background: rgba(59, 130, 246, 0.03); }
        .op-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--highlight); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }

        .bullet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .bullet-item h4 { font-size: 12px; color: var(--text); margin-bottom: 4px; font-weight: 700; }
        .bullet-item ul { list-style: none; padding-left: 10px; }
        .bullet-item li { font-size: 11px; color: var(--text-dim); margin-bottom: 4px; line-height: 1.4; position: relative; }
        .bullet-item li::before { content: "›"; position: absolute; left: -10px; color: var(--highlight); }

        .logic-column { display: flex; flex-direction: column; gap: 15px; }
        .logic-module { background: var(--surface-low); border: 1px solid var(--border); padding: 16px; border-radius: 4px; }
        .strategy-header { font-size: 10px; font-weight: 900; color: #f59e0b; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }

        .stat-line { display: flex; justify-content: space-between; font-size: 11px; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .stat-line:last-child { border-bottom: none; }
        .stat-line span:first-child { color: var(--text-dim); flex-shrink: 0; }
        .stat-line span:last-child { font-weight: 800; color: var(--text); text-align: right; max-width: 58%; word-break: break-word; white-space: normal; line-height: 1.35; }

        .dish-mission { flex: 1; padding: 0 40px; display: flex; flex-direction: column; justify-content: center; border-left: 1px solid var(--border); height: 100%; }
        .mission-label { font-size: 9px; font-weight: 900; color: var(--highlight); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; opacity: 0.8; }
        .mission-list { margin: 0; padding: 0; list-style: none; }
        .mission-list li { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; position: relative; padding-left: 15px; line-height: 1.2; }
        .mission-list li::before { content: "•"; position: absolute; left: 0; color: var(--highlight); font-weight: 900; }

        .logic-module.intel { background: var(--surface-high); border: 1px solid var(--highlight); box-shadow: 0 0 20px rgba(59, 130, 246, 0.05); }
        .intel-spec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 5px; }
        .intel-spec-item { display: flex; flex-direction: column; gap: 2px; }
        .intel-label { font-size: 8px; font-weight: 900; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .intel-value { font-size: 11px; font-weight: 800; color: var(--text); text-transform: uppercase; }
        .intel-caution { grid-column: span 2; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); margin-top: 5px; padding: 8px; }
        .intel-caution .intel-value { color: #f59e0b; font-family: 'JetBrains Mono'; font-size: 10px; }

        .slide-footer {
          padding: 0 50px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .maintenance-tag { font-family: 'JetBrains Mono'; font-size: 10px; color: var(--muted); font-weight: 600; }
        .pill { padding: 4px 12px; border-radius: 4px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-left: 10px; }
        .pill.j { background: #10b981; color: #064e3b; }
        .pill.s { background: #8b5cf6; color: #fff; }

        .dots { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; }
        .dot { width: 8px; height: 8px; background: var(--border); border-radius: 50%; cursor: pointer; transition: 0.3s; }
        .dot.active { background: var(--highlight); width: 24px; border-radius: 4px; }
`;

/**
 * CinematicSOP Component
 * Self-fetching Brigade SOP briefing slider.
 * Reads from the dedicated `sop_presentations` table.
 *
 * @param {string} clientId      - The client_id to query (e.g. 'kabile')
 * @param {string} initialDishName - Optional dish name to start on
 * @param {Function} onExit      - Callback to close the view
 */
const CinematicSOP = ({ clientId = 'kabile', initialDishName, onExit, portionTargets = {}, recipeIdByName = {}, canEdit = false }) => {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [current, setCurrent] = useState(0);
    const [editingSlideId, setEditingSlideId] = useState(null);
    const [editingDraft, setEditingDraft] = useState(null);
    const { translateIngredient } = useSettings();

    const normalize = useCallback((s) => (s || '').toLowerCase().trim(), []);
    const getProfileForDish = useCallback((dishName) => {
        const recipeId = recipeIdByName[normalize(dishName)] || '';
        const portions = parseFloat(portionTargets[recipeId]) || 0;
        return portions >= 50 ? 'high_volume' : 'regular';
    }, [normalize, portionTargets, recipeIdByName]);

    const resolveProfileData = useCallback((raw, dishName = '') => {
        if (!raw || typeof raw !== 'object') return {};
        const activeProfile = getProfileForDish(dishName);
        if (raw.regular || raw.high_volume) {
            return raw[activeProfile] || raw.regular || {};
        }
        return raw;
    }, [getProfileForDish]);

    const mergePresentationEnvelope = useCallback((raw, dishName, patch) => {
        const activeProfile = getProfileForDish(dishName);
        if (raw && typeof raw === 'object' && (raw.regular || raw.high_volume)) {
            const regularBase = raw.regular || {};
            return {
                ...raw,
                [activeProfile]: {
                    ...regularBase,
                    ...(raw[activeProfile] || {}),
                    ...patch
                }
            };
        }
        return {
            ...(raw || {}),
            ...patch
        };
    }, [getProfileForDish]);

    const toMultiline = useCallback((value) => Array.isArray(value) ? value.join('\n') : '', []);
    const fromMultiline = useCallback((value) => (
        String(value || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
    ), []);

    // ── Fetch from both tables and merge ───────────────────────────────────────
    useEffect(() => {
        async function fetchPresentations() {
            setLoading(true);
            setError(null);

            try {
                const [presentationRes, legacyRes] = await Promise.all([
                    supabase.from('sop_presentations').select('*').eq('client_id', clientId),
                    supabase.from('consulting_sops').select('*').eq('client_id', clientId)
                ]);

                if (presentationRes.error) throw presentationRes.error;

                // Build a map of the richest possible presentation data
                const richDataMap = new Map();

                // 1. Load legacy data first (it contains the extremely rich 'chef logic')
                (legacyRes.data || []).forEach(row => {
                    const norm = normalize(row.dish_name);
                    if (row.presentation_json) {
                        const parsed = typeof row.presentation_json === 'string' ? JSON.parse(row.presentation_json) : row.presentation_json;
                        richDataMap.set(norm, {
                            id: row.id || norm,
                            dish_name: row.dish_name,
                            rawData: parsed
                        });
                    }
                });

                // 2. Overlay automation data, but DO NOT overwrite rich logic with stubs
                (presentationRes.data || []).forEach(row => {
                    const norm = normalize(row.dish_name);
                    const existing = richDataMap.get(norm);
                    const parsed = typeof row.presentation_json === 'string' ? JSON.parse(row.presentation_json) : row.presentation_json;

                    if (!existing) {
                        richDataMap.set(norm, { id: row.id, dish_name: row.dish_name, rawData: parsed });
                    } else if (parsed && parsed.strategy && parsed.strategy.note && parsed.strategy.note.length > (resolveProfileData(existing.rawData, row.dish_name)?.strategy?.note?.length || 0)) {
                        // Only overwrite if the new data is actually longer/richer
                        richDataMap.set(norm, { id: row.id, dish_name: row.dish_name, rawData: parsed });
                    }
                });

                const parsed = Array.from(richDataMap.values()).map((row) => ({
                    ...row,
                    data: resolveProfileData(row.rawData, row.dish_name)
                }));
                setSlides(parsed);

                // Jump to initial dish if provided
                if (initialDishName) {
                    const idx = parsed.findIndex(s =>
                        s.dish_name?.toLowerCase() === initialDishName?.toLowerCase()
                    );
                    if (idx >= 0) setCurrent(idx);
                    else setCurrent(0);
                }
            } catch (fetchError) {
                console.error('Presentations fetch error:', fetchError);
                setError(fetchError.message);
            } finally {
                setLoading(false);
            }
        }
        fetchPresentations();
    }, [clientId, initialDishName, normalize, resolveProfileData]);

    const activeSlide = slides[current] || null;
    const activeData = activeSlide?.data || {};

    const defaultMissionLines = useMemo(() => ([
        'Follow standard technique for optimal yield',
        'Ensure station organization before start',
        'Maintain quality standards at all times'
    ]), []);

    const startEditing = useCallback(() => {
        if (!canEdit || !activeSlide) return;
        const sd = activeSlide.data || {};
        setEditingSlideId(activeSlide.id);
        setEditingDraft({
            title: sd.title || activeSlide.dish_name || '',
            meta: sd.meta || '',
            mission: toMultiline(sd.mission?.length ? sd.mission : defaultMissionLines),
            weeklyBatch: toMultiline(sd.weekly?.batch),
            weeklyBuffer: toMultiline(sd.weekly?.buffer),
            morningTasks: toMultiline(sd.morning?.tasks),
            morningForward: toMultiline(sd.morning?.forward),
            serviceSetup: toMultiline(sd.service?.setup),
            serviceGarnish: toMultiline(sd.service?.garnish),
            holdingMethod: sd.holding?.method || '',
            holdingLimit: sd.holding?.limit || '',
            holdingTemp: sd.holding?.temp || '',
            maintenance: sd.maintenance || '',
            strategyMethod: sd.strategy?.method || '',
            strategyTemp: sd.strategy?.temp || '',
            strategyTips: sd.strategy?.tips || '',
            strategyNote: sd.strategy?.note || ''
        });
    }, [activeSlide, canEdit, defaultMissionLines, toMultiline]);

    const cancelEditing = useCallback(() => {
        setEditingSlideId(null);
        setEditingDraft(null);
    }, []);

    const saveEditing = useCallback(async () => {
        if (!canEdit || !activeSlide || !editingDraft) return;
        const patch = {
            title: editingDraft.title.trim(),
            meta: editingDraft.meta.trim(),
            mission: fromMultiline(editingDraft.mission),
            weekly: {
                batch: fromMultiline(editingDraft.weeklyBatch),
                buffer: fromMultiline(editingDraft.weeklyBuffer)
            },
            morning: {
                tasks: fromMultiline(editingDraft.morningTasks),
                forward: fromMultiline(editingDraft.morningForward)
            },
            service: {
                setup: fromMultiline(editingDraft.serviceSetup),
                garnish: fromMultiline(editingDraft.serviceGarnish)
            },
            holding: {
                method: editingDraft.holdingMethod.trim(),
                limit: editingDraft.holdingLimit.trim(),
                temp: editingDraft.holdingTemp.trim()
            },
            maintenance: editingDraft.maintenance.trim(),
            strategy: {
                method: editingDraft.strategyMethod.trim(),
                temp: editingDraft.strategyTemp.trim(),
                tips: editingDraft.strategyTips.trim(),
                note: editingDraft.strategyNote.trim()
            }
        };

        const nextRawData = mergePresentationEnvelope(activeSlide.rawData, activeSlide.dish_name, patch);
        const { error: saveError } = await supabase
            .from('sop_presentations')
            .upsert({
                client_id: clientId,
                dish_name: activeSlide.dish_name,
                presentation_json: nextRawData
            }, { onConflict: 'client_id,dish_name' });

        if (saveError) {
            console.error('Presentation save failed:', saveError);
            return;
        }

        setSlides((prev) => prev.map((slide) => (
            slide.id === activeSlide.id
                ? { ...slide, rawData: nextRawData, data: resolveProfileData(nextRawData, slide.dish_name) }
                : slide
        )));
        cancelEditing();
    }, [activeSlide, canEdit, cancelEditing, clientId, editingDraft, fromMultiline, mergePresentationEnvelope, resolveProfileData]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const moveSlide = useCallback((dir) => {
        setCurrent(prev => (prev + dir + slides.length) % slides.length);
    }, [slides.length]);

    const goToSlide = (i) => setCurrent(i);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') moveSlide(1);
            if (e.key === 'ArrowLeft') moveSlide(-1);
            if (e.key === 'Escape') onExit && onExit();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveSlide, onExit]);

    // ── Loading / Error / Empty states ────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-zinc-900 rounded-xl border border-dashed border-zinc-700 text-zinc-500">
                <i className="fa-solid fa-spinner fa-spin text-3xl mb-4"></i>
                <p className="font-bold uppercase tracking-widest text-xs">Loading Brigade SOPs…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-zinc-900 rounded-xl border border-dashed border-red-900 text-red-400">
                <i className="fa-solid fa-triangle-exclamation text-4xl mb-4"></i>
                <p className="font-bold uppercase tracking-widest text-xs mb-2">Fetch Error</p>
                <p className="text-[10px] opacity-60 px-10 text-center">{error}</p>
                <button onClick={onExit} className="mt-8 px-6 py-2 bg-zinc-800 text-white text-[10px] font-black uppercase rounded hover:bg-zinc-700 transition-colors">Return to Scaler</button>
            </div>
        );
    }

    if (slides.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-zinc-900 rounded-xl border border-dashed border-zinc-700 text-zinc-500">
                <i className="fa-solid fa-triangle-exclamation text-4xl mb-4"></i>
                <p className="font-bold uppercase tracking-widest text-xs">No Presentation SOPs Found</p>
                <p className="text-[10px] mt-2 opacity-60 px-10 text-center">
                    Insert rows into the <code>sop_presentations</code> table for client <strong>{clientId}</strong>.
                </p>
                <button onClick={onExit} className="mt-8 px-6 py-2 bg-zinc-800 text-white text-[10px] font-black uppercase rounded hover:bg-zinc-700 transition-colors">Return to Scaler</button>
            </div>
        );
    }

    const p = activeData;
    const renderEditableList = (value, key, fallback = []) => {
        if (editingSlideId === activeSlide?.id && editingDraft) {
            return (
                <textarea
                    className="h-[86px] max-h-[86px] w-full resize-none overflow-y-auto rounded border border-app-accent/30 bg-app-bg px-3 py-2 text-[11px] leading-4 text-app-text outline-none"
                    value={editingDraft[key]}
                    onChange={(e) => setEditingDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                />
            );
        }
        const items = value?.length ? value : fallback;
        return (
            <ul className="mission-list">
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        );
    };

    const renderEditableBulletList = (value, key, fallbackText) => {
        if (editingSlideId === activeSlide?.id && editingDraft) {
            return (
                <textarea
                    className="min-h-[100px] w-full rounded border border-app-accent/30 bg-app-bg px-3 py-2 text-[11px] leading-5 text-app-text outline-none"
                    value={editingDraft[key]}
                    onChange={(e) => setEditingDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                />
            );
        }
        return (
            <ul>
                {(value?.length ? value : [fallbackText]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        );
    };

    const renderEditableValue = (value, key, fallback = '') => {
        if (editingSlideId === activeSlide?.id && editingDraft) {
            return (
                <input
                    className="w-full rounded border border-app-accent/30 bg-app-bg px-2 py-1 text-[11px] font-bold text-app-text outline-none"
                    value={editingDraft[key]}
                    onChange={(e) => setEditingDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                />
            );
        }
        return <span className="intel-value">{value || fallback}</span>;
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="cinematic-presentation-container flex flex-col items-center py-10 min-h-[800px]">
            <style>{SLIDE_STYLES}</style>

            <div className="slider-window">
                {/* Navigation Buttons */}
                <button className="nav-btn prev" onClick={() => moveSlide(-1)}>
                    <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button className="nav-btn next" onClick={() => moveSlide(1)}>
                    <i className="fa-solid fa-chevron-right"></i>
                </button>

                {/* Slides Container */}
                <div className="slides-container" style={{ transform: `translateX(-${current * 1120}px)` }}>
                    {slides.map((slide, index) => {
                        const sd = slide.data || {};
                        const isEditingThisSlide = editingSlideId === slide.id;
                        return (
                            <div key={slide.id} className="slide">
                                <header className="slide-header">
                                    <div className="header-title-box" style={{ minWidth: '400px' }}>
                                        {isEditingThisSlide ? (
                                            <input
                                                className="mb-1 w-full rounded border border-app-accent/30 bg-app-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[2px] text-app-accent outline-none"
                                                value={editingDraft?.meta || ''}
                                                onChange={(e) => setEditingDraft((prev) => ({ ...prev, meta: e.target.value }))}
                                            />
                                        ) : (
                                            <p>{sd.meta || 'RECIPE // BRIGADE_SOP'}</p>
                                        )}
                                        <div className="flex items-center gap-3">
                                            {isEditingThisSlide ? (
                                                <input
                                                    className="w-full rounded border border-app-accent/30 bg-app-bg px-3 py-2 text-[26px] font-extrabold uppercase tracking-[-1px] text-app-text outline-none"
                                                    value={editingDraft?.title || ''}
                                                    onChange={(e) => setEditingDraft((prev) => ({ ...prev, title: e.target.value }))}
                                                />
                                            ) : (
                                                <h2>{translateIngredient((sd.title || slide.dish_name || '').replace(/^\d+[\s.\-_]*/, ''))}</h2>
                                            )}
                                            {canEdit && index === current && (
                                                <div className="flex items-center gap-2">
                                                    {isEditingThisSlide ? (
                                                        <>
                                                            <button onClick={saveEditing} className="inline-flex items-center gap-1 rounded border border-app-accent/30 bg-app-accent/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-app-accent">
                                                                <Check size={12} /> Save
                                                            </button>
                                                            <button onClick={cancelEditing} className="inline-flex items-center gap-1 rounded border border-app-border bg-app-surface px-2 py-1 text-[10px] font-black uppercase tracking-widest text-app-text">
                                                                <X size={12} /> Exit
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button onClick={startEditing} className="inline-flex items-center gap-1 rounded border border-app-border bg-app-surface px-2 py-1 text-[10px] font-black uppercase tracking-widest text-app-text">
                                                            <Pencil size={12} /> Edit
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="dish-mission">
                                        <span className="mission-label">Training Focus // Dish Mission</span>
                                        {renderEditableList(sd.mission, 'mission', defaultMissionLines)}
                                    </div>

                                    <div className="header-viz">
                                        <img
                                            src={sd.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2680&auto=format&fit=crop'}
                                            alt={translateIngredient((slide.dish_name || '').replace(/^\d+[\s.\-_]*/, ''))}
                                        />
                                    </div>
                                </header>

                                <div className="dashboard-grid">
                                    <div className="timeline-column">
                                        {/* Weekly Prep */}
                                        <div className="op-card">
                                            <span className="op-label"><i className="fa-solid fa-calendar-check text-[12px]"></i> Weekly Prep Strategy</span>
                                            <div className="bullet-grid">
                                                <div className="bullet-item">
                                                    <h4>Batch Cycle</h4>
                                                    {renderEditableBulletList(sd.weekly?.batch, 'weeklyBatch', 'Standard Batch')}
                                                </div>
                                                <div className="bullet-item">
                                                    <h4>Min. Quantity</h4>
                                                    {renderEditableBulletList(sd.weekly?.buffer, 'weeklyBuffer', 'Maintain Buffer')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Morning Ops */}
                                        <div className="op-card active-phase">
                                            <span className="op-label"><i className="fa-solid fa-sun text-[12px]"></i> Daily Morning Operations</span>
                                            <div className="bullet-grid">
                                                <div className="bullet-item">
                                                    <h4>Daily Prep</h4>
                                                    {renderEditableBulletList(sd.morning?.tasks, 'morningTasks', 'Follow SOP')}
                                                </div>
                                                <div className="bullet-item">
                                                    <h4>Forward Prep</h4>
                                                    {renderEditableBulletList(sd.morning?.forward, 'morningForward', 'Check Delivery')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Service Execution */}
                                        <div className="op-card">
                                            <span className="op-label"><i className="fa-solid fa-bolt text-[12px]"></i> Pre-Service Execution</span>
                                            <div className="bullet-grid">
                                                <div className="bullet-item">
                                                    <h4>Service Setup</h4>
                                                    {renderEditableBulletList(sd.service?.setup, 'serviceSetup', 'Line check')}
                                                </div>
                                                <div className="bullet-item">
                                                    <h4>Garnish Logic</h4>
                                                    {renderEditableBulletList(sd.service?.garnish, 'serviceGarnish', 'Standard garnish')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="logic-column">
                                        {/* Manager Intelligence Module */}
                                        <div className="logic-module intel">
                                            <span className="strategy-header" style={{ color: '#3b82f6', marginBottom: '10px' }}>
                                                <i className="fa-solid fa-clipboard-check"></i> Manager Intelligence
                                            </span>
                                            <div className="intel-spec-grid">
                                                <div className="intel-spec-item">
                                                    <span className="intel-label">Storage Method</span>
                                                    {renderEditableValue(sd.holding?.method, 'holdingMethod', 'COLD STORE')}
                                                </div>
                                                <div className="intel-spec-item">
                                                    <span className="intel-label">Shelf Life Limit</span>
                                                    {renderEditableValue(sd.holding?.limit, 'holdingLimit', '3 DAYS')}
                                                </div>
                                                <div className="intel-spec-item">
                                                    <span className="intel-label">Holding Temp</span>
                                                    {renderEditableValue(sd.holding?.temp, 'holdingTemp', '2-4°C')}
                                                </div>
                                                <div className="intel-spec-item">
                                                    <span className="intel-label">Audit Frequency</span>
                                                    <span className="intel-value">EVERY SESSION</span>
                                                </div>
                                                {(sd.maintenance || isEditingThisSlide) ? (
                                                    <div className="intel-spec-item intel-caution">
                                                        <span className="intel-label">CRITICAL MANAGER CAUTION</span>
                                                        {isEditingThisSlide ? (
                                                            <textarea
                                                                className="mt-1 min-h-[70px] w-full rounded border border-app-accent/30 bg-app-bg px-3 py-2 text-[11px] font-bold text-amber-400 outline-none"
                                                                value={editingDraft?.maintenance || ''}
                                                                onChange={(e) => setEditingDraft((prev) => ({ ...prev, maintenance: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className="intel-value">{sd.maintenance}</span>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Strategy Module */}
                                        <div className="logic-module strategy">
                                            <span className="strategy-header"><i className="fa-solid fa-gauge-high"></i> Chef Strategy // Tips</span>
                                            <div className="stat-line"><span>Focus</span><span>{isEditingThisSlide ? <input className="w-full rounded border border-app-accent/30 bg-app-bg px-2 py-1 text-[11px] font-bold text-app-text outline-none" value={editingDraft?.strategyMethod || ''} onChange={(e) => setEditingDraft((prev) => ({ ...prev, strategyMethod: e.target.value }))} /> : (sd.strategy?.method || 'SOP Standard')}</span></div>
                                            <div className="stat-line"><span>Execution</span><span>{isEditingThisSlide ? <input className="w-full rounded border border-app-accent/30 bg-app-bg px-2 py-1 text-[11px] font-bold text-app-text outline-none" value={editingDraft?.strategyTemp || ''} onChange={(e) => setEditingDraft((prev) => ({ ...prev, strategyTemp: e.target.value }))} /> : (sd.strategy?.temp || 'N/A')}</span></div>
                                            <div className="stat-line"><span>Tips & Tricks</span><span>{isEditingThisSlide ? <textarea className="min-h-[72px] w-full rounded border border-app-accent/30 bg-app-bg px-2 py-1 text-[11px] font-bold text-app-text outline-none" value={editingDraft?.strategyTips || ''} onChange={(e) => setEditingDraft((prev) => ({ ...prev, strategyTips: e.target.value }))} /> : (sd.strategy?.tips || '—')}</span></div>
                                            {isEditingThisSlide ? (
                                                <textarea
                                                    className="mt-[12px] min-h-[80px] w-full rounded border border-app-accent/30 bg-app-bg px-3 py-2 text-[11px] leading-relaxed text-[#94a3b8] outline-none"
                                                    value={editingDraft?.strategyNote || ''}
                                                    onChange={(e) => setEditingDraft((prev) => ({ ...prev, strategyNote: e.target.value }))}
                                                />
                                            ) : (
                                                <p className="text-[10px] text-[#94a3b8] mt-[12px] leading-relaxed">{sd.strategy?.note || 'Follow master technique.'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <footer className="slide-footer">
                                    <div className="maintenance-tag">MAINTENANCE_LOG: <span className="text-white ml-2.5">{sd.maintenance || 'Stable'}</span></div>
                                    <div className="flex">
                                        {sd.staff?.includes('j') && <span className="pill j">Junior Prep</span>}
                                        {sd.staff?.includes('s') && <span className="pill s">Senior Lead</span>}
                                    </div>
                                </footer>
                            </div>
                        );
                    })}
                </div>

                {/* Dots Navigation */}
                <div className="dots">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={`dot ${i === current ? 'active' : ''}`}
                            onClick={() => goToSlide(i)}
                        />
                    ))}
                </div>
            </div>

            {/* Control Help */}
            <div className="mt-6 flex gap-4 text-app-muted text-[10px] font-black uppercase tracking-widest bg-app-surface px-6 py-2 rounded-full border border-app-border items-center">
                <span className="flex items-center gap-1.5"><kbd className="bg-app-bg px-1.5 py-0.5 rounded border border-app-border text-white">←</kbd> <kbd className="bg-app-bg px-1.5 py-0.5 rounded border border-app-border text-white">→</kbd> Navigate</span>
                <div className="w-px h-2 bg-app-border" />
                <span className="flex items-center gap-1.5"><kbd className="bg-app-bg px-1.5 py-0.5 rounded border border-app-border text-white">ESC</kbd> Exit Briefing</span>
                <button onClick={onExit} className="ml-4 text-app-accent hover:text-white transition-colors">Exit Presentation</button>
            </div>
        </div>
    );
};

export default CinematicSOP;
