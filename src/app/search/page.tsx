"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, Field, inputClass, LoadingRows } from "@/components/app/ui";
import { apiRequest, formatMoney } from "@/lib/api-client";

export default function SearchPage() {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => { const handle = setTimeout(() => setDebounced(text), 300); return () => clearTimeout(handle); }, [text]);
  useEffect(() => { setHistory(JSON.parse(localStorage.getItem("splitwise.search-history") ?? "[]")); }, []);
  const results = useQuery({ queryKey: ["global-search", debounced], enabled: debounced.length > 1, queryFn: async () => { const data = await apiRequest<any>(`/api/search?q=${encodeURIComponent(debounced)}`); const next = [debounced, ...history.filter((item) => item !== debounced)].slice(0, 8); setHistory(next); localStorage.setItem("splitwise.search-history", JSON.stringify(next)); return data; } });

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header><p className="text-sm text-slate-500">Expenses, groups, users, notes, tags, comments</p><h2 className="text-2xl font-bold">Search</h2></header>
        <div className="card"><Field label="Instant search"><div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input value={text} onChange={(event) => setText(event.target.value)} className={`${inputClass} pl-9`} placeholder="Search dinner, rent, Goa, @friend..." /></div></Field>{history.length ? <div className="mt-3 flex flex-wrap gap-2">{history.map((item) => <button key={item} onClick={() => setText(item)} className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">{item}</button>)}</div> : null}</div>
        {results.isLoading ? <LoadingRows /> : results.data ? <div className="grid gap-4 lg:grid-cols-3"><ResultCard title="Expenses">{results.data.expenses?.length ? results.data.expenses.map((expense: any) => <Link key={expense._id} href={`/expenses/${expense._id}`} className="block rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="font-medium">{expense.title}</p><p className="text-sm text-slate-500">{formatMoney(expense.amount, expense.currency)} · {expense.category}</p></Link>) : <EmptyState title="No expenses" />}</ResultCard><ResultCard title="Groups">{results.data.groups?.length ? results.data.groups.map((group: any) => <Link key={group._id} href={`/groups/${group._id}`} className="block rounded-xl bg-slate-50 p-3 dark:bg-slate-900">{group.name}</Link>) : <EmptyState title="No groups" />}</ResultCard><ResultCard title="Users">{results.data.users?.length ? results.data.users.map((user: any) => <Link key={user._id} href="/friends" className="block rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="font-medium">{user.name}</p><p className="text-sm text-slate-500">{user.email}</p></Link>) : <EmptyState title="No users" />}</ResultCard></div> : <EmptyState title="Start searching" body="Results appear instantly after two characters." />}
      </section>
    </AppShell>
  );
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card space-y-2"><h3 className="font-semibold">{title}</h3>{children}</div>;
}
