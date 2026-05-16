"use client"; import { useTheme } from "next-themes";
export function ThemeToggle(){const {theme,setTheme}=useTheme(); return <button className="rounded-xl border px-3 py-2" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>Toggle theme</button>}
