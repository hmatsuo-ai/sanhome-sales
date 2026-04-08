"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "light",
    setTheme: () => {},
});

function getStoredTheme(): Theme {
    if (typeof window === "undefined") return "light";
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light");

    useEffect(() => {
        const stored = getStoredTheme();
        setThemeState(stored);
        applyTheme(stored);
    }, []);

    const setTheme = (next: Theme) => {
        setThemeState(next);
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
