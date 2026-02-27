import React from 'react';
import {
    X,
    Moon,
    Sun,
    Globe,
    Scale,
    Gauge,
    Check,
    Settings as SettingsIcon,
    Layout,
    Type,
    Languages
} from 'lucide-react';
import { useSettings } from './SettingsContext';

const SettingsModal = ({ isOpen, onClose }) => {
    const {
        theme,
        setTheme,
        language,
        setLanguage,
        unitSystem,
        setUnitSystem,
        country,
        setCountry,
        volumeFocus,
        setVolumeFocus,
        batchSettings,
        setBatchSettings
    } = useSettings();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-app-border bg-app-bg/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-app-accent/10 p-2 rounded-lg text-app-accent">
                            <SettingsIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-app-text">System Settings</h2>
                            <p className="text-[10px] font-bold text-app-muted uppercase">Global Preferences</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scroll">

                    {/* Theme Selection */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Layout size={14} className="text-app-accent" />
                            <label className="text-[10px] font-black uppercase tracking-widest text-app-muted">Visual Theme</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-app-accent/10 border-app-accent text-app-text ring-1 ring-app-accent/20' : 'bg-app-bg border-app-border text-app-muted hover:border-app-muted'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Moon size={18} />
                                    <span className="font-bold text-xs uppercase">Dark Mode</span>
                                </div>
                                {theme === 'dark' && <Check size={14} className="text-app-accent" />}
                            </button>
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${theme === 'light' ? 'bg-white border-app-accent text-slate-900 ring-1 ring-app-accent/20 shadow-lg shadow-blue-500/5' : 'bg-app-bg border-app-border text-app-muted hover:border-app-muted'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Sun size={18} />
                                    <span className="font-bold text-xs uppercase">Light Mode</span>
                                </div>
                                {theme === 'light' && <Check size={14} className="text-app-accent" />}
                            </button>
                        </div>
                    </section>

                    {/* Language Selection */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Languages size={14} className="text-app-accent" />
                            <label className="text-[10px] font-black uppercase tracking-widest text-app-muted">Display Language</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setLanguage('EN')}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${language === 'EN' ? 'bg-app-accent/10 border-app-accent text-app-text' : 'bg-app-bg border-app-border text-app-muted'}`}
                            >
                                <span className="font-bold text-xs uppercase">English (SOP)</span>
                                {language === 'EN' && <Check size={14} className="text-app-accent" />}
                            </button>
                            <button
                                onClick={() => setLanguage('TR')}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${language === 'TR' ? 'bg-app-accent/10 border-app-accent text-app-text' : 'bg-app-bg border-app-border text-app-muted'}`}
                            >
                                <span className="font-bold text-xs uppercase">Türkçe (SOP)</span>
                                {language === 'TR' && <Check size={14} className="text-app-accent" />}
                            </button>
                        </div>
                    </section>

                    {/* Company Region & Operational Scale */}
                    <section className="space-y-6 pt-2">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <Globe size={14} className="text-app-accent" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-app-muted">Company Region</label>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {['TR', 'UK', 'USA', 'GER', 'OTHER'].map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setCountry(c)}
                                        className={`flex items-center justify-between p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${country === c ? 'bg-app-accent/10 border-app-accent text-app-text' : 'bg-app-bg border-app-border text-app-muted'}`}
                                    >
                                        {c === 'TR' ? 'Turkey' : c === 'GER' ? 'Germany' : c}
                                        {country === c && <Check size={12} className="text-app-accent" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <Gauge size={14} className="text-app-accent" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-app-muted">Volume Focus (Portions)</label>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[50, 100, 300, 600].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setVolumeFocus(v)}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${volumeFocus === v ? 'bg-app-accent/10 border-app-accent text-app-text' : 'bg-app-bg border-app-border text-app-muted'}`}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-black text-xs uppercase">{v}{v === 600 ? '+' : ''}</span>
                                            <span className="text-[8px] font-bold opacity-60">Daily Volume</span>
                                        </div>
                                        {volumeFocus === v && <Check size={14} className="text-app-accent" />}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-app-muted font-bold uppercase mt-2 px-1">
                                Adjusts prep methods, processing tiers, and task complexity.
                            </p>
                        </div>
                    </section>

                    {/* Unit System */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Scale size={14} className="text-app-accent" />
                            <label className="text-[10px] font-black uppercase tracking-widest text-app-muted">Unit Standards</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setUnitSystem('metric')}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${unitSystem === 'metric' ? 'bg-app-accent/10 border-app-accent text-app-text' : 'bg-app-bg border-app-border text-app-muted'}`}
                            >
                                <span className="font-bold text-xs uppercase">Metric (L/KG/ml)</span>
                                {unitSystem === 'metric' && <Check size={14} className="text-app-accent" />}
                            </button>
                            <button
                                onClick={() => setUnitSystem('imperial')}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${unitSystem === 'imperial' ? 'bg-app-accent/10 border-app-accent text-app-text' : 'bg-app-bg border-app-border text-app-muted'}`}
                            >
                                <span className="font-bold text-xs uppercase">Imperial (OZ/LB)</span>
                                {unitSystem === 'imperial' && <Check size={14} className="text-app-accent" />}
                            </button>
                        </div>
                    </section>

                    {/* Batch Defaults */}
                    <section className="space-y-4 pt-4 border-t border-app-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Gauge size={14} className="text-app-accent" />
                            <label className="text-[10px] font-black uppercase tracking-widest text-app-muted">Batch Calculations</label>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-app-bg/50 p-4 rounded-xl border border-app-border">
                                <div>
                                    <p className="text-xs font-bold text-app-text uppercase">Standard Batch Size (Min)</p>
                                    <p className="text-[9px] text-app-muted uppercase font-bold">Default portions per production batch</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={batchSettings.defaultPortionsPerBatch}
                                        onChange={(e) => setBatchSettings({ ...batchSettings, defaultPortionsPerBatch: parseInt(e.target.value) || 50 })}
                                        className="w-16 bg-app-bg border border-app-border rounded px-2 py-1 text-right font-black text-app-accent outline-none"
                                    />
                                    <span className="text-[10px] font-black text-app-muted">PPL</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 bg-app-bg/50 border-t border-app-border">
                    <button
                        onClick={onClose}
                        className="w-full bg-app-accent text-app-bg font-black uppercase text-xs tracking-widest py-4 rounded-xl hover:scale-[0.98] transition-all"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
