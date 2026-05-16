import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 500: "#10b981", 600: "#059669" } } } },
  plugins: []
} satisfies Config;
