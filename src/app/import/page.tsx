"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, EmptyState, Field, inputClass, LoadingRows, StatusBanner } from "@/components/app/ui";
import { apiRequest } from "@/lib/api-client";

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [groupId, setGroupId] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [userMapping, setUserMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => apiRequest<any[]>("/api/groups") });
  const selectedGroup = useMemo(() => groups.data?.find((group) => group._id === groupId), [groups.data, groupId]);

  function suggestedMapping(participants: string[]) {
    const members = selectedGroup?.members ?? [];
    return Object.fromEntries(participants.map((sourceName) => {
      const source = normalizeName(sourceName);
      const matched = members.find((member: any) => {
        const name = normalizeName(member.name ?? "");
        const email = normalizeName(member.email ?? "");
        return name === source || name.includes(source) || source.includes(name) || email.includes(source);
      });
      return [sourceName, matched?._id ?? ""];
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("groupId", groupId);
      const nextPreview = await apiRequest<any>("/api/import/splitwise", { method: "POST", body: form });
      setPreview(nextPreview);
      setUserMapping(suggestedMapping(nextPreview.participants ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to parse import");
    } finally {
      setLoading(false);
    }
  }

  async function runImport() {
    if (!file || !groupId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("groupId", groupId);
      form.set("mode", "import");
      form.set("userMapping", JSON.stringify(userMapping));
      const imported = await apiRequest<any>("/api/import/splitwise", { method: "POST", body: form });
      setPreview(imported);
      const result = imported.importResult;
      setSuccess(`Imported ${result.createdExpenses} expenses and ${result.createdSettlements} payments. Skipped ${result.skippedDuplicates} duplicates.`);
      if (result.errors?.length) setError(`${result.errors.length} rows could not be imported. Check the preview table.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to import file");
    } finally {
      setLoading(false);
    }
  }

  const allMapped = preview?.participants?.length && preview.participants.every((name: string) => userMapping[name]);

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header><p className="text-sm text-slate-500">CSV/XLSX import wizard</p><h2 className="text-2xl font-bold">Import Splitwise export</h2></header>
        <form onSubmit={submit} className="card grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          {error && <div className="md:col-span-3"><StatusBanner kind="error">{error}</StatusBanner></div>}
          {success && <div className="md:col-span-3"><StatusBanner kind="success">{success}</StatusBanner></div>}
          <Field label="Group"><select value={groupId} onChange={(event) => { setGroupId(event.target.value); setPreview(null); }} className={inputClass} required><option value="">Select group</option>{groups.data?.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}</select></Field>
          <Field label="Export file"><input type="file" accept=".csv,.xlsx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} className={inputClass} required /></Field>
          <button disabled={loading || !groupId} className={buttonClass}><Upload size={16} />{loading ? "Parsing..." : "Preview"}</button>
        </form>
        {loading && <LoadingRows />}
        {preview ? <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="card"><p className="text-sm text-slate-500">Expenses</p><b className="text-2xl">{preview.summary.expenses}</b></div>
            <div className="card"><p className="text-sm text-slate-500">Payments</p><b className="text-2xl">{preview.summary.settlements}</b></div>
            <div className="card"><p className="text-sm text-slate-500">People</p><b className="text-2xl">{preview.participants.length}</b></div>
            <div className="card"><p className="text-sm text-slate-500">Duplicates</p><b className="text-2xl">{preview.duplicates.length}</b></div>
          </div>
          {preview.errors.length ? <StatusBanner kind="error">{preview.errors.length} rows need attention before final import.</StatusBanner> : <StatusBanner kind="success">Preview parsed. Map every person, then import.</StatusBanner>}
          <div className="card space-y-3">
            <h3 className="font-semibold">Map people</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {preview.participants.map((sourceName: string) => <Field key={sourceName} label={sourceName}><select value={userMapping[sourceName] ?? ""} onChange={(event) => setUserMapping((mapping) => ({ ...mapping, [sourceName]: event.target.value }))} className={inputClass}><option value="">Choose app user</option>{selectedGroup?.members?.map((member: any) => <option key={member._id} value={member._id}>{member.name} ({member.email})</option>)}</select></Field>)}
            </div>
            <button type="button" disabled={loading || !allMapped || preview.errors.length > 0} onClick={runImport} className={buttonClass}>Import to {selectedGroup?.name ?? "group"}</button>
          </div>
          {preview.importResult?.errors?.length ? <div className="card space-y-2"><h3 className="font-semibold">Import errors</h3>{preview.importResult.errors.slice(0, 20).map((item: string) => <p key={item} className="text-sm text-rose-500">{item}</p>)}</div> : null}
          <div className="card overflow-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b border-slate-200 dark:border-slate-800"><th className="p-2">Row</th><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Description</th><th className="p-2">Category</th><th className="p-2">Amount</th><th className="p-2">Balances</th></tr></thead><tbody>{preview.rows.slice(0, 100).map((row: any) => <tr key={row.row} className="border-b border-slate-100 dark:border-slate-800"><td className="p-2">{row.row}</td><td className="p-2">{row.date}</td><td className="p-2">{row.type}</td><td className="p-2">{row.description}</td><td className="p-2">{row.category}</td><td className="p-2">{row.currency} {row.cost}</td><td className="p-2">{row.balances.map((balance: any) => `${balance.sourceName}: ${balance.amount}`).join(", ")}</td></tr>)}</tbody></table></div>
        </div> : <EmptyState title="No file preview yet" body="Select a group, upload the Splitwise export, then map export names to your app users." />}
      </section>
    </AppShell>
  );
}
