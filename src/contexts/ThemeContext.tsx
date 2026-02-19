import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  themeMode: ThemeMode;
  accentColor: string;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  saveThemeSettings: () => Promise<void>;
  saving: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getLuminance(hex: string): number {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const DEFAULT_ACCENT = "#FFC300";
const CACHE_KEY = "modogestor_theme";

function getCachedTheme(): { mode: ThemeMode; accent: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if ((parsed.mode === "light" || parsed.mode === "dark") && /^#[0-9A-Fa-f]{6}$/.test(parsed.accent)) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function setCachedTheme(mode: ThemeMode, accent: string) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ mode, accent })); } catch { /* ignore */ }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useTenant();
  const cached = getCachedTheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(cached?.mode ?? "dark");
  const [accentColor, setAccentColor] = useState(cached?.accent ?? DEFAULT_ACCENT);
  const [saving, setSaving] = useState(false);

  // Sync from tenant settings (source of truth) and update cache
  useEffect(() => {
    if (currentTenant?.settings) {
      const s = currentTenant.settings as any;
      const newMode = (s.theme_mode === "light" || s.theme_mode === "dark") ? s.theme_mode : themeMode;
      const newAccent = (s.accent_color && /^#[0-9A-Fa-f]{6}$/.test(s.accent_color)) ? s.accent_color : accentColor;
      setThemeMode(newMode);
      setAccentColor(newAccent);
      setCachedTheme(newMode, newAccent);
    }
  }, [currentTenant]);

  // Apply theme mode class
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [themeMode]);

  // Apply accent color
  useEffect(() => {
    const root = document.documentElement;
    const hsl = hexToHSL(accentColor);
    const hslStr = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    root.style.setProperty("--primary", hslStr);
    root.style.setProperty("--accent", hslStr);
    root.style.setProperty("--ring", hslStr);
    root.style.setProperty("--sidebar-primary", hslStr);
    root.style.setProperty("--sidebar-ring", hslStr);

    // Calculate foreground based on luminance
    const lum = getLuminance(accentColor);
    const fg = lum > 0.4 ? "0 0% 10%" : "0 0% 98%";
    root.style.setProperty("--primary-foreground", fg);
    root.style.setProperty("--accent-foreground", fg);
    root.style.setProperty("--sidebar-primary-foreground", fg);

    // Hover variant
    const hoverL = Math.max(hsl.l - 5, 0);
    root.style.setProperty("--primary-hover", `${hsl.h} ${hsl.s}% ${hoverL}%`);
    root.style.setProperty("--accent-hover", `${hsl.h} ${hsl.s}% ${hoverL}%`);

    // Chart-1
    root.style.setProperty("--chart-1", hslStr);
  }, [accentColor]);

  const saveThemeSettings = async () => {
    if (!currentTenant) return;
    setSaving(true);
    setCachedTheme(themeMode, accentColor);
    try {
      const existingSettings = (currentTenant.settings as any) || {};
      await supabase
        .from("tenants")
        .update({
          settings: {
            ...existingSettings,
            theme_mode: themeMode,
            accent_color: accentColor,
          },
        })
        .eq("id", currentTenant.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, accentColor, setThemeMode, setAccentColor, saveThemeSettings, saving }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeConfig() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeConfig must be used within ThemeProvider");
  return ctx;
}
