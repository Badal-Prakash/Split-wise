"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, EmptyState, Field, inputClass, LoadingRows, StatusBanner } from "@/components/app/ui";
import { apiRequest, formatMoney } from "@/lib/api-client";

export default function SettlePage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiRequest<any>("/api/me") });
  const balances = useQuery({ queryKey: ["balances"], queryFn: () => apiRequest<any>("/api/balances") });
  const settlements = useQuery({ queryKey: ["settlements"], queryFn: () => apiRequest<any[]>("/api/settlements") });
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const edges = balances.data?.simplifiedBalances ?? [];
  const edge = edges.find((item: any) => `${item.fromUser}:${item.toUser}` === selected) ?? edges[0];
  const settle = useMutation({ mutationFn: () => apiRequest("/api/settlements", { method: "POST", body: JSON.stringify({ fromUser: edge.fromUser, toUser: edge.toUser, amount: Number(amount || edge.amount), currency: me.data?.currency ?? "USD", paymentMethod, status: Number(amount || edge.amount) < edge.amount ? "partial" : "settled", notes }) }), onSuccess: () => { setAmount(""); setNotes(""); queryClient.invalidateQueries(); } });

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header><p className="text-sm text-slate-500">Cash, UPI, bank transfer, partial or full settlements</p><h2 className="text-2xl font-bold">Settle up</h2></header>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={(event) => { event.preventDefault(); settle.mutate(); }} className="card space-y-3">
            <h3 className="font-semibold">Record settlement</h3>
            {settle.error && <StatusBanner kind="error">{settle.error.message}</StatusBanner>}
            {!edge ? <EmptyState title="No balances to settle" /> : <><Field label="Open balance"><select value={selected || `${edge.fromUser}:${edge.toUser}`} onChange={(event) => setSelected(event.target.value)} className={inputClass}>{edges.map((item: any) => <option key={`${item.fromUser}:${item.toUser}`} value={`${item.fromUser}:${item.toUser}`}>{item.fromUser} pays {item.toUser} {formatMoney(item.amount, me.data?.currency ?? "USD")}</option>)}</select></Field><Field label="Amount"><input type="number" min="0.01" max={edge.amount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} placeholder={String(edge.amount)} /></Field><Field label="Payment method"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="other">Other</option></select></Field><Field label="Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24`} /></Field><button disabled={settle.isPending} className={buttonClass}><HandCoins size={16} />{settle.isPending ? "Saving..." : "Confirm settlement"}</button></>}
          </form>
          <div className="card"><h3 className="mb-3 font-semibold">Settlement history</h3>{settlements.isLoading ? <LoadingRows /> : settlements.data?.length ? settlements.data.map((settlement) => <div key={settlement._id} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><p className="font-medium">{formatMoney(settlement.amount, settlement.currency)} · {settlement.paymentMethod}</p><p className="text-slate-500">{settlement.status} · {new Date(settlement.date).toLocaleDateString()}</p></div>) : <EmptyState title="No settlements yet" />}</div>
        </div>
      </section>
    </AppShell>
  );
}
