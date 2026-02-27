import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => localStorage.getItem('sop-theme') || 'dark');
    const [language, setLanguage] = useState(() => localStorage.getItem('sop-lang') || 'EN');
    const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('sop-units') || 'metric'); // metric (ml/L/g/kg)
    const [country, setCountry] = useState(() => localStorage.getItem('sop-country') || 'TR');
    const [volumeFocus, setVolumeFocus] = useState(() => parseInt(localStorage.getItem('sop-volume-focus')) || 50);
    const [batchSettings, setBatchSettings] = useState(() => {
        const saved = localStorage.getItem('sop-batch-settings');
        return saved ? JSON.parse(saved) : {
            defaultPortionsPerBatch: 50,
            minPortions: 50
        };
    });

    useEffect(() => {
        localStorage.setItem('sop-theme', theme);
        document.documentElement.className = theme;
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('sop-lang', language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem('sop-units', unitSystem);
    }, [unitSystem]);

    useEffect(() => {
        localStorage.setItem('sop-country', country);
    }, [country]);

    useEffect(() => {
        localStorage.setItem('sop-volume-focus', volumeFocus);
    }, [volumeFocus]);

    useEffect(() => {
        localStorage.setItem('sop-batch-settings', JSON.stringify(batchSettings));
    }, [batchSettings]);

    // Simple Ingredient Translation Dictionary
    const DICTIONARY = {
        'chicken': 'Tavuk',
        'onion': 'Soğan',
        'garlic': 'Sarımsak',
        'ginger': 'Zencefil',
        'carrot': 'Havuç',
        'cabbage': 'Lahana',
        'napa cabbage': 'Çin Lahanası',
        'water': 'Su',
        'salt': 'Tuz',
        'sugar': 'Şeker',
        'soy sauce': 'Soya Sosu',
        'sesame oil': 'Susam Yağı',
        'vinegar': 'Sirke',
        'flour': 'Un',
        'oil': 'Yağ',
        'beef': 'Dana Eti',
        'pork': 'Domuz Eti', // Note: User might not use this in certain contexts
        'egg': 'Yumurta',
        'milk': 'Süt',
        'cream': 'Krema',
        'butter': 'Tereyağı',
        'pepper': 'Biber',
        'black pepper': 'Karabiber',
        'rice': 'Pirinç',
        'potato': 'Patates',
        'honey': 'Bal',
        'green onion': 'Yeşil Soğan',
        'scallion': 'Taze Soğan',
        'leek': 'Pırasa',
        'mushroom': 'Mantar',
        'cucumber': 'Salatalık',
        'radish': 'Turp',
        'daikon': 'Japon Turpu',
        'shrimp': 'Karides',
        'fish': 'Balık',
        'salmon': 'Somon',
        'tuna': 'Ton Balığı',
        'seaweed': 'Deniz Yosunu',
        'tofu': 'Soya Peyniri (Tofu)',
        'sesame seeds': 'Susam',
        'lemon': 'Limon',
        'lime': 'Misket Limonu',
        'chili': 'Acı Biber',
        'chili flakes': 'Pul Biber',
        'paste': 'Macun / Salça'
    };

    const PROTECTED_TERMS = ['kimchi', 'gochujang', 'miso', 'gochugaru', 'tteokbokki', 'katsu', 'bulgogi', 'bibimbap'];

    const translateIngredient = (name) => {
        if (!name || language === 'EN') return name;

        const lowerName = name.toLowerCase().trim();

        // Check if protected
        if (PROTECTED_TERMS.some(term => lowerName.includes(term))) {
            return name;
        }

        // Try exact match in dictionary
        if (DICTIONARY[lowerName]) {
            return DICTIONARY[lowerName];
        }

        // Try partial match if it's a phrase
        for (const [en, tr] of Object.entries(DICTIONARY)) {
            if (lowerName.includes(en)) {
                // Return the Turkish equivalent or attempt a basic replace
                return lowerName.replace(en, tr);
            }
        }

        return name;
    };

    const value = {
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
        setBatchSettings,
        translateIngredient,
        toggleTheme: () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
