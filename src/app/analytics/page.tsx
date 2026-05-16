"use client";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight,
  PieChart, BarChart3, Sparkles, Calendar, Download,
  Filter, ChevronRight, LayoutDashboard, CreditCard,
  Users as UsersIcon, Zap
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, ghostButtonClass, LoadingRows, EmptyState } from "@/components/app/ui";
import { apiRequest, formatMoney } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/lib/realtime";
import { socketEvents } from "@/sockets/events";
import { KPICard } from "@/components/dashboard/kpi-card";
import { FinanceChart, CustomTooltip } from "@/components/dashboard/finance-chart";
import { CategoryChart } from "@/components/charts/category-chart";
import { InsightCard } from "@/components/dashboard/insight-card";
import { useAnalyticsInsights } from "@/hooks/use-analytics-insights";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "spending", label: "Spending", icon: CreditCard },
  { id: "debts", label: "Debts", icon: Wallet },
  { id: "settlements", label: "Settlements", icon: Zap },
  { id: "insights", label: "Insights", icon: Sparkles },
];

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("last_month");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["analytics"] });
  useRealtimeRefresh([socketEvents.expenseCreated, socketEvents.settlementCompleted], refresh);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "summary", dateRange],
    queryFn: () => apiRequest<any>("/api/analytics/summary")
  });

  const insights = useAnalyticsInsights(data);
  const currency = "INR"; // Should come from me query ideally

  if (isLoading) return <AppShell><section className="p-4 md:p-8"><LoadingRows /></section></AppShell>;

  const totalSpent = data?.categories?.reduce((sum: number, c: any) => sum + c.total, 0) ?? 0;
  const totalSettlements = data?.settlements?.reduce((sum: number, s: any) => sum + s.total, 0) ?? 0;

  // Mock trends for KPIs since API doesn't return historical totals yet
  const trends = {
    spent: 12.5,
    received: -2.4,
    settled: 8.1,
    activeGroups: 5.2
  };

  return (
    <AppShell>
      <section className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-sm text-slate-500">Real-time financial intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={ghostButtonClass + " flex items-center gap-2"}>
              <Filter size={16} /> Filters
            </button>
            <button className={buttonClass + " flex items-center gap-2"}>
              <Download size={16} /> Export PDF
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex p-1 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    title="Total Spent"
                    value={formatMoney(totalSpent, currency)}
                    trend={trends.spent}
                    trendLabel="vs last month"
                    icon={CreditCard}
                    color="text-rose-500"
                  />
                  <KPICard
                    title="Total Settlements"
                    value={formatMoney(totalSettlements, currency)}
                    trend={trends.settled}
                    trendLabel="vs last month"
                    icon={Wallet}
                    color="text-emerald-500"
                  />
                  <KPICard
                    title="Avg Monthly"
                    value={formatMoney(totalSpent / (data?.monthly?.length || 1), currency)}
                    trend={trends.received}
                    trendLabel="vs last month"
                    icon={TrendingUp}
                    color="text-sky-500"
                  />
                  <KPICard
                    title="Active Groups"
                    value={data?.groups?.length?.toString() ?? "0"}
                    trend={trends.activeGroups}
                    trendLabel="growth"
                    icon={UsersIcon}
                    color="text-amber-500"
                  />
                </div>

                {/* Main Charts Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="card p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-semibold">Spending Trend</h3>
                      <div className="flex gap-2">
                        <button className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">Month</button>
                        <button className="text-xs px-2 py-1 rounded text-slate-400">Year</button>
                      </div>
                    </div>
                    <FinanceChart>
                      <AreaChart data={data?.monthly}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="total" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} />
                      </AreaChart>
                    </FinanceChart>
                  </div>
                  <div className="card p-6">
                    <h3 className="mb-6 font-semibold">Category Breakdown</h3>
                    <CategoryChart data={data?.categories ?? []} />
                    <div className="mt-4 space-y-2">
                      {data?.categories?.slice(0, 3).map((cat: any) => (
                        <div key={cat.category} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{cat.category}</span>
                          <span className="font-medium">{formatMoney(cat.total, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Insights Section */}
                <div className="grid gap-4 md:grid-cols-3">
                  {insights.length ? insights.map((insight, i) => (
                    <InsightCard key={i} {...insight} />
                  )) : (
                    <div className="col-span-full card p-8 text-center">
                      <Sparkles className="mx-auto mb-2 text-slate-400" size={24} />
                      <p className="text-sm text-slate-500">Analyzing patterns... add more data to see insights.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "spending" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="card p-6">
                  <h3 className="mb-6 font-semibold">Member Contributions</h3>
                  <div className="space-y-4">
                    {data?.userContribution?.length ? data.userContribution.map((row: any) => (
                      <div key={row.userId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">{row.name ?? `User ${row.userId.slice(0, 5)}...`}</span>
                          <span className="font-medium">{formatMoney(row.total, currency)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${(row.total / (data.userContribution.reduce((s: number, r: any) => s + r.total, 0))) * 100}%` }}
                          />
                        </div>
                      </div>
                    )) : <EmptyState title="No contribution data" />}
                  </div>
                </div>
                <div className="card p-6">
                  <h3 className="mb-6 font-semibold">Group Spending</h3>
                  <div className="space-y-4">
                    {data?.groups?.length ? data.groups.map((row: any) => (
                      <div key={row.groupId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm">
                        <span className="text-slate-500">{row.name ?? `Group ${row.groupId.slice(0, 5)}...`}</span>
                        <b className="text-emerald-500">{formatMoney(row.total, currency)}</b>
                      </div>
                    )) : <EmptyState title="No group data" />}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {insights.length > 0 ? insights.map((insight, i) => (
                  <div key={i} className="scale-100 hover:scale-105 transition-transform">
                    <InsightCard {...insight} />
                  </div>
                )) : (
                  <div className="col-span-full card p-12 text-center">
                    <Sparkles size={48} className="mx-auto mb-4 text-slate-300" />
                    <h3 className="font-bold text-lg">No Insights Yet</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">Keep tracking your expenses to unlock AI-powered financial insights.</p>
                  </div>
                )}
              </div>
            )}

            {(activeTab === "debts" || activeTab === "settlements") && (
              <div className="card p-12 text-center">
                <div className="mb-4 inline-block p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                  <LayoutDashboard size={32} className="text-slate-400" />
                </div>
                <h3 className="font-bold text-lg">Coming Soon</h3>
                <p className="text-slate-500">We are building advanced debt and settlement tracking. Stay tuned!</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </AppShell>
  );
}
