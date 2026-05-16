"use client";

import { apiRequest } from "@/lib/api-client";

const KEY = "splitwise.pending-actions";

type PendingAction = { id: string; path: string; init: RequestInit; createdAt: string };

function readQueue(): PendingAction[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PendingAction[];
}

function writeQueue(actions: PendingAction[]) {
  localStorage.setItem(KEY, JSON.stringify(actions));
}

export function queueAction(path: string, init: RequestInit) {
  const actions = readQueue();
  actions.push({ id: crypto.randomUUID(), path, init, createdAt: new Date().toISOString() });
  writeQueue(actions);
}

export async function flushQueue() {
  const actions = readQueue();
  const remaining: PendingAction[] = [];
  for (const action of actions) {
    try {
      await apiRequest(action.path, action.init);
    } catch {
      remaining.push(action);
    }
  }
  writeQueue(remaining);
  return { flushed: actions.length - remaining.length, pending: remaining.length };
}

export function pendingCount() {
  return readQueue().length;
}
