"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MessageCircle, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, EmptyState, Field, ghostButtonClass, inputClass, LoadingRows, StatusBanner } from "@/components/app/ui";
import { apiRequest, formatMoney } from "@/lib/api-client";

export default function ExpenseDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const router = useRouter();
  const expense = useQuery({ queryKey: ["expense", id], queryFn: () => apiRequest<any>(`/api/expenses/${id}`) });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [comment, setComment] = useState("");

  const update = useMutation({
    mutationFn: () => apiRequest(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify({ title, notes, category }) }),
    onSuccess: () => { setEditing(false); queryClient.invalidateQueries({ queryKey: ["expense", id] }); },
  });
  const remove = useMutation({
    mutationFn: () => apiRequest(`/api/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => router.replace("/dashboard"),
  });
  const addComment = useMutation({
    mutationFn: () => apiRequest(`/api/expenses/${id}/comments`, { method: "POST", body: JSON.stringify({ body: comment, mentions: [] }) }),
    onSuccess: () => { setComment(""); queryClient.invalidateQueries({ queryKey: ["expense", id] }); },
  });

  if (expense.isLoading) return <AppShell><section className="p-4 md:p-8"><LoadingRows /></section></AppShell>;
  if (expense.error || !expense.data) return <AppShell><section className="p-4 md:p-8"><StatusBanner kind="error">{expense.error?.message ?? "Expense not found"}</StatusBanner></section></AppShell>;
  const item = expense.data;
  const paidBy = typeof item.paidBy === "object" ? item.paidBy?.name : item.paidBy;

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><p className="text-sm text-slate-500">{item.category ?? "General"} · {new Date(item.date).toLocaleDateString()}</p><h2 className="text-2xl font-bold">{item.title}</h2><p className="text-slate-500">Paid by {paidBy}</p></div>
          <div className="flex gap-2"><button onClick={() => { setTitle(item.title); setNotes(item.notes ?? ""); setCategory(item.category ?? ""); setEditing(true); }} className={ghostButtonClass}>Edit</button><button onClick={() => remove.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"><Trash2 size={16} />Delete</button></div>
        </header>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="card"><p className="text-sm text-slate-500">Amount</p><b className="text-3xl">{formatMoney(item.amount, item.currency)}</b>{item.notes && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.notes}</p>}<div className="mt-3 flex flex-wrap gap-2">{(item.tags ?? []).map((tag: string) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{tag}</span>)}</div></div>
            <div className="card"><h3 className="mb-3 font-semibold">Split details</h3>{item.splitBetween?.map((split: any) => <div key={String(split.userId?._id ?? split.userId)} className="mb-2 flex justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span>{split.userId?.name ?? split.userId}</span><b>{formatMoney(split.amount, item.currency)}</b></div>)}</div>
            <div className="card"><h3 className="mb-3 font-semibold">Payment breakdown</h3>{item.payers?.map((payer: any) => <div key={String(payer.userId?._id ?? payer.userId)} className="mb-2 flex justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span>{payer.userId?.name ?? payer.userId}</span><b>{formatMoney(payer.amount, item.currency)}</b></div>)}</div>
            <div className="card"><h3 className="mb-3 font-semibold">Edit history</h3>{item.editHistory?.length ? item.editHistory.map((entry: any, index: number) => <p key={index} className="border-b border-slate-100 py-2 text-sm dark:border-slate-800">Edited {new Date(entry.createdAt).toLocaleString()}</p>) : <EmptyState title="No edits yet" />}</div>
          </div>
          <div className="space-y-4">
            <div className="card"><h3 className="mb-3 font-semibold">Receipts and attachments</h3>{item.attachments?.length ? item.attachments.map((src: string, index: number) => src.startsWith("data:image") ? <img key={index} src={src} alt="Receipt preview" className="mb-2 max-h-80 w-full rounded-xl object-cover" /> : <a key={index} href={src} className="block rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">Attachment {index + 1}</a>) : <EmptyState title="No receipt attached" />}</div>
            <div className="card"><h3 className="mb-3 flex items-center gap-2 font-semibold"><MessageCircle size={16} />Comments</h3><form onSubmit={(event) => { event.preventDefault(); addComment.mutate(); }} className="mb-4 flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} className={inputClass} placeholder="Add a comment or @mention" required /><button className={buttonClass}>Post</button></form>{item.comments?.length ? item.comments.map((commentItem: any) => <div key={commentItem._id ?? commentItem.createdAt} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><p className="font-medium">{commentItem.userId?.name ?? "Member"}</p><p>{commentItem.body}</p><div className="mt-2 flex gap-1"><span>👍</span><span>🎉</span><span>✅</span></div></div>) : <EmptyState title="No comments yet" />}</div>
          </div>
        </div>
      </section>
      {editing && <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/50 p-0 backdrop-blur-sm md:place-items-center md:p-6"><form onSubmit={(event) => { event.preventDefault(); update.mutate(); }} className="w-full max-w-xl space-y-3 rounded-t-2xl bg-white p-4 dark:bg-slate-950 md:rounded-2xl"><h3 className="font-semibold">Edit expense</h3>{update.error && <StatusBanner kind="error">{update.error.message}</StatusBanner>}<Field label="Title"><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></Field><Field label="Category"><input value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} /></Field><Field label="Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24`} /></Field><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className={ghostButtonClass}>Cancel</button><button className={buttonClass}><Save size={16} />Save</button></div></form></div>}
    </AppShell>
  );
}
