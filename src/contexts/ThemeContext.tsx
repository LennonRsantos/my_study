import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ColorTheme = "teal" | "blue" | "purple" | "rose" | "amber" | "green" | "orange" | "slate" | "red";
export type FestiveTheme = "none" | "christmas" | "newyear" | "easter" | "halloween" | "carnival" | "valentines" | "junina";

interface ThemeContextType {
  colorTheme: ColorTheme;
  festiveTheme: FestiveTheme;
  isDark: boolean;
  setColorTheme: (t: ColorTheme) => void;
  setFestiveTheme: (t: FestiveTheme) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const COLOR_THEMES: Record<ColorTheme, { light: Record<string, string>; dark: Record<string, string>; label: string; preview: string }> = {
  teal: {
    label: "Teal (Padrão)",
    preview: "hsl(174, 62%, 40%)",
    light: {
      "--primary": "174 62% 40%",
      "--ring": "174 62% 40%",
      "--accent": "174 40% 92%",
      "--accent-foreground": "174 62% 25%",
      "--sidebar-primary": "174 62% 40%",
      "--sidebar-accent": "174 40% 94%",
      "--sidebar-accent-foreground": "174 62% 25%",
      "--sidebar-ring": "174 62% 40%",
      "--chart-1": "174 62% 40%",
    },
    dark: {
      "--primary": "174 62% 45%",
      "--ring": "174 62% 45%",
      "--accent": "174 30% 18%",
      "--accent-foreground": "174 62% 65%",
      "--sidebar-primary": "174 62% 45%",
      "--sidebar-accent": "174 25% 15%",
      "--sidebar-accent-foreground": "174 62% 65%",
      "--sidebar-ring": "174 62% 45%",
      "--chart-1": "174 62% 50%",
    },
  },
  blue: {
    label: "Azul",
    preview: "hsl(221, 83%, 53%)",
    light: {
      "--primary": "221 83% 53%",
      "--ring": "221 83% 53%",
      "--accent": "221 40% 92%",
      "--accent-foreground": "221 83% 35%",
      "--sidebar-primary": "221 83% 53%",
      "--sidebar-accent": "221 40% 94%",
      "--sidebar-accent-foreground": "221 83% 35%",
      "--sidebar-ring": "221 83% 53%",
      "--chart-1": "221 83% 53%",
    },
    dark: {
      "--primary": "221 83% 60%",
      "--ring": "221 83% 60%",
      "--accent": "221 30% 18%",
      "--accent-foreground": "221 83% 70%",
      "--sidebar-primary": "221 83% 60%",
      "--sidebar-accent": "221 25% 15%",
      "--sidebar-accent-foreground": "221 83% 70%",
      "--sidebar-ring": "221 83% 60%",
      "--chart-1": "221 83% 60%",
    },
  },
  purple: {
    label: "Roxo",
    preview: "hsl(262, 83%, 58%)",
    light: {
      "--primary": "262 83% 58%",
      "--ring": "262 83% 58%",
      "--accent": "262 40% 92%",
      "--accent-foreground": "262 83% 40%",
      "--sidebar-primary": "262 83% 58%",
      "--sidebar-accent": "262 40% 94%",
      "--sidebar-accent-foreground": "262 83% 40%",
      "--sidebar-ring": "262 83% 58%",
      "--chart-1": "262 83% 58%",
    },
    dark: {
      "--primary": "262 83% 65%",
      "--ring": "262 83% 65%",
      "--accent": "262 30% 18%",
      "--accent-foreground": "262 83% 75%",
      "--sidebar-primary": "262 83% 65%",
      "--sidebar-accent": "262 25% 15%",
      "--sidebar-accent-foreground": "262 83% 75%",
      "--sidebar-ring": "262 83% 65%",
      "--chart-1": "262 83% 65%",
    },
  },
  rose: {
    label: "Rosa",
    preview: "hsl(346, 77%, 50%)",
    light: {
      "--primary": "346 77% 50%",
      "--ring": "346 77% 50%",
      "--accent": "346 40% 92%",
      "--accent-foreground": "346 77% 35%",
      "--sidebar-primary": "346 77% 50%",
      "--sidebar-accent": "346 40% 94%",
      "--sidebar-accent-foreground": "346 77% 35%",
      "--sidebar-ring": "346 77% 50%",
      "--chart-1": "346 77% 50%",
    },
    dark: {
      "--primary": "346 77% 58%",
      "--ring": "346 77% 58%",
      "--accent": "346 30% 18%",
      "--accent-foreground": "346 77% 70%",
      "--sidebar-primary": "346 77% 58%",
      "--sidebar-accent": "346 25% 15%",
      "--sidebar-accent-foreground": "346 77% 70%",
      "--sidebar-ring": "346 77% 58%",
      "--chart-1": "346 77% 58%",
    },
  },
  amber: {
    label: "Âmbar",
    preview: "hsl(38, 92%, 50%)",
    light: {
      "--primary": "38 92% 50%",
      "--ring": "38 92% 50%",
      "--accent": "38 40% 92%",
      "--accent-foreground": "38 92% 30%",
      "--sidebar-primary": "38 92% 50%",
      "--sidebar-accent": "38 40% 94%",
      "--sidebar-accent-foreground": "38 92% 30%",
      "--sidebar-ring": "38 92% 50%",
      "--chart-1": "38 92% 50%",
    },
    dark: {
      "--primary": "38 92% 55%",
      "--ring": "38 92% 55%",
      "--accent": "38 30% 18%",
      "--accent-foreground": "38 92% 70%",
      "--sidebar-primary": "38 92% 55%",
      "--sidebar-accent": "38 25% 15%",
      "--sidebar-accent-foreground": "38 92% 70%",
      "--sidebar-ring": "38 92% 55%",
      "--chart-1": "38 92% 55%",
    },
  },
  green: {
    label: "Verde",
    preview: "hsl(142, 71%, 45%)",
    light: {
      "--primary": "142 71% 45%",
      "--ring": "142 71% 45%",
      "--accent": "142 40% 92%",
      "--accent-foreground": "142 71% 28%",
      "--sidebar-primary": "142 71% 45%",
      "--sidebar-accent": "142 40% 94%",
      "--sidebar-accent-foreground": "142 71% 28%",
      "--sidebar-ring": "142 71% 45%",
      "--chart-1": "142 71% 45%",
    },
    dark: {
      "--primary": "142 71% 50%",
      "--ring": "142 71% 50%",
      "--accent": "142 30% 18%",
      "--accent-foreground": "142 71% 65%",
      "--sidebar-primary": "142 71% 50%",
      "--sidebar-accent": "142 25% 15%",
      "--sidebar-accent-foreground": "142 71% 65%",
      "--sidebar-ring": "142 71% 50%",
      "--chart-1": "142 71% 50%",
    },
  },
  orange: {
    label: "Laranja",
    preview: "hsl(24, 95%, 53%)",
    light: {
      "--primary": "24 95% 53%",
      "--ring": "24 95% 53%",
      "--accent": "24 40% 92%",
      "--accent-foreground": "24 95% 35%",
      "--sidebar-primary": "24 95% 53%",
      "--sidebar-accent": "24 40% 94%",
      "--sidebar-accent-foreground": "24 95% 35%",
      "--sidebar-ring": "24 95% 53%",
      "--chart-1": "24 95% 53%",
    },
    dark: {
      "--primary": "24 95% 58%",
      "--ring": "24 95% 58%",
      "--accent": "24 30% 18%",
      "--accent-foreground": "24 95% 70%",
      "--sidebar-primary": "24 95% 58%",
      "--sidebar-accent": "24 25% 15%",
      "--sidebar-accent-foreground": "24 95% 70%",
      "--sidebar-ring": "24 95% 58%",
      "--chart-1": "24 95% 58%",
    },
  },
  slate: {
    label: "Cinza",
    preview: "hsl(215, 20%, 45%)",
    light: {
      "--primary": "215 20% 45%",
      "--ring": "215 20% 45%",
      "--accent": "215 15% 92%",
      "--accent-foreground": "215 20% 30%",
      "--sidebar-primary": "215 20% 45%",
      "--sidebar-accent": "215 15% 94%",
      "--sidebar-accent-foreground": "215 20% 30%",
      "--sidebar-ring": "215 20% 45%",
      "--chart-1": "215 20% 45%",
    },
    dark: {
      "--primary": "215 20% 55%",
      "--ring": "215 20% 55%",
      "--accent": "215 15% 18%",
      "--accent-foreground": "215 20% 70%",
      "--sidebar-primary": "215 20% 55%",
      "--sidebar-accent": "215 15% 15%",
      "--sidebar-accent-foreground": "215 20% 70%",
      "--sidebar-ring": "215 20% 55%",
      "--chart-1": "215 20% 55%",
    },
  },
  red: {
    label: "Vermelho",
    preview: "hsl(0, 75%, 50%)",
    light: {
      "--primary": "0 75% 50%",
      "--ring": "0 75% 50%",
      "--accent": "0 40% 92%",
      "--accent-foreground": "0 75% 35%",
      "--sidebar-primary": "0 75% 50%",
      "--sidebar-accent": "0 40% 94%",
      "--sidebar-accent-foreground": "0 75% 35%",
      "--sidebar-ring": "0 75% 50%",
      "--chart-1": "0 75% 50%",
    },
    dark: {
      "--primary": "0 80% 58%",
      "--ring": "0 80% 58%",
      "--accent": "0 30% 18%",
      "--accent-foreground": "0 80% 72%",
      "--sidebar-primary": "0 80% 58%",
      "--sidebar-accent": "0 25% 14%",
      "--sidebar-accent-foreground": "0 80% 72%",
      "--sidebar-ring": "0 80% 58%",
      "--chart-1": "0 80% 58%",
    },
  },
};

const FESTIVE_THEMES: Record<FestiveTheme, { label: string; emoji: string; light: Record<string, string>; dark: Record<string, string> }> = {
  none: { label: "Nenhum", emoji: "✨", light: {}, dark: {} },
  christmas: {
    label: "Natal",
    emoji: "🎄",
    light: {
      "--primary": "0 72% 50%",
      "--ring": "0 72% 50%",
      "--accent": "140 50% 90%",
      "--accent-foreground": "140 60% 25%",
      "--sidebar-primary": "0 72% 50%",
      "--sidebar-accent": "140 50% 92%",
      "--sidebar-accent-foreground": "140 60% 25%",
      "--sidebar-ring": "0 72% 50%",
      "--chart-1": "0 72% 50%",
      "--chart-2": "140 60% 40%",
      "--success": "140 60% 40%",
      "--background": "140 15% 97%",
    },
    dark: {
      "--primary": "0 72% 55%",
      "--ring": "0 72% 55%",
      "--accent": "140 30% 15%",
      "--accent-foreground": "140 50% 65%",
      "--sidebar-primary": "0 72% 55%",
      "--sidebar-accent": "140 25% 12%",
      "--sidebar-accent-foreground": "140 50% 65%",
      "--sidebar-ring": "0 72% 55%",
      "--chart-1": "0 72% 55%",
      "--chart-2": "140 60% 45%",
      "--success": "140 60% 45%",
      "--background": "140 20% 7%",
    },
  },
  newyear: {
    label: "Ano Novo",
    emoji: "🎆",
    light: {
      "--primary": "45 90% 48%",
      "--primary-foreground": "220 25% 10%",
      "--ring": "45 90% 48%",
      "--accent": "45 40% 90%",
      "--accent-foreground": "45 90% 30%",
      "--sidebar-primary": "45 90% 48%",
      "--sidebar-primary-foreground": "220 25% 10%",
      "--sidebar-accent": "45 40% 92%",
      "--sidebar-accent-foreground": "45 90% 30%",
      "--sidebar-ring": "45 90% 48%",
      "--chart-1": "45 90% 48%",
      "--background": "220 20% 97%",
    },
    dark: {
      "--primary": "45 90% 55%",
      "--primary-foreground": "220 25% 10%",
      "--ring": "45 90% 55%",
      "--accent": "45 25% 15%",
      "--accent-foreground": "45 90% 70%",
      "--sidebar-primary": "45 90% 55%",
      "--sidebar-primary-foreground": "220 25% 10%",
      "--sidebar-accent": "45 20% 12%",
      "--sidebar-accent-foreground": "45 90% 70%",
      "--sidebar-ring": "45 90% 55%",
      "--chart-1": "45 90% 55%",
      "--background": "230 25% 6%",
    },
  },
  easter: {
    label: "Páscoa",
    emoji: "🐣",
    light: {
      "--primary": "280 60% 60%",
      "--ring": "280 60% 60%",
      "--accent": "180 50% 90%",
      "--accent-foreground": "280 60% 35%",
      "--sidebar-primary": "280 60% 60%",
      "--sidebar-accent": "180 50% 92%",
      "--sidebar-accent-foreground": "280 60% 35%",
      "--sidebar-ring": "280 60% 60%",
      "--chart-1": "280 60% 60%",
      "--chart-2": "50 80% 55%",
      "--background": "280 20% 97%",
    },
    dark: {
      "--primary": "280 60% 65%",
      "--ring": "280 60% 65%",
      "--accent": "280 25% 18%",
      "--accent-foreground": "280 60% 75%",
      "--sidebar-primary": "280 60% 65%",
      "--sidebar-accent": "280 20% 14%",
      "--sidebar-accent-foreground": "280 60% 75%",
      "--sidebar-ring": "280 60% 65%",
      "--chart-1": "280 60% 65%",
      "--chart-2": "50 80% 60%",
      "--background": "280 20% 7%",
    },
  },
  halloween: {
    label: "Halloween",
    emoji: "🎃",
    light: {
      "--primary": "24 95% 50%",
      "--ring": "24 95% 50%",
      "--accent": "270 40% 90%",
      "--accent-foreground": "270 50% 35%",
      "--sidebar-primary": "24 95% 50%",
      "--sidebar-accent": "270 40% 92%",
      "--sidebar-accent-foreground": "270 50% 35%",
      "--sidebar-ring": "24 95% 50%",
      "--chart-1": "24 95% 50%",
      "--chart-2": "270 50% 50%",
      "--background": "30 15% 96%",
    },
    dark: {
      "--primary": "24 95% 55%",
      "--ring": "24 95% 55%",
      "--accent": "270 25% 15%",
      "--accent-foreground": "270 50% 70%",
      "--sidebar-primary": "24 95% 55%",
      "--sidebar-accent": "270 20% 12%",
      "--sidebar-accent-foreground": "270 50% 70%",
      "--sidebar-ring": "24 95% 55%",
      "--chart-1": "24 95% 55%",
      "--chart-2": "270 50% 55%",
      "--background": "270 20% 5%",
    },
  },
  carnival: {
    label: "Carnaval",
    emoji: "🎭",
    light: {
      "--primary": "280 80% 55%",
      "--ring": "280 80% 55%",
      "--accent": "50 80% 88%",
      "--accent-foreground": "280 80% 35%",
      "--sidebar-primary": "280 80% 55%",
      "--sidebar-accent": "50 80% 90%",
      "--sidebar-accent-foreground": "280 80% 35%",
      "--sidebar-ring": "280 80% 55%",
      "--chart-1": "280 80% 55%",
      "--chart-2": "170 70% 45%",
      "--chart-3": "50 80% 50%",
      "--background": "50 20% 97%",
    },
    dark: {
      "--primary": "280 80% 62%",
      "--ring": "280 80% 62%",
      "--accent": "50 30% 15%",
      "--accent-foreground": "50 80% 70%",
      "--sidebar-primary": "280 80% 62%",
      "--sidebar-accent": "50 20% 12%",
      "--sidebar-accent-foreground": "50 80% 70%",
      "--sidebar-ring": "280 80% 62%",
      "--chart-1": "280 80% 62%",
      "--chart-2": "170 70% 50%",
      "--chart-3": "50 80% 55%",
      "--background": "280 20% 6%",
    },
  },
  valentines: {
    label: "Dia dos Namorados",
    emoji: "💕",
    light: {
      "--primary": "340 80% 55%",
      "--ring": "340 80% 55%",
      "--accent": "340 40% 92%",
      "--accent-foreground": "340 80% 35%",
      "--sidebar-primary": "340 80% 55%",
      "--sidebar-accent": "340 40% 94%",
      "--sidebar-accent-foreground": "340 80% 35%",
      "--sidebar-ring": "340 80% 55%",
      "--chart-1": "340 80% 55%",
      "--background": "340 20% 97%",
    },
    dark: {
      "--primary": "340 80% 60%",
      "--ring": "340 80% 60%",
      "--accent": "340 30% 18%",
      "--accent-foreground": "340 80% 72%",
      "--sidebar-primary": "340 80% 60%",
      "--sidebar-accent": "340 25% 14%",
      "--sidebar-accent-foreground": "340 80% 72%",
      "--sidebar-ring": "340 80% 60%",
      "--chart-1": "340 80% 60%",
      "--background": "340 20% 6%",
    },
  },
  junina: {
    label: "Festa Junina",
    emoji: "🌽",
    light: {
      "--primary": "30 90% 48%",
      "--ring": "30 90% 48%",
      "--accent": "45 60% 88%",
      "--accent-foreground": "30 90% 30%",
      "--sidebar-primary": "30 90% 48%",
      "--sidebar-accent": "45 60% 90%",
      "--sidebar-accent-foreground": "30 90% 30%",
      "--sidebar-ring": "30 90% 48%",
      "--chart-1": "30 90% 48%",
      "--chart-2": "0 72% 50%",
      "--chart-3": "140 60% 40%",
      "--background": "40 20% 96%",
    },
    dark: {
      "--primary": "30 90% 55%",
      "--ring": "30 90% 55%",
      "--accent": "45 25% 15%",
      "--accent-foreground": "45 60% 70%",
      "--sidebar-primary": "30 90% 55%",
      "--sidebar-accent": "45 20% 12%",
      "--sidebar-accent-foreground": "45 60% 70%",
      "--sidebar-ring": "30 90% 55%",
      "--chart-1": "30 90% 55%",
      "--chart-2": "0 72% 55%",
      "--chart-3": "140 60% 45%",
      "--background": "30 20% 6%",
    },
  },
};

function applyThemeVars(colorTheme: ColorTheme, festiveTheme: FestiveTheme, isDark: boolean) {
  const root = document.documentElement;
  const mode = isDark ? "dark" : "light";

  // Remove all custom properties first by resetting to CSS defaults
  // We do this by removing inline styles for known vars
  const allVars = new Set<string>();
  Object.values(COLOR_THEMES).forEach((t) => {
    Object.keys(t.light).forEach((k) => allVars.add(k));
    Object.keys(t.dark).forEach((k) => allVars.add(k));
  });
  Object.values(FESTIVE_THEMES).forEach((t) => {
    Object.keys(t.light).forEach((k) => allVars.add(k));
    Object.keys(t.dark).forEach((k) => allVars.add(k));
  });
  allVars.forEach((v) => root.style.removeProperty(v));

  // Apply color theme (only if no festive theme overrides)
  if (festiveTheme === "none") {
    const vars = COLOR_THEMES[colorTheme][mode];
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  } else {
    // Festive theme overrides everything
    const vars = FESTIVE_THEMES[festiveTheme][mode];
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() =>
    (localStorage.getItem("color-theme") as ColorTheme) || "teal"
  );
  const [festiveTheme, setFestiveThemeState] = useState<FestiveTheme>(() =>
    (localStorage.getItem("festive-theme") as FestiveTheme) || "none"
  );
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const setColorTheme = (t: ColorTheme) => {
    setColorThemeState(t);
    localStorage.setItem("color-theme", t);
  };

  const setFestiveTheme = (t: FestiveTheme) => {
    setFestiveThemeState(t);
    localStorage.setItem("festive-theme", t);
  };

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    applyThemeVars(colorTheme, festiveTheme, isDark);
  }, [colorTheme, festiveTheme, isDark]);

  return (
    <ThemeContext.Provider value={{ colorTheme, festiveTheme, isDark, setColorTheme, setFestiveTheme, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { COLOR_THEMES, FESTIVE_THEMES };
