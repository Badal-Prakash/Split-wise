"use client";

import { useMemo, useState } from "react";
import { HandCoins } from "lucide-react";
import { apiRequest, formatMoney } from "@/lib/api-client";
import { buttonClass, Field, ghostButtonClass, inputClass, Modal, StatusBanner } from "@/components/app/ui";

type Edge = { fromUser: string; fromUserName?: string; toUser: string; toUserName?: string; amount: number };
type UserLite = { _id?: string; id?: string; name: string; email?: string; currency?: string };
const idOf = (user: UserLite) => String(user._id ?? user.id);

export function SettleModal({ open, onClose, onSaved, me, users = [], balances = [], groupId, currency = "INR" }: { open: boolean; onClose: () => void; onSaved?: () => void; me?: UserLite; users?: UserLite[]; balances?: Edge[]; groupId?: string; currency?: string }) {
  const meId = me ? idOf(me) : "";
  const candidates = useMemo(() => balances.filter((edge) => edge.fromUser === meId || edge.toUser === meId), [balances, meId]);
  const [selected, setSelected] = useState("");
  const edge = candidates.find((item) => `${item.fromUser}:${item.toUser}` === selected) ?? candidates[0];
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "bank" | "card" | "other">("cash");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"partial" | "settled">("settled");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function name(id: string) {
    return users.find((user) => idOf(user) === id)?.name ?? id;
  }

  function edgeName(item: Edge, side: "from" | "to") {
    return side === "from" ? item.fromUserName ?? name(item.fromUser) : item.toUserName ?? name(item.toUser);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edge) return;
    setError("");
    setLoading(true);
    try {
      await apiRequest("/api/settlements", {
        method: "POST",
        body: JSON.stringify({
          fromUser: edge.fromUser,
          toUser: edge.toUser,
          amount: Number(amount || edge.amount),
          currency,
          paymentMethod,
          status,
          groupId,
          notes,
        }),
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to settle balance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Settle up" open={open} onClose={onClose}>
      {!edge ? <StatusBanner>No open balances to settle.</StatusBanner> : (
        <form onSubmit={submit} className="space-y-4">
          {error && <StatusBanner kind="error">{error}</StatusBanner>}
          <Field label="Balance">
            <select value={selected || `${edge.fromUser}:${edge.toUser}`} onChange={(event) => setSelected(event.target.value)} className={inputClass}>
              {candidates.map((item) => <option key={`${item.fromUser}:${item.toUser}`} value={`${item.fromUser}:${item.toUser}`}>{edgeName(item, "from")} pays {edgeName(item, "to")} {formatMoney(item.amount, currency)}</option>)}
            </select>
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Amount"><input type="number" min="0.01" max={edge.amount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={String(edge.amount)} className={inputClass} /></Field>
            <Field label="Method"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as any)} className={inputClass}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="other">Other</option></select></Field>
            <Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value as any)} className={inputClass}><option value="settled">Full settlement</option><option value="partial">Partial settlement</option></select></Field>
          </div>
          <Field label="Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24`} /></Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={ghostButtonClass}>Cancel</button>
            <button disabled={loading} className={buttonClass}><HandCoins size={16} />{loading ? "Settling..." : "Record settlement"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
