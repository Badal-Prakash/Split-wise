"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, EmptyState, ghostButtonClass, LoadingRows } from "@/components/app/ui";
import { apiRequest } from "@/lib/api-client";

export default function Notifications() {
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const notifications = useQuery({ queryKey: ["notifications", type], queryFn: () => apiRequest<any[]>(`/api/notifications${type ? `?type=${type}` : ""}`) });
  const markRead = useMutation({ mutationFn: (body: any) => apiRequest("/api/notifications", { method: "PATCH", body: JSON.stringify(body) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(`/api/notifications?id=${id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm text-slate-500">Realtime alerts and reminders</p><h2 className="text-2xl font-bold">Notifications</h2></div><button onClick={() => markRead.mutate({ all: true })} className={buttonClass}><CheckCheck size={16} />Mark all read</button></header>
        <div className="card flex flex-wrap gap-2">{["", "expense.added", "settlement.completed", "group.invite", "comment.mention"].map((item) => <button key={item || "all"} onClick={() => setType(item)} className={`rounded-xl px-3 py-2 text-sm ${type === item ? "bg-emerald-500 text-white" : "border border-slate-200 dark:border-slate-800"}`}>{item || "All"}</button>)}</div>
        {notifications.isLoading ? <LoadingRows /> : notifications.data?.length ? <div className="space-y-3">{notifications.data.map((notification) => <div key={notification._id} className={`card flex items-start justify-between gap-3 ${notification.readAt ? "opacity-70" : ""}`}><div className="flex gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950"><Bell size={18} /></div><div><p className="font-semibold">{notification.title}</p><p className="text-sm text-slate-500">{notification.body}</p><p className="mt-1 text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p></div></div><div className="flex gap-1"><button onClick={() => markRead.mutate({ id: notification._id, read: !notification.readAt })} className={ghostButtonClass}>{notification.readAt ? "Unread" : "Read"}</button><button onClick={() => remove.mutate(notification._id)} className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"><Trash2 size={16} /></button></div></div>)}</div> : <EmptyState title="No notifications" body="Expense alerts, settlement reminders, invites, and comment mentions will appear here." />}
      </section>
    </AppShell>
  );
}
