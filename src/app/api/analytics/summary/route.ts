import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Expense } from "@/models/Expense";
import { Settlement } from "@/models/Settlement";
import { Group } from "@/models/Group";

export async function GET(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const url = new URL(req.url);
  const groupId = url.searchParams.get("groupId");
  const category = url.searchParams.get("category");
  const from = url.searchParams.get("from") ? new Date(String(url.searchParams.get("from"))) : undefined;
  const to = url.searchParams.get("to") ? new Date(String(url.searchParams.get("to"))) : undefined;
  const groups = await Group.find({ members: uid }).select("_id name").lean();
  const groupIds = groups.map((group) => group._id);
  const match: any = {
    deletedAt: { $exists: false },
    $or: [{ paidBy: uid }, { "payers.userId": uid }, { "splitBetween.userId": uid }, { groupId: { $in: groupIds } }],
  };
  if (groupId) match.groupId = groupId;
  if (category) match.category = category;
  if (from || to) match.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

  const [monthly, categories, groupSpending, userContribution, settlements] = await Promise.all([
    Expense.aggregate([{ $match: match }, { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { "_id.y": 1, "_id.m": 1 } }]),
    Expense.aggregate([{ $match: match }, { $group: { _id: { $ifNull: ["$category", "General"] }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Expense.aggregate([{ $match: match }, { $group: { _id: "$groupId", total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Expense.aggregate([{ $match: match }, { $unwind: "$splitBetween" }, { $group: { _id: "$splitBetween.userId", total: { $sum: "$splitBetween.amount" } } }, { $sort: { total: -1 } }]),
    Settlement.aggregate([{ $match: { $or: [{ fromUser: uid }, { toUser: uid }] } }, { $group: { _id: "$paymentMethod", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
  ]);

  return ok({
    monthly: monthly.map((row) => ({ month: `${row._id.y}-${String(row._id.m).padStart(2, "0")}`, total: row.total, count: row.count })),
    categories: categories.map((row) => ({ category: row._id, total: row.total, count: row.count })),
    groups: groupSpending.map((row) => ({ groupId: row._id, total: row.total, count: row.count })),
    userContribution: userContribution.map((row) => ({ userId: row._id, total: row.total })),
    settlements: settlements.map((row) => ({ method: row._id ?? "cash", total: row.total, count: row.count })),
  });
}
