"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, ReceiptText, Save } from "lucide-react";
import { apiRequest, formatMoney } from "@/lib/api-client";
import { queueAction } from "@/lib/offline-queue";
import { buttonClass, Field, ghostButtonClass, inputClass, Modal, StatusBanner } from "@/components/app/ui";

type UserLite = { _id?: string; id?: string; name: string; email?: string; currency?: string };
type GroupLite = { _id: string; name: string; defaultCurrency?: string; members?: UserLite[] };
type SplitType = "equal" | "exact" | "percentage" | "shares" | "unequal" | "adjustment";

const splitTypes: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "percentage", label: "Percent" },
  { value: "shares", label: "Shares" },
  { value: "unequal", label: "Unequal" },
  { value: "adjustment", label: "Adjustment" },
];

const idOf = (user: UserLite | string) => typeof user === "string" ? user : String(user._id ?? user.id);

export function ExpenseModal({ open, onClose, onSaved, me, groups = [], initialGroupId }: { open: boolean; onClose: () => void; onSaved?: () => void; me?: UserLite; groups?: GroupLite[]; initialGroupId?: string }) {
  const draftKey = "splitwise.expense-draft";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [groupId, setGroupId] = useState(initialGroupId ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState(me?.currency ?? "INR");
  const [paidBy, setPaidBy] = useState(me ? idOf(me) : "");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [participants, setParticipants] = useState<string[]>(me ? [idOf(me)] : []);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, number>>({});
  const [splitValues, setSplitValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState("");

  const selectedGroup = groups.find((group) => group._id === groupId);
  const users = useMemo(() => {
    const byId = new Map<string, UserLite>();
    if (me) byId.set(idOf(me), me);
    for (const member of selectedGroup?.members ?? []) byId.set(idOf(member), member);
    return [...byId.entries()].map(([id, user]) => ({ id, name: user.name, email: user.email }));
  }, [me, selectedGroup]);

  useEffect(() => {
    if (!open) return;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      setTitle(draft.title ?? "");
      setAmount(String(draft.amount ?? "0"));
      setNotes(draft.notes ?? "");
      setTags(draft.tags ?? "");
      setCategory(draft.category ?? "General");
    } catch {}
  }, [open]);

  useEffect(() => {
    if (!me) return;
    const meId = idOf(me);
    setCurrency(selectedGroup?.defaultCurrency ?? me.currency ?? "INR");
    setPaidBy((value) => value || meId);
    setParticipants((value) => value.length ? value : [meId]);
  }, [me, selectedGroup]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(draftKey, JSON.stringify({ title, amount, notes, tags, category }));
  }, [title, amount, notes, tags, category, open]);

  useEffect(() => {
    if (selectedGroup?.defaultCurrency) setCurrency(selectedGroup.defaultCurrency);
    if (selectedGroup?.members?.length) setParticipants(selectedGroup.members.map(idOf));
  }, [selectedGroup]);

  useEffect(() => {
    const total = Number(amount) || 0;
    if (paidBy && total) setPayerAmounts((current) => Object.keys(current).length <= 1 ? { [paidBy]: total } : ({ ...current, [paidBy]: current[paidBy] ?? total }));
  }, [paidBy, amount]);

  const calculatedSplits = useMemo(() => {
    const total = Math.round((Number(amount) || 0) * 100);
    const selected = participants.length ? participants : users.map((user) => user.id);
    if (!selected.length) return [];
    if (splitType === "equal") {
      const base = Math.floor(total / selected.length);
      let remainder = total - base * selected.length;
      return selected.map((userId) => ({ userId, amount: (base + (remainder-- > 0 ? 1 : 0)) / 100 }));
    }
    if (splitType === "percentage") return selected.map((userId) => ({ userId, percentage: splitValues[userId] ?? 0, amount: ((Number(amount) || 0) * (splitValues[userId] ?? 0)) / 100 }));
    if (splitType === "shares") {
      const totalShares = selected.reduce((sum, userId) => sum + (splitValues[userId] ?? 0), 0);
      return selected.map((userId) => ({ userId, shares: splitValues[userId] ?? 0, amount: totalShares ? ((Number(amount) || 0) * (splitValues[userId] ?? 0)) / totalShares : 0 }));
    }
    return selected.map((userId) => ({ userId, amount: splitValues[userId] ?? 0, ...(splitType === "adjustment" ? { adjustment: 0 } : {}) }));
  }, [amount, participants, splitType, splitValues, users]);

  async function readReceipt(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const total = Number(amount);
    const payers = Object.entries(payerAmounts).filter(([, value]) => Number(value) > 0).map(([userId, value]) => ({ userId, amount: Number(value) }));
    const payload = {
      title,
      amount: total,
      currency,
      paidBy,
      payers: payers.length ? payers : [{ userId: paidBy, amount: total }],
      splitBetween: calculatedSplits,
      splitType,
      groupId: groupId || undefined,
      category,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      notes,
      date,
      attachments: receiptPreview ? [receiptPreview] : [],
      recurring: recurring ? { enabled: true, cadence: "monthly", interval: 1, nextRunAt: date } : undefined,
    };

    setLoading(true);
    try {
      if (!navigator.onLine) {
        queueAction("/api/expenses", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await apiRequest("/api/expenses", { method: "POST", body: JSON.stringify(payload) });
      }
      localStorage.removeItem(draftKey);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save expense");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add expense" open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <StatusBanner kind="error">{error}</StatusBanner>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title"><input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Dinner, rent, flight" /></Field>
          <Field label={`Amount (${currency})`}><input required min="0.01" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Group"><select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputClass}><option value="">No group</option>{groups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}</select></Field>
          <Field label="Paid by"><select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={inputClass}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
        </div>
        <Field label={<span className="flex items-center gap-2"><CalendarDays size={15} />Date</span>}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Participants</p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {users.map((user) => <label key={user.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-800"><input type="checkbox" checked={participants.includes(user.id)} onChange={(e) => setParticipants((items) => e.target.checked ? [...items, user.id] : items.filter((id) => id !== user.id))} />{user.name}</label>)}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
          <Field label="Split type"><select value={splitType} onChange={(e) => setSplitType(e.target.value as SplitType)} className={inputClass}>{splitTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <p className="mb-2 text-sm font-medium">Live split</p>
            <div className="grid gap-2 md:grid-cols-2">
              {calculatedSplits.map((split) => {
                const user = users.find((item) => item.id === split.userId);
                const editable = splitType !== "equal";
                return <div key={split.userId} className="flex items-center gap-2 text-sm"><span className="min-w-24 flex-1 truncate">{user?.name ?? split.userId}</span>{editable && <input type="number" step="0.01" value={splitValues[split.userId] ?? ""} onChange={(e) => setSplitValues((values) => ({ ...values, [split.userId]: Number(e.target.value) }))} className={`${inputClass} w-24`} placeholder={splitType === "percentage" ? "%" : splitType === "shares" ? "shares" : "amount"} />}<b>{formatMoney(split.amount, currency)}</b></div>;
              })}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 text-sm font-medium">Multiple payers</p>
          <div className="grid gap-2 md:grid-cols-3">
            {users.map((user) => <Field key={user.id} label={user.name}><input type="number" step="0.01" value={payerAmounts[user.id] ?? ""} onChange={(e) => setPayerAmounts((values) => ({ ...values, [user.id]: Number(e.target.value) }))} className={inputClass} /></Field>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} /></Field>
          <Field label="Tags"><input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="food, travel" /></Field>
        </div>
        <Field label={<span className="flex items-center gap-2"><ReceiptText size={15} />Receipt</span>}><input type="file" accept="image/*,.pdf" onChange={(e) => readReceipt(e.target.files?.[0])} className={inputClass} /></Field>
        {receiptPreview && <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-900"><ReceiptText size={16} /> Receipt attached and ready to save.</div>}
        <Field label={<span className="flex items-center gap-2"><FileText size={15} />Notes</span>}><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} min-h-20`} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Repeat monthly from this date</label>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostButtonClass}>Cancel</button>
          <button disabled={loading} className={buttonClass}><Save size={16} />{loading ? "Saving..." : typeof navigator !== "undefined" && navigator.onLine ? "Save expense" : "Queue offline"}</button>
        </div>
      </form>
    </Modal>
  );
}
