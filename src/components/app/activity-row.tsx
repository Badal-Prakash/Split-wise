"use client";

import { formatIndianDateTime, formatMoney } from "@/lib/api-client";

type Person = { _id?: string; id?: string; name?: string; email?: string };
type Group = { _id?: string; id?: string; name?: string };
type Activity = {
  _id: string;
  actorId?: Person | string;
  groupId?: Group | string;
  type: string;
  payload?: Record<string, any>;
  createdAt: string;
};

const titles: Record<string, string> = {
  "expense.added": "Expense added",
  "expense.edited": "Expense updated",
  "expense.deleted": "Expense deleted",
  "settlement.completed": "Settlement recorded",
  "user.joined_group": "Member joined group",
  "user.left_group": "Member left group",
  "group.created": "Group created",
  "group.updated": "Group updated",
  "group.deleted": "Group deleted",
  "group.invite_sent": "Group invite sent",
  "comment.added": "Comment added",
};

function actorName(activity: Activity) {
  return typeof activity.actorId === "object" ? activity.actorId?.name ?? activity.actorId?.email ?? "Someone" : "Someone";
}

function groupName(activity: Activity) {
  if (typeof activity.groupId === "object" && activity.groupId?.name) return activity.groupId.name;
  return activity.payload?.name ?? "this group";
}

function activityTitle(type: string) {
  return titles[type] ?? type.replaceAll(".", " ").replaceAll("_", " ");
}

function activityDetail(activity: Activity) {
  const payload = activity.payload ?? {};
  const actor = actorName(activity);
  const group = groupName(activity);

  switch (activity.type) {
    case "expense.added":
      return `${actor} added ${payload.title ?? "an expense"} for ${formatMoney(Number(payload.amount ?? 0), payload.currency ?? "INR")}.`;
    case "expense.edited":
      return `${actor} updated ${payload.title ?? "an expense"}.`;
    case "expense.deleted":
      return `${actor} deleted ${payload.title ?? "an expense"}.`;
    case "settlement.completed":
      return `${actor} recorded a settlement of ${formatMoney(Number(payload.amount ?? 0), payload.currency ?? "INR")}.`;
    case "group.created":
      return `${actor} created ${payload.name ?? group}.`;
    case "group.updated":
      return `${actor} updated ${group}.`;
    case "group.deleted":
      return `${actor} deleted ${group}.`;
    case "group.invite_sent":
      return `${actor} invited ${payload.email ?? "someone"} to ${group}.`;
    case "user.joined_group":
      return `${actor} joined ${group}.`;
    case "user.left_group":
      return `${actor} left ${group}.`;
    case "comment.added":
      return `${actor} commented on ${payload.title ?? "an expense"}.`;
    default:
      return `${actor} made an update${group ? ` in ${group}` : ""}.`;
  }
}

export function ActivityRow({ activity, compact = false }: { activity: Activity; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{activityTitle(activity.type)}</p>
        {!compact && <p className="mt-1 text-slate-600 dark:text-slate-300">{activityDetail(activity)}</p>}
      </div>
      <div className="shrink-0 text-left text-xs text-slate-500 md:text-right">
        <p>{formatIndianDateTime(activity.createdAt)}</p>
        {typeof activity.groupId === "object" && activity.groupId?.name && <p>{activity.groupId.name}</p>}
      </div>
    </div>
  );
}
