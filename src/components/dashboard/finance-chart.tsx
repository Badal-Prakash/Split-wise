"use client";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

interface FinanceChartProps {
  children: React.ReactElement;
  height?: string | number;
}

export function FinanceChart({ children, height = "h-64" }: FinanceChartProps) {
  return (
    <div className={`w-full ${height} relative group`}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-white/20 bg-slate-900/80 p-2 text-xs text-white backdrop-blur-md shadow-xl">
      <p className="font-medium mb-1 opacity-70">{label}</p>
      {payload.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}: <b>{item.value}</b></span>
        </div>
      ))}
    </div>
  );
}
