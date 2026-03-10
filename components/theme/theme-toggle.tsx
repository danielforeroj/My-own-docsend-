"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme-preference";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initialTheme = saved === "light" || saved === "dark" ? saved : getSystemTheme();

    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const manual = window.localStorage.getItem(STORAGE_KEY);
      if (manual) return;
      const system = getSystemTheme();
      setTheme(system);
      applyTheme(system);
    };

    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  const toggle = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  if (!mounted) {
    return <div className={compact ? "h-8 w-8" : "h-9 w-28"} aria-hidden="true" />;
  }

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={compact ? "btn-inline btn-inline-compact p-0 w-8" : "btn-inline btn-inline-compact"}
    >
      <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center">
        {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      </span>
      {compact ? <span className="sr-only">{label}</span> : <span>{isDark ? "Light" : "Dark"} mode</span>}
    </button>
  );
}
