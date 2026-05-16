"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, EmptyState, Field, ghostButtonClass, inputClass, LoadingRows, Modal, StatusBanner } from "@/components/app/ui";
import { apiRequest, formatMoney } from "@/lib/api-client";

export default function Groups() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [defaultCurrency, setDefaultCurrency] = useState("INR");
  const groups = useQuery({ queryKey: ["groups", query], queryFn: () => apiRequest<any[]>(`/api/groups?q=${encodeURIComponent(query)}&sort=recent`) });
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => apiRequest<any>("/api/friends") });
  const userSearch = useQuery({ queryKey: ["people-search", query], enabled: query.trim().length > 1, queryFn: () => apiRequest<any>(`/api/search?q=${encodeURIComponent(query)}`) });
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiRequest<any>("/api/me") });

  const save = useMutation({
    mutationFn: () => editing
      ? apiRequest(`/api/groups/${editing._id}`, { method: "PATCH", body: JSON.stringify({ name, category, defaultCurrency }) })
      : apiRequest("/api/groups", { method: "POST", body: JSON.stringify({ name, category, defaultCurrency, members: [] }) }),
    onSuccess: () => { setOpen(false); setEditing(null); setName(""); queryClient.invalidateQueries({ queryKey: ["groups"] }); },
  });
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify({ action: "delete" }) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }) });
  const addFriend = useMutation({ mutationFn: (userId: string) => apiRequest("/api/friends", { method: "POST", body: JSON.stringify({ userId, status: "pending" }) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }) });

  function startEdit(group: any) {
    setEditing(group);
    setName(group.name);
    setCategory(group.category ?? "General");
    setDefaultCurrency(group.defaultCurrency ?? "INR");
    setOpen(true);
  }

  const activeGroups = useMemo(() => groups.data ?? [], [groups.data]);
  const currentUserId = friends.data?.currentUserId;
  const friendRows = useMemo(() => (friends.data?.friendships ?? []).map((friendship: any) => {
    const user = String(friendship.requesterId?._id ?? friendship.requesterId) === currentUserId ? friendship.addresseeId : friendship.requesterId;
    return { ...friendship, user };
  }), [friends.data, currentUserId]);
  const groupPeople = useMemo(() => {
    const byId = new Map<string, any>();
    for (const group of activeGroups) {
      for (const member of group.members ?? []) {
        byId.set(String(member._id), { ...member, groupName: group.name });
      }
    }
    return [...byId.values()];
  }, [activeGroups]);

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-sm text-slate-500">Groups and friends</p><h2 className="text-2xl font-bold">People</h2></div>
        </header>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder="Search groups or friends" /></div>
          <button aria-label="Create group" title="Create group" onClick={() => { setEditing(null); setName(""); setOpen(true); }} className={buttonClass + " size-10 p-0"}><Plus size={18} /></button>
        </div>
        {userSearch.data?.users?.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{userSearch.data.users.slice(0, 6).map((user: any) => <div key={user._id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="min-w-0"><p className="truncate font-medium">{user.name}</p><p className="truncate text-slate-500">{user.email}</p></div><button aria-label={`Add ${user.name}`} onClick={() => addFriend.mutate(user._id)} className={ghostButtonClass + " size-9 shrink-0 p-0"}><UserPlus size={16} /></button></div>)}</div> : null}
        {groups.isLoading ? <LoadingRows count={6} /> : activeGroups.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeGroups.map((group) => <div role="button" tabIndex={0} onClick={() => router.push(`/groups/${group._id}`)} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/groups/${group._id}`); }} className="card cursor-pointer space-y-3 transition hover:border-emerald-500/60" key={group._id}>
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-semibold">{group.name}</h3><p className="text-sm text-slate-500">{group.category ?? "General"} · {group.members?.length ?? 0} members</p></div>
                <div className="flex gap-1"><button aria-label="Edit group" onClick={(event) => { event.stopPropagation(); startEdit(group); }} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900"><Edit3 size={15} /></button><button aria-label="Delete group" onClick={(event) => { event.stopPropagation(); remove.mutate(group._id); }} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"><Trash2 size={15} /></button></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-slate-500">Expenses</p><b>{group.stats?.expenseCount ?? 0}</b></div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-slate-500">Total</p><b>{formatMoney(group.stats?.totalExpenses ?? 0, group.defaultCurrency ?? me.data?.currency ?? "INR")}</b></div>
              </div>
              <div className="flex flex-wrap gap-1">{(group.members ?? []).slice(0, 5).map((member: any) => <span key={member._id} className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{member.name}</span>)}</div>
            </div>)}
          </div>
        ) : <EmptyState title="No groups found" body="Create a trip, home, office, or friends group to start sharing expenses." action={<button onClick={() => setOpen(true)} className={buttonClass}>Create group</button>} />}
        <div className="space-y-2">
          <h3 className="font-semibold">People</h3>
          {friends.isLoading ? <LoadingRows count={2} /> : friendRows.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{friendRows.map((friendship: any) => <div key={friendship._id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><p className="font-medium">{friendship.user?.name ?? "Friend"}</p><p className="truncate text-slate-500">{friendship.user?.email ?? friendship.status}</p></div>)}</div> : groupPeople.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{groupPeople.map((member: any) => <div key={member._id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><p className="font-medium">{member.name}</p><p className="truncate text-slate-500">{member.email ?? member.groupName}</p></div>)}</div> : <StatusBanner>Search above to add people.</StatusBanner>}
        </div>
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
