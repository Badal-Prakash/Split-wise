"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, EmptyState, Field, ghostButtonClass, inputClass, LoadingRows, Modal, StatusBanner } from "@/components/app/ui";
import { apiRequest, formatMoney } from "@/lib/api-client";

export default function Groups() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [defaultCurrency, setDefaultCurrency] = useState("INR");
  const groups = useQuery({ queryKey: ["groups", query, sort], queryFn: () => apiRequest<any[]>(`/api/groups?q=${encodeURIComponent(query)}&sort=${sort}`) });
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiRequest<any>("/api/me") });

  const save = useMutation({
    mutationFn: () => editing
      ? apiRequest(`/api/groups/${editing._id}`, { method: "PATCH", body: JSON.stringify({ name, category, defaultCurrency }) })
      : apiRequest("/api/groups", { method: "POST", body: JSON.stringify({ name, category, defaultCurrency, members: [] }) }),
    onSuccess: () => { setOpen(false); setEditing(null); setName(""); queryClient.invalidateQueries({ queryKey: ["groups"] }); },
  });
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify({ action: "delete" }) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }) });

  function startEdit(group: any) {
    setEditing(group);
    setName(group.name);
    setCategory(group.category ?? "General");
    setDefaultCurrency(group.defaultCurrency ?? "INR");
    setOpen(true);
  }

  const activeGroups = useMemo(() => groups.data ?? [], [groups.data]);

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-sm text-slate-500">Manage shared spaces</p><h2 className="text-2xl font-bold">Groups</h2></div>
          <button onClick={() => { setEditing(null); setName(""); setOpen(true); }} className={buttonClass}><Plus size={16} />Create group</button>
        </header>
        <div className="card grid gap-3 md:grid-cols-[1fr_180px]">
          <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder="Search groups" /></div>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className={inputClass}><option value="recent">Recently active</option><option value="name">Name</option></select>
        </div>
        {groups.isLoading ? <LoadingRows count={6} /> : activeGroups.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeGroups.map((group) => <div className="card space-y-3" key={group._id}>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/groups/${group._id}`}><h3 className="font-semibold">{group.name}</h3><p className="text-sm text-slate-500">{group.category ?? "General"} · {group.members?.length ?? 0} members</p></Link>
                <div className="flex gap-1"><button aria-label="Edit group" onClick={() => startEdit(group)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900"><Edit3 size={15} /></button><button aria-label="Delete group" onClick={() => remove.mutate(group._id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"><Trash2 size={15} /></button></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-slate-500">Expenses</p><b>{group.stats?.expenseCount ?? 0}</b></div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-slate-500">Total</p><b>{formatMoney(group.stats?.totalExpenses ?? 0, group.defaultCurrency ?? me.data?.currency ?? "INR")}</b></div>
              </div>
              {group.stats?.recentExpense ? <p className="text-sm text-slate-500">Recent: {group.stats.recentExpense.title} · {formatMoney(group.stats.recentExpense.amount, group.defaultCurrency ?? "INR")}</p> : <p className="text-sm text-slate-500">No expenses yet</p>}
              <div className="flex flex-wrap gap-1">{(group.members ?? []).slice(0, 5).map((member: any) => <span key={member._id} className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{member.name}</span>)}</div>
              <Link href={`/groups/${group._id}`} className={ghostButtonClass + " w-full"}><UserPlus size={16} />Open group</Link>
            </div>)}
          </div>
        ) : <EmptyState title="No groups found" body="Create a trip, home, office, or friends group to start sharing expenses." action={<button onClick={() => setOpen(true)} className={buttonClass}>Create group</button>} />}
      </section>
      <Modal title={editing ? "Edit group" : "Create group"} open={open} onClose={() => setOpen(false)}>
        <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="space-y-3">
          {save.error && <StatusBanner kind="error">{save.error.message}</StatusBanner>}
          <Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} required /></Field>
          <div className="grid gap-3 md:grid-cols-2"><Field label="Category"><input value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} /></Field><Field label="Currency"><input value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value.toUpperCase())} maxLength={3} className={inputClass} /></Field></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className={ghostButtonClass}>Cancel</button><button disabled={save.isPending} className={buttonClass}>{save.isPending ? "Saving..." : "Save group"}</button></div>
        </form>
      </Modal>
    </AppShell>
  );
}
