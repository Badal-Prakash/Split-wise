"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityRow } from "@/components/app/activity-row";
import { EmptyState, Field, inputClass, LoadingRows } from "@/components/app/ui";
import { apiRequest } from "@/lib/api-client";

const types = ["", "expense.added", "expense.edited", "expense.deleted", "settlement.completed", "user.joined_group", "user.left_group", "comment.added"];
const typeLabel = (type: string) => type ? type.replaceAll(".", " ").replaceAll("_", " ") : "All activity";

export default function ActivityPage() {
  const [type, setType] = useState("");
  const [groupId, setGroupId] = useState("");
  const [limit, setLimit] = useState(30);
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => apiRequest<any[]>("/api/groups") });
  const activities = useQuery({ queryKey: ["activities", type, groupId, limit], queryFn: () => apiRequest<any[]>(`/api/activities?limit=${limit}${type ? `&type=${type}` : ""}${groupId ? `&groupId=${groupId}` : ""}`) });

  return (
    <AppShell>
      <section className="space-y-5 p-4 md:p-8">
        <header><p className="text-sm text-slate-500">Infinite activity stream</p><h2 className="text-2xl font-bold">Activity</h2></header>
        <div className="card grid gap-3 md:grid-cols-2"><Field label="Group"><select value={groupId} onChange={(event) => setGroupId(event.target.value)} className={inputClass}><option value="">All groups</option>{groups.data?.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}</select></Field><Field label="Type"><select value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>{types.map((item) => <option key={item || "all"} value={item}>{typeLabel(item)}</option>)}</select></Field></div>
        {activities.isLoading ? <LoadingRows /> : activities.data?.length ? <div className="space-y-3">{activities.data.map((activity) => <ActivityRow key={activity._id} activity={activity} />)}{activities.data.length >= limit && <button onClick={() => setLimit((value) => value + 30)} className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">Load more</button>}</div> : <EmptyState title="No matching activity" />}
      </section>
    </AppShell>
  );
}
