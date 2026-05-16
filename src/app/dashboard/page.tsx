"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Search, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ActivityRow } from "@/components/app/activity-row";
import { ExpenseModal } from "@/components/app/expense-modal";
import { SettleModal } from "@/components/app/settle-modal";
import { buttonClass, EmptyState, Field, ghostButtonClass, inputClass, LoadingRows, Modal, StatusBanner } from "@/components/app/ui";
import { apiRequest, formatMoney } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/lib/realtime";
import { socketEvents } from "@/sockets/events";

const realtimeEvents = [socketEvents.expenseCreated, socketEvents.expenseUpdated, socketEvents.settlementCompleted, socketEvents.activityCreated, "notification:created"];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const refresh = useCallback(() => queryClient.invalidateQueries(), [queryClient]);
  useRealtimeRefresh(realtimeEvents, refresh);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");

  const me = useQuery({ queryKey: ["me"], queryFn: () => apiRequest<any>("/api/me") });
  const balances = useQuery({ queryKey: ["balances"], queryFn: () => apiRequest<any>("/api/balances") });
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => apiRequest<any[]>("/api/groups") });
  const expenses = useQuery({ queryKey: ["expenses", "recent"], queryFn: () => apiRequest<any[]>("/api/expenses?limit=8") });
  const activities = useQuery({ queryKey: ["activities", "recent"], queryFn: () => apiRequest<any[]>("/api/activities?limit=8") });
  const analytics = useQuery({ queryKey: ["analytics", "summary"], queryFn: () => apiRequest<any>("/api/analytics/summary") });
  const notifications = useQuery({ queryKey: ["notifications", "unread"], queryFn: () => apiRequest<any[]>("/api/notifications?unread=true") });
  const searchResults = useQuery({ queryKey: ["search", search], enabled: search.trim().length > 1, queryFn: () => apiRequest<any>(`/api/search?q=${encodeURIComponent(search)}`) });

  const createGroup = useMutation({
    mutationFn: () => apiRequest("/api/groups", { method: "POST", body: JSON.stringify({ name: groupName, members: [] }) }),
    onSuccess: () => { setGroupName(""); setGroupOpen(false); refresh(); },
  });

  const monthly = useMemo(() => analytics.data?.monthly?.map((row: any) => ({ month: row.month, total: row.total })) ?? [], [analytics.data]);
  const currentUser = balances.data?.summary?.currentUser;
  const currency = me.data?.currency ?? "INR";

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold md:text-2xl">Dashboard</h2>
          </div>
          <div id="quick-add" className="flex items-center gap-2">
            <ThemeToggle />
            <button aria-label="Create group" title="Create group" onClick={() => setGroupOpen(true)} className={ghostButtonClass + " size-11 p-0"}><Users size={24} /></button>
            <button aria-label="Settle up" title="Settle up" onClick={() => setSettleOpen(true)} className={ghostButtonClass + " size-11 p-0"}><WalletCards size={24} /></button>
            <Link aria-label="Search" title="Search" href="/search" className={ghostButtonClass + " size-11 p-0"}><Search size={24} /></Link>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <div className="card rounded-xl p-3"><p className="text-xs text-slate-500">Balance</p><b className={`block truncate text-sm sm:text-2xl ${(currentUser?.netBalance ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatMoney(currentUser?.netBalance ?? 0, currency)}</b></div>
          <div className="card rounded-xl p-3"><p className="text-xs text-slate-500">Owe / Owed</p><b className="block truncate text-sm sm:text-2xl"><span>{formatMoney(currentUser?.totalOwing ?? 0, currency)}</span> <span className="text-slate-500">/</span> <span className="text-emerald-500">{formatMoney(currentUser?.totalOwed ?? 0, currency)}</span></b></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Monthly spending</h3>
              <Link href="/analytics" className="text-sm text-emerald-500">Open analytics</Link>
            </div>
            {analytics.isLoading ? <LoadingRows count={3} /> : monthly.length ? <MonthlyChart data={monthly} /> : <EmptyState title="No chart data yet" body="Add expenses and monthly trends will appear here." />}
          </div>
          <div className="card hidden space-y-3 md:block">
            <h3 className="font-semibold">Quick actions</h3>
            <button onClick={() => setExpenseOpen(true)} className={buttonClass + " w-full"}><Plus size={16} />Add expense</button>
            <button onClick={() => setSettleOpen(true)} className={ghostButtonClass + " w-full"}><WalletCards size={16} />Settle balance</button>
            <button onClick={() => setGroupOpen(true)} className={ghostButtonClass + " w-full"}><Users size={16} />Create group</button>
            {notifications.data?.length ? <StatusBanner><Bell className="mr-2 inline" size={14} />{notifications.data.length} unread notifications</StatusBanner> : <StatusBanner kind="success">No unread notifications.</StatusBanner>}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Recent expenses</h3><Link href="/search" className="text-sm text-emerald-500">Search all</Link></div>
            {expenses.isLoading ? <LoadingRows /> : expenses.data?.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{expenses.data.map((expense) => <Link href={`/expenses/${expense._id}`} key={expense._id} className="flex items-center justify-between py-3"><div><p className="font-medium">{expense.title}</p><p className="text-sm text-slate-500">{expense.category ?? "General"} · {new Date(expense.date).toLocaleDateString()}</p></div><b>{formatMoney(expense.amount, expense.currency)}</b></Link>)}</div> : <EmptyState title="No expenses yet" action={<button onClick={() => setExpenseOpen(true)} className={buttonClass}>Add your first expense</button>} />}
          </div>
          <div className="card">
            <h3 className="mb-3 font-semibold">Recent activity</h3>
            {activities.isLoading ? <LoadingRows /> : activities.data?.length ? <div className="space-y-3">{activities.data.map((activity) => <ActivityRow key={activity._id} activity={activity} compact />)}</div> : <EmptyState title="No activity yet" />}
          </div>
        </div>

        <div className="card">
          <Field label="Quick search">
            <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-9`} placeholder="Search expenses, groups, users, tags, notes..." /></div>
          </Field>
          {searchResults.data && <div className="mt-3 grid gap-3 md:grid-cols-3">
            <ResultColumn title="Expenses" rows={searchResults.data.expenses ?? []} href={(row) => `/expenses/${row._id}`} label={(row) => row.title} />
            <ResultColumn title="Groups" rows={searchResults.data.groups ?? []} href={(row) => `/groups/${row._id}`} label={(row) => row.name} />
            <ResultColumn title="Users" rows={searchResults.data.users ?? []} href={() => "/friends"} label={(row) => `${row.name} (${row.email})`} />
          </div>}
        </div>
      </section>

      <ExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} onSaved={refresh} me={me.data} groups={groups.data ?? []} />
      <SettleModal open={settleOpen} onClose={() => setSettleOpen(false)} onSaved={refresh} me={me.data} users={[me.data, ...(groups.data ?? []).flatMap((group) => group.members ?? [])].filter(Boolean)} balances={balances.data?.simplifiedBalances ?? []} currency={currency} />
      <Modal title="Create group" open={groupOpen} onClose={() => setGroupOpen(false)}>
        <form onSubmit={(event) => { event.preventDefault(); createGroup.mutate(); }} className="space-y-3">
          {createGroup.error && <StatusBanner kind="error">{createGroup.error.message}</StatusBanner>}
          <Field label="Group name"><input value={groupName} onChange={(event) => setGroupName(event.target.value)} className={inputClass} required placeholder="Goa Trip, Flatmates, Office lunch" /></Field>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setGroupOpen(false)} className={ghostButtonClass}>Cancel</button><button disabled={createGroup.isPending} className={buttonClass}>{createGroup.isPending ? "Creating..." : "Create group"}</button></div>
        </form>
      </Modal>
    </AppShell>
  );
}

function ResultColumn({ title, rows, href, label }: { title: string; rows: any[]; href: (row: any) => string; label: (row: any) => string }) {
  return <div><p className="mb-2 text-sm font-semibold">{title}</p>{rows.length ? rows.slice(0, 5).map((row) => <Link key={row._id} href={href(row)} className="block rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-900">{label(row)}</Link>) : <p className="text-sm text-slate-500">No matches</p>}</div>;
}
