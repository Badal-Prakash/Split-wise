"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, LoadingRows, StatusBanner } from "@/components/app/ui";
import { apiRequest } from "@/lib/api-client";

export default function JoinGroupPage() {
  return <Suspense fallback={<AppShell><section className="p-4 md:p-8"><LoadingRows /></section></AppShell>}><JoinGroup /></Suspense>;
}

function JoinGroup() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [message, setMessage] = useState("");
  const invite = useQuery({ queryKey: ["group-invite", token], enabled: Boolean(token), queryFn: () => apiRequest<any>(`/api/group-invites/${token}`) });
  const accept = useMutation({
    mutationFn: () => apiRequest<any>(`/api/group-invites/${token}`, { method: "POST" }),
    onSuccess: (data) => {
      setMessage("Invite accepted. Opening group...");
      setTimeout(() => router.replace(`/groups/${data.groupId}`), 600);
    },
  });

  return (
    <AppShell>
      <section className="mx-auto max-w-xl space-y-4 p-4 md:p-8">
        <h2 className="text-2xl font-bold">Join group</h2>
        {!token && <StatusBanner kind="error">Invite token is missing.</StatusBanner>}
        {invite.isLoading && <LoadingRows />}
        {invite.error && <StatusBanner kind="error">{invite.error.message}</StatusBanner>}
        {message && <StatusBanner kind="success">{message}</StatusBanner>}
        {invite.data && <div className="card space-y-3"><p className="text-sm text-slate-500">You were invited to join</p><h3 className="text-xl font-semibold">{invite.data.groupId?.name ?? "Group"}</h3><p className="text-sm text-slate-500">Invited by {invite.data.invitedBy?.name ?? "a member"}</p><button disabled={accept.isPending} onClick={() => accept.mutate()} className={buttonClass + " w-full"}>{accept.isPending ? "Joining..." : "Accept invite"}</button>{accept.error && <StatusBanner kind="error">{accept.error.message}</StatusBanner>}</div>}
      </section>
    </AppShell>
  );
}
