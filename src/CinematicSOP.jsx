import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useSettings } from './SettingsContext';

/**
 * CinematicSOP Component
 * Self-fetching Brigade SOP briefing slider.
 * Reads from the dedicated `sop_presentations` table.
 *
 * @param {string} clientId      - The client_id to query (e.g. 'kabile')
 * @param {string} initialDishName - Optional dish name to start on
 * @param {Function} onExit      - Callback to close the view
 */
const CinematicSOP = ({ clientId = 'kabile', initialDishName, onExit }) => {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [current, setCurrent] = useState(0);
    const { language, volumeFocus, translateIngredient } = useSettings();

    // ── Fetch from sop_presentations ─────────────────────────────────────────
    useEffect(() => {
        async function fetchPresentations() {
            setLoading(true);
            setError(null);
            const { data, error: fetchError } = await supabase
                .from('sop_presentations')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: true });

            if (fetchError) {
                console.error('sop_presentations fetch error:', fetchError);
                setError(fetchError.message);
            } else {
                const parsed = (data || []).map(row => ({
                    id: row.id,
                    dish_name: row.dish_name,
                    data: typeof row.presentation_json === 'string'
                        ? JSON.parse(row.presentation_json)
                        : row.presentation_json,
                }));
                setSlides(parsed);

                // Jump to initial dish if provided
                if (initialDishName) {
                    const idx = parsed.findIndex(s =>
                        s.dish_name?.toLowerCase() === initialDishName?.toLowerCase()
                    );
                    if (idx >= 0) setCurrent(idx);
                }
            }
            setLoading(false);
        }
        fetchPresentations();
    }, [clientId, initialDishName]);

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

    const p = slides[current]?.data || {};

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="cinematic-presentation-container flex flex-col items-center py-10 min-h-[800px]">
            <style>{`
        .slider-window {
          width: 1280px;
          height: 720px;
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
          min-width: 1280px;
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
          grid-template-columns: 1fr 400px;
          gap: 20px;
          padding: 30px 50px;
        }

        .timeline-column {
          display: grid;
          grid-template-rows: repeat(3, 1fr);
          gap: 15px;
        }

        .op-card {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 20px;
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
        .logic-module { background: var(--surface-low); border: 1px solid var(--border); padding: 20px; border-radius: 4px; }
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
      `}</style>

            <div className="slider-window">
                {/* Navigation Buttons */}
                <button className="nav-btn prev" onClick={() => moveSlide(-1)}>
                    <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button className="nav-btn next" onClick={() => moveSlide(1)}>
                    <i className="fa-solid fa-chevron-right"></i>
                </button>

                {/* Slides Container */}
                <div className="slides-container" style={{ transform: `translateX(-${current * 1280}px)` }}>
                    {slides.map((slide, index) => {
                        const sd = slide.data || {};
                        return (
                            <div key={slide.id} className="slide">
                                <header className="slide-header">
                                    <div className="header-title-box" style={{ minWidth: '400px' }}>
                                        <p>{sd.meta || 'RECIPE // BRIGADE_SOP'}</p>
                                        <div className="flex items-center gap-3">
                                            <h2>{translateIngredient((sd.title || slide.dish_name || '').replace(/^\d+[\s.\-_]*/, ''))}</h2>
                                            <div className="bg-app-accent/10 border border-app-accent/30 px-2 py-1 rounded text-[10px] font-black text-app-accent uppercase tracking-widest">
                                                {volumeFocus} PPL Focus
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dish-mission">
                                        <span className="mission-label">Training Focus // Dish Mission</span>
                                        <ul className="mission-list">
                                            {sd.mission?.map((m, i) => <li key={i}>{m}</li>) || (
                                                <>
                                                    <li>Follow standard technique for optimal yield</li>
                                                    <li>Ensure station organization before start</li>
                                                    <li>Maintain quality standards at all times</li>
                                                </>
                                            )}
                                        </ul>
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
                                                    <ul>{sd.weekly?.batch?.map((b, i) => <li key={i}>{b}</li>) || <li>Standard Batch</li>}</ul>
                                                </div>
                                                <div className="bullet-item">
                                                    <h4>Min. Quantity</h4>
                                                    <ul>{sd.weekly?.buffer?.map((b, i) => <li key={i}>{b}</li>) || <li>Maintain Buffer</li>}</ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Morning Ops */}
                                        <div className="op-card active-phase">
                                            <span className="op-label"><i className="fa-solid fa-sun text-[12px]"></i> Daily Morning Operations</span>
                                            <div className="bullet-grid">
                                                <div className="bullet-item">
                                                    <h4>Daily Prep</h4>
                                                    <ul>{sd.morning?.tasks?.map((t, i) => <li key={i}>{t}</li>) || <li>Follow SOP</li>}</ul>
                                                </div>
                                                <div className="bullet-item">
                                                    <h4>Forward Prep</h4>
                                                    <ul>{sd.morning?.forward?.map((f, i) => <li key={i}>{f}</li>) || <li>Check Delivery</li>}</ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Service Execution */}
                                        <div className="op-card">
                                            <span className="op-label"><i className="fa-solid fa-bolt text-[12px]"></i> Pre-Service Execution</span>
                                            <div className="bullet-grid">
                                                <div className="bullet-item">
                                                    <h4>Service Setup</h4>
                                                    <ul>{sd.service?.setup?.map((s, i) => <li key={i}>{s}</li>) || <li>Line check</li>}</ul>
                                                </div>
                                                <div className="bullet-item">
                                                    <h4>Garnish Logic</h4>
                                                    <ul>
                                                        {sd.service?.garnish ? (
                                                            sd.service.garnish.map((g, i) => <li key={i}>{g}</li>)
                                                        ) : (
                                                            <li>Standard garnish</li>
                                                        )}
                                                    </ul>
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
                                                    <span className="intel-value">{sd.holding?.method || 'COLD STORE'}</span>
                                                </div>
                                                <div className="intel-spec-item">
                                                    <span className="intel-label">Shelf Life Limit</span>
                                                    <span className="intel-value">{sd.holding?.limit || '3 DAYS'}</span>
                                                </div>
                                                <div className="intel-spec-item">
                                                    <span className="intel-label">Holding Temp</span>
                                                    <span className="intel-value">{sd.holding?.temp || '2-4°C'}</span>
                                                </div>
                                                <div className="intel-spec-item">
                                                    <span className="intel-label">Audit Frequency</span>
                                                    <span className="intel-value">EVERY SESSION</span>
                                                </div>
                                                {sd.maintenance && (
                                                    <div className="intel-spec-item intel-caution">
                                                        <span className="intel-label">CRITICAL MANAGER CAUTION</span>
                                                        <span className="intel-value">{sd.maintenance}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Strategy Module */}
                                        <div className="logic-module strategy">
                                            <span className="strategy-header"><i className="fa-solid fa-gauge-high"></i> Chef Strategy // Tips</span>
                                            <div className="stat-line"><span>Focus</span><span>{sd.strategy?.method || 'SOP Standard'}</span></div>
                                            <div className="stat-line"><span>Execution</span><span>{sd.strategy?.temp || 'N/A'}</span></div>
                                            <div className="stat-line"><span>Tips & Tricks</span><span>{sd.strategy?.tips || '—'}</span></div>
                                            <p className="text-[10px] text-[#94a3b8] mt-[12px] leading-relaxed">{sd.strategy?.note || 'Follow master technique.'}</p>
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
