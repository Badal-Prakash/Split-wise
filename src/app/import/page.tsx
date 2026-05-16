"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, EmptyState, Field, inputClass, LoadingRows, StatusBanner } from "@/components/app/ui";
import { apiRequest } from "@/lib/api-client";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      setPreview(await apiRequest("/api/import/splitwise", { method: "POST", body: form }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to parse import");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header><p className="text-sm text-slate-500">CSV/XLSX import wizard</p><h2 className="text-2xl font-bold">Import Splitwise export</h2></header>
        <form onSubmit={submit} className="card grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          {error && <div className="md:col-span-2"><StatusBanner kind="error">{error}</StatusBanner></div>}
          <Field label="Export file"><input type="file" accept=".csv,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={inputClass} required /></Field>
          <button disabled={loading} className={buttonClass}><Upload size={16} />{loading ? "Parsing..." : "Preview import"}</button>
        </form>
        {loading && <LoadingRows />}
        {preview ? <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="card"><p className="text-sm text-slate-500">Expenses</p><b className="text-2xl">{preview.summary.expenses}</b></div>
            <div className="card"><p className="text-sm text-slate-500">Settlements</p><b className="text-2xl">{preview.summary.settlements}</b></div>
            <div className="card"><p className="text-sm text-slate-500">Groups</p><b className="text-2xl">{preview.summary.groups}</b></div>
            <div className="card"><p className="text-sm text-slate-500">Duplicates</p><b className="text-2xl">{preview.duplicates.length}</b></div>
          </div>
          {preview.errors.length ? <StatusBanner kind="error">{preview.errors.length} rows need attention before final import.</StatusBanner> : <StatusBanner kind="success">Validation passed. Rollback token: {preview.rollbackToken}</StatusBanner>}
          <div className="card overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200 dark:border-slate-800"><th className="p-2">Row</th><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Description</th><th className="p-2">Group</th><th className="p-2">Paid by</th><th className="p-2">Owed by</th><th className="p-2">Amount</th></tr></thead><tbody>{preview.rows.slice(0, 100).map((row: any) => <tr key={row.row} className="border-b border-slate-100 dark:border-slate-800"><td className="p-2">{row.row}</td><td className="p-2">{row.date}</td><td className="p-2">{row.type}</td><td className="p-2">{row.description}</td><td className="p-2">{row.group}</td><td className="p-2">{row.paidBy}</td><td className="p-2">{row.owedBy}</td><td className="p-2">{row.currency} {row.cost}</td></tr>)}</tbody></table></div>
        </div> : <EmptyState title="No file preview yet" body="Upload a Splitwise CSV or XLSX export to validate mapping, duplicates, conflicts, and rollback metadata." />}
      </section>
    </AppShell>
  );
}
