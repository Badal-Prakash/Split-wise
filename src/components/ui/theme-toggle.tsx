"use client";

import { Moon } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button aria-label="Toggle theme" title="Toggle theme" className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} type="button">
      <Moon size={18} />
    </button>
  );
}
