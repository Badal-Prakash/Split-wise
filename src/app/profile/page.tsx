"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Download, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass, Field, ghostButtonClass, inputClass, LoadingRows, StatusBanner } from "@/components/app/ui";
import { apiRequest, downloadFile } from "@/lib/api-client";

export default function Profile() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => apiRequest<any>("/api/profile") });
  const notifications = useQuery({ queryKey: ["notifications", "profile"], queryFn: () => apiRequest<any[]>("/api/notifications") });
  const [form, setForm] = useState<any>({ name: "", avatar: "", currency: "INR", timezone: "Asia/Kolkata", theme: "system", notificationSettings: {} });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  useEffect(() => { if (profile.data) setForm({ ...profile.data, notificationSettings: profile.data.notificationSettings ?? {} }); }, [profile.data]);
  const save = useMutation({
    mutationFn: () => apiRequest("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({
        name: form.name,
        avatar: form.avatar,
        currency: form.currency,
        timezone: form.timezone,
        theme: form.theme,
        notificationSettings: form.notificationSettings,
        currentPassword: passwords.currentPassword || undefined,
        newPassword: passwords.newPassword || undefined,
      }),
    }),
    onSuccess: () => { setPasswords({ currentPassword: "", newPassword: "" }); queryClient.invalidateQueries({ queryKey: ["profile"] }); },
  });
  const remove = useMutation({ mutationFn: () => apiRequest("/api/profile", { method: "DELETE" }) });
  const markRead = useMutation({ mutationFn: (body: any) => apiRequest("/api/notifications", { method: "PATCH", body: JSON.stringify(body) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const removeNotification = useMutation({ mutationFn: (id: string) => apiRequest(`/api/notifications?id=${id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const updateInvite = useMutation({ mutationFn: (body: any) => apiRequest("/api/group-invites", { method: "PATCH", body: JSON.stringify(body) }), onSuccess: () => queryClient.invalidateQueries() });

  async function exportData() {
    const data = await apiRequest<any>("/api/profile?export=true");
    downloadFile("splitwise-user-export.json", JSON.stringify(data, null, 2), "application/json");
  }

  if (profile.isLoading) return <AppShell><section className="p-4 md:p-8"><LoadingRows /></section></AppShell>;

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm text-slate-500">Account, security, preferences</p><h2 className="text-2xl font-bold">Profile settings</h2></div><div className="flex gap-2"><ThemeToggle /><button onClick={exportData} className={ghostButtonClass}><Download size={16} />Export data</button></div></header>
        <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="card space-y-3">
            <h3 className="font-semibold">Profile</h3>
            {save.error && <StatusBanner kind="error">{save.error.message}</StatusBanner>}
            {save.isSuccess && <StatusBanner kind="success">Profile saved.</StatusBanner>}
            <Field label="Name"><input value={form.name ?? ""} onChange={(event) => setForm((value: any) => ({ ...value, name: event.target.value }))} className={inputClass} /></Field>
            <Field label="Email"><input value={form.email ?? ""} readOnly disabled className={`${inputClass} cursor-not-allowed opacity-70`} /></Field>
            <Field label="Avatar URL"><input value={form.avatar ?? ""} onChange={(event) => setForm((value: any) => ({ ...value, avatar: event.target.value }))} className={inputClass} /></Field>
            <div className="grid gap-3 md:grid-cols-2"><Field label="Preferred currency"><input value={form.currency ?? "INR"} onChange={(event) => setForm((value: any) => ({ ...value, currency: event.target.value.toUpperCase() }))} maxLength={3} className={inputClass} /></Field><Field label="Timezone"><input value={form.timezone ?? "Asia/Kolkata"} onChange={(event) => setForm((value: any) => ({ ...value, timezone: event.target.value }))} className={inputClass} /></Field></div>
            <Field label="Theme"><select value={form.theme ?? "system"} onChange={(event) => setForm((value: any) => ({ ...value, theme: event.target.value }))} className={inputClass}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></Field>
          </div>
          <div className="card space-y-3">
            <h3 className="font-semibold">Security</h3>
            <Field label="Current password"><input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords((value) => ({ ...value, currentPassword: event.target.value }))} className={inputClass} /></Field>
            <Field label="New password"><input type="password" minLength={8} value={passwords.newPassword} onChange={(event) => setPasswords((value) => ({ ...value, newPassword: event.target.value }))} className={inputClass} /></Field>
            <h3 className="pt-3 font-semibold">Notification preferences</h3>
            {["expenseAlerts", "settlementReminders", "groupInvites", "commentMentions", "email", "push"].map((key) => <label key={key} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span>{key.replace(/([A-Z])/g, " $1")}</span><input type="checkbox" checked={Boolean(form.notificationSettings?.[key])} onChange={(event) => setForm((value: any) => ({ ...value, notificationSettings: { ...(value.notificationSettings ?? {}), [key]: event.target.checked } }))} /></label>)}
          </div>
          <div className="flex gap-2 lg:col-span-2"><button disabled={save.isPending} className={buttonClass}><Save size={16} />{save.isPending ? "Saving..." : "Save settings"}</button><button type="button" onClick={() => remove.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"><Trash2 size={16} />Delete account</button></div>
        </form>
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Alerts</h3><button onClick={() => markRead.mutate({ all: true })} className={ghostButtonClass}><CheckCheck size={16} />Mark read</button></div>
          {notifications.isLoading ? <LoadingRows count={2} /> : notifications.data?.length ? <div className="space-y-2">{notifications.data.slice(0, 8).map((notification) => <div key={notification._id} className={`flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900 ${notification.readAt ? "opacity-70" : ""}`}><div className="flex min-w-0 gap-3"><Bell className="mt-0.5 shrink-0 text-emerald-500" size={18} /><div className="min-w-0"><p className="font-medium">{notification.title}</p><p className="truncate text-slate-500">{notification.body}</p>{notification.type === "group.invite" && notification.payload?.inviteId && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => updateInvite.mutate({ id: notification.payload.inviteId, status: "accepted" })} className={buttonClass}>Accept</button><button onClick={() => updateInvite.mutate({ id: notification.payload.inviteId, status: "rejected" })} className={ghostButtonClass}>Reject</button></div>}</div></div><button onClick={() => removeNotification.mutate(notification._id)} className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"><Trash2 size={15} /></button></div>)}</div> : <StatusBanner>No alerts right now.</StatusBanner>}
 
        </div>
      </section>
    </AppShell>
  );
}
