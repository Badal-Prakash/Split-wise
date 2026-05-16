"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  color: string;
}

export function KPICard({ title, value, trend, trendLabel, icon: Icon, color }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md dark:border-slate-700/30 dark:bg-slate-900/20"
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${color} bg-opacity-20 text-current`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            <span>{trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%</span>
            <span className="text-slate-400">{trendLabel}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500">{title}</p>
        <motion.h3
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-2xl font-bold tracking-tight"
        >
          {value}
        </motion.h3>
      </div>
      <div className="absolute -bottom-2 -right-2 h-24 w-24 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-2xl" />
    </motion.div>
  );
}
