"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass, EmptyState, ghostButtonClass, inputClass, LoadingRows, StatusBanner } from "@/components/app/ui";
import { apiRequest, formatMoney } from "@/lib/api-client";

export default function FriendsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => apiRequest<any>("/api/friends") });
  const search = useQuery({ queryKey: ["friend-search", query], enabled: query.length > 1, queryFn: () => apiRequest<any>(`/api/search?q=${encodeURIComponent(query)}`) });
  const add = useMutation({ mutationFn: (userId: string) => apiRequest("/api/friends", { method: "POST", body: JSON.stringify({ userId, status: "pending" }) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }) });
  const update = useMutation({ mutationFn: (body: any) => apiRequest("/api/friends", { method: "PATCH", body: JSON.stringify(body) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }) });
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(`/api/friends?id=${id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }) });
  const currentUserId = friends.data?.currentUserId;
  const friendUser = (friendship: any) => String(friendship.requesterId?._id ?? friendship.requesterId) === currentUserId ? friendship.addresseeId : friendship.requesterId;

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header><p className="text-sm text-slate-500">Direct expenses and friend balances</p><h2 className="text-2xl font-bold">Friends</h2></header>
        <div className="card">
          <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder="Search users by name or email" /></div>
          {search.data?.users?.length ? <div className="mt-3 grid gap-2 md:grid-cols-2">{search.data.users.map((user: any) => <div key={user._id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><div><p className="font-medium">{user.name}</p><p className="text-sm text-slate-500">{user.email}</p></div><button onClick={() => add.mutate(user._id)} className={buttonClass}><UserPlus size={16} />Add</button></div>)}</div> : query.length > 1 && <p className="mt-3 text-sm text-slate-500">No users found.</p>}
        </div>
        {friends.isLoading ? <LoadingRows /> : friends.data?.friendships?.length ? <div className="grid gap-4 lg:grid-cols-2">{friends.data.friendships.map((friendship: any) => { const user = friendUser(friendship); return <div key={friendship._id} className="card space-y-3"><div className="flex items-start justify-between"><div><p className="font-semibold">{user?.name ?? "Friend"}</p><p className="text-sm text-slate-500">{user?.email ?? <span className="capitalize">{friendship.status}</span>}</p><p className="text-xs capitalize text-slate-500">{friendship.status}</p></div><button onClick={() => remove.mutate(friendship._id)} className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"><X size={16} /></button></div><div className="flex gap-2">{friendship.status === "pending" && <button onClick={() => update.mutate({ id: friendship._id, status: "accepted" })} className={buttonClass}>Accept</button>}<button onClick={() => update.mutate({ id: friendship._id, status: "blocked" })} className={ghostButtonClass}>Block</button></div></div>; })}</div> : <EmptyState title="No friends yet" body="Search for users and add them to create direct expenses and settle balances." />}
        <div className="card"><h3 className="mb-3 font-semibold">Friend balances</h3>{friends.data?.balances?.length ? friends.data.balances.map((edge: any, index: number) => <div key={index} className="mb-2 flex justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span>{edge.fromUserName ?? edge.fromUser} pays {edge.toUserName ?? edge.toUser}</span><b>{formatMoney(edge.amount)}</b></div>) : <StatusBanner>No direct friend balances yet.</StatusBanner>}</div>
      </section>
    </AppShell>
  );
}
