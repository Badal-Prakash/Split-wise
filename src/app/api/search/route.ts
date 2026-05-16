import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Expense } from "@/models/Expense";
import { Group } from "@/models/Group";
import { User } from "@/models/User";

export async function GET(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) return ok({ expenses: [], groups: [], users: [] });

  const [expenses, groups, users] = await Promise.all([
    Expense.find({ deletedAt: { $exists: false }, $text: { $search: q } }).sort({ date: -1 }).limit(20).lean(),
    Group.find({ members: uid, deletedAt: { $exists: false }, $text: { $search: q } }).limit(20).lean(),
    User.find({ $or: [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }] }).select("name email avatar currency").limit(20).lean(),
  ]);

  return ok({ expenses, groups, users });
}
