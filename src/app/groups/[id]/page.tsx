"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2, Upload, UserMinus, UserPlus, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityRow } from "@/components/app/activity-row";
import { ExpenseModal } from "@/components/app/expense-modal";
import { SettleModal } from "@/components/app/settle-modal";
import { buttonClass, EmptyState, Field, ghostButtonClass, inputClass, LoadingRows, StatusBanner } from "@/components/app/ui";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { apiRequest, formatMoney } from "@/lib/api-client";

const tabs = ["expenses", "balances", "members", "analytics", "activity", "settings"] as const;

export default function GroupDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>("expenses");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [settings, setSettings] = useState({ name: "", category: "", defaultCurrency: "INR" });
  const [simplifiedPage, setSimplifiedPage] = useState(1);
  const [rawPage, setRawPage] = useState(1);
  const refresh = () => queryClient.invalidateQueries();

  const me = useQuery({ queryKey: ["me"], queryFn: () => apiRequest<any>("/api/me") });
  const group = useQuery({ queryKey: ["group", id], queryFn: () => apiRequest<any>(`/api/groups/${id}`) });
  const expenses = useQuery({ queryKey: ["expenses", id], queryFn: () => apiRequest<any[]>(`/api/expenses?groupId=${id}&limit=100`) });
  const activities = useQuery({ queryKey: ["activities", id], queryFn: () => apiRequest<any[]>(`/api/activities?groupId=${id}`) });
  const analytics = useQuery({ queryKey: ["analytics", id], queryFn: () => apiRequest<any>(`/api/analytics/summary?groupId=${id}`) });

  const groupDoc = group.data?.group;
  const balances = group.data?.balances;
  const invites = group.data?.invites ?? [];
  const currency = groupDoc?.defaultCurrency ?? me.data?.currency ?? "INR";
  const users = useMemo(() => [me.data, ...(groupDoc?.members ?? [])].filter(Boolean), [me.data, groupDoc]);

  const updateGroup = useMutation({
    mutationFn: (body: any) => apiRequest(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (data: any) => {
      if (data?.inviteUrl) setInviteLink(data.inviteUrl);
      refresh();
    },
  });

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateGroup.mutate(settings);
  }

  if (group.isLoading) return <AppShell><section className="p-4 md:p-8"><LoadingRows /></section></AppShell>;
  if (group.error || !groupDoc) return <AppShell><section className="p-4 md:p-8"><StatusBanner kind="error">{group.error?.message ?? "Group not found"}</StatusBanner></section></AppShell>;

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-sm text-slate-500">{groupDoc.category ?? "Group"} · {groupDoc.members?.length ?? 0} members</p><h2 className="text-2xl font-bold">{groupDoc.name}</h2></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => setExpenseOpen(true)} className={buttonClass}><Plus size={16} />Add expense</button><Link href={`/import?groupId=${id}`} className={ghostButtonClass}><Upload size={16} />Import</Link><button onClick={() => setSettleOpen(true)} className={ghostButtonClass}><WalletCards size={16} />Settle</button></div>
        </header>
        <div className="grid grid-cols-2 gap-3">
          <div className="card"><p className="text-sm text-slate-500">Your group balance</p><b className="text-2xl">{formatMoney(balances?.summary?.currentUser?.netBalance ?? 0, currency)}</b></div>
          <div className="card"><p className="text-sm text-slate-500">Owe / Owed</p><b className="block truncate text-base md:text-2xl">{formatMoney(balances?.summary?.currentUser?.totalOwing ?? 0, currency)} <span className="text-slate-500">/</span> <span className="text-emerald-500">{formatMoney(balances?.summary?.currentUser?.totalOwed ?? 0, currency)}</span></b></div>
        </div>
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">{tabs.map((item) => <button key={item} onClick={() => { setTab(item); if (item === "settings") setSettings({ name: groupDoc.name, category: groupDoc.category ?? "", defaultCurrency: currency }); }} className={`rounded-lg px-3 py-2 text-sm capitalize ${tab === item ? "bg-emerald-500 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>{item}</button>)}</div>

        {tab === "expenses" && <div className="card">
          {expenses.isLoading ? <LoadingRows /> : expenses.data?.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{expenses.data.map((expense) => <Link key={expense._id} href={`/expenses/${expense._id}`} className="flex items-center justify-between py-3"><div><p className="font-medium">{expense.title}</p><p className="text-sm text-slate-500">{new Date(expense.date).toLocaleDateString()} · {expense.category ?? "General"}</p></div><b>{formatMoney(expense.amount, expense.currency)}</b></Link>)}</div> : <EmptyState title="No group expenses yet" action={<button onClick={() => setExpenseOpen(true)} className={buttonClass}>Add expense</button>} />}
        </div>}

        {tab === "balances" && <div className="grid gap-4 lg:grid-cols-2"><div className="card"><h3 className="mb-3 font-semibold">Simplified balances</h3>{balances?.simplifiedBalances?.length ? <div className="space-y-2">{balances.simplifiedBalances.slice((simplifiedPage - 1) * 10, simplifiedPage * 10).map((edge: any, index: number) => <BalanceRow key={index} edge={edge} users={users} currency={currency} />)}{balances.simplifiedBalances.length > 10 && <div className="mt-4 flex items-center justify-between gap-2"><button disabled={simplifiedPage === 1} onClick={() => setSimplifiedPage(p => p - 1)} className={ghostButtonClass + " px-2 py-1 text-xs"}>Prev</button><span className="text-xs text-slate-500">Page {simplifiedPage} of {Math.ceil(balances.simplifiedBalances.length / 10)}</span><button disabled={simplifiedPage >= Math.ceil(balances.simplifiedBalances.length / 10)} onClick={() => setSimplifiedPage(p => p + 1)} className={ghostButtonClass + " px-2 py-1 text-xs"}>Next</button></div>}</div> : <EmptyState title="No simplified debts" />}</div><div className="card"><h3 className="mb-3 font-semibold">Who owes whom</h3>{balances?.rawBalances?.length ? <div className="space-y-2">{balances.rawBalances.slice((rawPage - 1) * 10, rawPage * 10).map((edge: any, index: number) => <BalanceRow key={index} edge={edge} users={users} currency={currency} />)}{balances.rawBalances.length > 10 && <div className="mt-4 flex items-center justify-between gap-2"><button disabled={rawPage === 1} onClick={() => setRawPage(p => p - 1)} className={ghostButtonClass + " px-2 py-1 text-xs"}>Prev</button><span className="text-xs text-slate-500">Page {rawPage} of {Math.ceil(balances.rawBalances.length / 10)}</span><button disabled={rawPage >= Math.ceil(balances.rawBalances.length / 10)} onClick={() => setRawPage(p => p + 1)} className={ghostButtonClass + " px-2 py-1 text-xs"}>Next</button></div>}</div> : <EmptyState title="All settled" />}</div></div>}

        {tab === "members" && <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><div className="space-y-4"><div className="card"><h3 className="mb-3 font-semibold">Members</h3><div className="space-y-2">{groupDoc.members.map((member: any) => <div key={member._id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><div><p className="font-medium">{member.name}</p><p className="text-sm text-slate-500">{member.email}</p></div><button onClick={() => updateGroup.mutate({ action: "remove-member", userId: member._id })} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"><UserMinus size={16} /></button></div>)}</div></div><div className="card"><h3 className="mb-3 font-semibold">Pending invites</h3>{invites.length ? <div className="space-y-2">{invites.map((invite: any) => <div key={invite._id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><p className="font-medium">{invite.invitedUserId?.name ?? invite.email ?? "Invite link"}</p><p className="text-slate-500">{invite.mode === "link" ? "Shareable link" : invite.invitedUserId?.email ?? invite.email} · pending</p></div>)}</div> : <EmptyState title="No pending invites" />}</div></div><div className="space-y-4"><form onSubmit={(event) => { event.preventDefault(); updateGroup.mutate({ action: "invite-user", email: inviteEmail }); setInviteEmail(""); }} className="card space-y-3"><h3 className="font-semibold">Send request to existing user</h3>{updateGroup.error && <StatusBanner kind="error">{updateGroup.error.message}</StatusBanner>}<p className="text-sm text-slate-500">Enter an email that already has an account. The user will see a pending request and must accept it.</p><Field label="Existing user email"><input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" className={inputClass} required /></Field><button disabled={updateGroup.isPending} className={buttonClass + " w-full"}><UserPlus size={16} />Send request</button></form><div className="card space-y-3"><h3 className="font-semibold">Custom invite link</h3><p className="text-sm text-slate-500">Generate a link and share it manually. Anyone logged in with the link can accept and join.</p><button onClick={() => updateGroup.mutate({ action: "create-invite-link" })} className={buttonClass + " w-full"} type="button"><Copy size={16} />Generate invite link</button>{inviteLink && <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><p className="break-all">{inviteLink}</p><button className={ghostButtonClass + " mt-2 w-full"} type="button" onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy link</button></div>}</div></div></div>}

        {tab === "analytics" && <div className="grid gap-4 lg:grid-cols-2"><div className="card"><h3 className="mb-3 font-semibold">Monthly spending</h3>{analytics.data?.monthly?.length ? <MonthlyChart data={analytics.data.monthly} /> : <EmptyState title="No analytics yet" />}</div><div className="card"><h3 className="mb-3 font-semibold">Category mix</h3>{(analytics.data?.categories ?? []).map((row: any) => <div key={row.category} className="mb-2 flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><span>{row.category}</span><b>{formatMoney(row.total, currency)}</b></div>)}</div></div>}

        {tab === "activity" && (activities.data?.length ? <div className="space-y-3">{activities.data.map((activity) => <ActivityRow key={activity._id} activity={activity} />)}</div> : <EmptyState title="No activity yet" />)}

        {tab === "settings" && <form onSubmit={saveSettings} className="card max-w-2xl space-y-3"><Field label="Name"><input value={settings.name} onChange={(event) => setSettings((value) => ({ ...value, name: event.target.value }))} className={inputClass} /></Field><Field label="Category"><input value={settings.category} onChange={(event) => setSettings((value) => ({ ...value, category: event.target.value }))} className={inputClass} /></Field><Field label="Default currency"><input value={settings.defaultCurrency} onChange={(event) => setSettings((value) => ({ ...value, defaultCurrency: event.target.value.toUpperCase() }))} maxLength={3} className={inputClass} /></Field><div className="flex gap-2"><button className={buttonClass}>Save settings</button><button type="button" onClick={() => updateGroup.mutate({ action: "leave" })} className={ghostButtonClass}>Leave group</button><button type="button" onClick={() => updateGroup.mutate({ action: "delete" })} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"><Trash2 size={16} />Delete group</button></div></form>}
      </section>
      <ExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} onSaved={refresh} me={me.data} groups={[groupDoc]} initialGroupId={id} />
      <SettleModal open={settleOpen} onClose={() => setSettleOpen(false)} onSaved={refresh} me={me.data} users={users} balances={balances?.simplifiedBalances ?? []} groupId={id} currency={currency} />
    </AppShell>
  );
}

function BalanceRow({ edge, users, currency }: { edge: any; users: any[]; currency: string }) {
  const name = (id: string) => users.find((user) => String(user?._id ?? user?.id) === id)?.name ?? id;
  return <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span>{name(edge.fromUser)} pays {name(edge.toUser)}</span><b>{formatMoney(edge.amount, currency)}</b></div>;
}
