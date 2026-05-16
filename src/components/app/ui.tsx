"use client";

import { X } from "lucide-react";

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/50 p-0 backdrop-blur-sm md:place-items-center md:p-6">
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950 md:max-w-3xl md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-900"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-600 dark:text-slate-300"><span className="mb-1 block">{label}</span>{children}</label>;
}

export const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950";
export const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60";
export const ghostButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900";

export function StatusBanner({ kind = "info", children }: { kind?: "info" | "error" | "success"; children: React.ReactNode }) {
  const color = kind === "error" ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300" : kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
  return <div className={`rounded-xl border p-3 text-sm ${color}`}>{children}</div>;
}
