"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { buttonClass, EmptyState, Field, ghostButtonClass, inputClass, LoadingRows } from "@/components/app/ui";
import { apiRequest, downloadFile, formatMoney, toCsv } from "@/lib/api-client";

const colors = ["#10b981", "#0ea5e9", "#f97316", "#e11d48", "#8b5cf6", "#14b8a6"];

export default function Analytics() {
  const [filters, setFilters] = useState({ from: "", to: "", groupId: "", category: "" });
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  const analytics = useQuery({ queryKey: ["analytics", filters], queryFn: () => apiRequest<any>(`/api/analytics/summary?${query}`) });
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => apiRequest<any[]>("/api/groups") });
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiRequest<any>("/api/me") });
  const currency = me.data?.currency ?? "USD";
  const categoryRows = analytics.data?.categories ?? [];
  const monthlyRows = analytics.data?.monthly ?? [];
  const exportRows = useMemo(() => [
    ...monthlyRows.map((row: any) => ({ type: "monthly", label: row.month, total: row.total, count: row.count })),
    ...categoryRows.map((row: any) => ({ type: "category", label: row.category, total: row.total, count: row.count })),
  ], [monthlyRows, categoryRows]);

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm text-slate-500">Interactive reports</p><h2 className="text-2xl font-bold">Analytics</h2></div><div className="flex gap-2"><button onClick={() => downloadFile("splitwise-analytics.csv", toCsv(exportRows))} className={ghostButtonClass}><Download size={16} />CSV</button><button onClick={() => downloadFile("splitwise-analytics.xls", toCsv(exportRows), "application/vnd.ms-excel")} className={ghostButtonClass}><Download size={16} />Excel</button><button onClick={() => window.print()} className={buttonClass}><Printer size={16} />PDF</button></div></header>
        <div className="card grid gap-3 md:grid-cols-4"><Field label="From"><input type="date" value={filters.from} onChange={(event) => setFilters((value) => ({ ...value, from: event.target.value }))} className={inputClass} /></Field><Field label="To"><input type="date" value={filters.to} onChange={(event) => setFilters((value) => ({ ...value, to: event.target.value }))} className={inputClass} /></Field><Field label="Group"><select value={filters.groupId} onChange={(event) => setFilters((value) => ({ ...value, groupId: event.target.value }))} className={inputClass}><option value="">All groups</option>{groups.data?.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}</select></Field><Field label="Category"><input value={filters.category} onChange={(event) => setFilters((value) => ({ ...value, category: event.target.value }))} className={inputClass} placeholder="Food" /></Field></div>
        {analytics.isLoading ? <LoadingRows count={5} /> : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="card"><h3 className="mb-3 font-semibold">Monthly spending</h3>{monthlyRows.length ? <MonthlyChart data={monthlyRows} /> : <EmptyState title="No monthly spending" />}</div>
            <div className="card"><h3 className="mb-3 font-semibold">Category spending</h3>{categoryRows.length ? <div className="h-64"><ResponsiveContainer><PieChart><Pie data={categoryRows} dataKey="total" nameKey="category" outerRadius={95}>{categoryRows.map((_: any, index: number) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => formatMoney(Number(value), currency)} /></PieChart></ResponsiveContainer></div> : <EmptyState title="No category data" />}</div>
            <div className="card"><h3 className="mb-3 font-semibold">Group spending</h3>{analytics.data?.groups?.length ? <div className="h-64"><ResponsiveContainer><BarChart data={analytics.data.groups}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="groupId" hide /><YAxis /><Tooltip formatter={(value) => formatMoney(Number(value), currency)} /><Bar dataKey="total" fill="#0ea5e9" /></BarChart></ResponsiveContainer></div> : <EmptyState title="No group data" />}</div>
            <div className="card"><h3 className="mb-3 font-semibold">User contribution</h3>{analytics.data?.userContribution?.length ? <div className="h-64"><ResponsiveContainer><BarChart data={analytics.data.userContribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="userId" hide /><YAxis /><Tooltip formatter={(value) => formatMoney(Number(value), currency)} /><Bar dataKey="total" fill="#10b981" /></BarChart></ResponsiveContainer></div> : <EmptyState title="No contribution data" />}</div>
            <div className="card"><h3 className="mb-3 font-semibold">Settlement trends</h3>{analytics.data?.settlements?.length ? analytics.data.settlements.map((row: any) => <div key={row.method} className="mb-2 flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><span>{row.method}</span><b>{formatMoney(row.total, currency)}</b></div>) : <EmptyState title="No settlements yet" />}</div>
            <div className="card"><h3 className="mb-3 font-semibold">Debt trends</h3><p className="text-sm text-slate-500">Debt trend export is driven by the balance engine and settlement history. Use the Settle page to record new payments, then refresh analytics.</p></div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
