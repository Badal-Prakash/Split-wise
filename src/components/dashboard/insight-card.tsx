"use client";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface InsightCardProps {
  title: string;
  description: string;
  type: "positive" | "warning" | "info";
}

export function InsightCard({ title, description, type }: InsightCardProps) {
  const colors = {
    positive: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    info: "border-sky-500/30 bg-sky-500/5 text-sky-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`relative overflow-hidden rounded-2xl border p-4 backdrop-blur-sm transition-all ${colors[type]}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-current p-1 text-white opacity-20">
          <Sparkles size={14} />
        </div>
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs opacity-80 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="absolute -right-1 -top-1 h-12 w-12 bg-current blur-3xl opacity-10" />
    </motion.div>
  );
}
