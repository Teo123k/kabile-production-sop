import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

const safeParseJSON = (raw, fallback) => {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.warn('[Settings] Invalid JSON in localStorage, using fallback.', e);
        return fallback;
    }
};

export const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => localStorage.getItem('sop-theme') || 'dark');
    const [language, setLanguage] = useState(() => localStorage.getItem('sop-lang') || 'EN');
    const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('sop-units') || 'metric'); // metric (ml/L/g/kg)
    const [country, setCountry] = useState(() => localStorage.getItem('sop-country') || 'TR');
    const [mainPortionSize, setMainPortionSize] = useState(() => parseInt(localStorage.getItem('sop-main-portion')) || 250);
    const [sidePortionSize, setSidePortionSize] = useState(() => parseInt(localStorage.getItem('sop-side-portion')) || 100);
    const [starterPortionSize, setStarterPortionSize] = useState(() => parseInt(localStorage.getItem('sop-starter-portion')) || 150);
    const [portionWeightStew, setPortionWeightStew] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-stew')) || 380);
    const [portionWeightMeatStirFry, setPortionWeightMeatStirFry] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-meat-stir-fry')) || 300);
    const [portionWeightVegStirFry, setPortionWeightVegStirFry] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-veg-stir-fry')) || 280);
    const [portionWeightCurry, setPortionWeightCurry] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-curry')) || 350);
    const [portionWeightCarb, setPortionWeightCarb] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-carb')) || 250);
    const [portionWeightMainCarb, setPortionWeightMainCarb] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-main-carb')) || 420);
    const [portionWeightSide, setPortionWeightSide] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-side-class')) || 90);
    const [portionWeightSalad, setPortionWeightSalad] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-salad')) || 120);
    const [portionWeightMarinade, setPortionWeightMarinade] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-marinade')) || 120);
    const [portionWeightComponent, setPortionWeightComponent] = useState(() => parseInt(localStorage.getItem('sop-portion-weight-component')) || 120);
    const [volumeFocus, setVolumeFocus] = useState(() => parseInt(localStorage.getItem('sop-volume-focus')) || 50);
    const [portionsPerBatch, setPortionsPerBatch] = useState(() => parseInt(localStorage.getItem('sop-portions-per-batch')) || 50);
    const [menuMix, setMenuMix] = useState(() => {
        const saved = localStorage.getItem('sop-menu-mix');
        // Default example mix for a few key items if none exists
        return safeParseJSON(saved, { 'korean-fire-chicken': 30, 'korean-fried-chicken': 40, 'kimchi': 100 });
    });
    const [batchSettings, setBatchSettings] = useState(() => {
        const saved = localStorage.getItem('sop-batch-settings');
        return safeParseJSON(saved, {
            defaultPortionsPerBatch: 50,
            minPortions: 50
        });
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
        localStorage.setItem('sop-portions-per-batch', portionsPerBatch);
    }, [portionsPerBatch]);

    useEffect(() => {
        localStorage.setItem('sop-main-portion', mainPortionSize);
    }, [mainPortionSize]);

    useEffect(() => {
        localStorage.setItem('sop-side-portion', sidePortionSize);
    }, [sidePortionSize]);

    useEffect(() => {
        localStorage.setItem('sop-starter-portion', starterPortionSize);
    }, [starterPortionSize]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-stew', portionWeightStew);
    }, [portionWeightStew]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-meat-stir-fry', portionWeightMeatStirFry);
    }, [portionWeightMeatStirFry]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-veg-stir-fry', portionWeightVegStirFry);
    }, [portionWeightVegStirFry]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-curry', portionWeightCurry);
    }, [portionWeightCurry]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-carb', portionWeightCarb);
    }, [portionWeightCarb]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-main-carb', portionWeightMainCarb);
    }, [portionWeightMainCarb]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-side-class', portionWeightSide);
    }, [portionWeightSide]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-salad', portionWeightSalad);
    }, [portionWeightSalad]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-marinade', portionWeightMarinade);
    }, [portionWeightMarinade]);

    useEffect(() => {
        localStorage.setItem('sop-portion-weight-component', portionWeightComponent);
    }, [portionWeightComponent]);

    useEffect(() => {
        localStorage.setItem('sop-menu-mix', JSON.stringify(menuMix));
    }, [menuMix]);

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
        translateIngredient,
        toggleTheme: () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
