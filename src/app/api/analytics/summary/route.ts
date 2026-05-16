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
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const from = fromParam ? new Date(String(fromParam)) : undefined;
  const to = toParam ? new Date(String(toParam)) : undefined;

  const groups = await Group.find({ members: uid }).select("_id name").lean();
  const groupIds = groups.map((group) => group._id);

  const match: any = {
    deletedAt: { $exists: false },
    $or: [{ paidBy: uid }, { "payers.userId": uid }, { "splitBetween.userId": uid }, { groupId: { $in: groupIds } }],
  };
  if (groupId) match.groupId = groupId;
  if (category) match.category = category;
  if (from || to) match.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

  // For comparison: define previous period
  const prevMatch = { ...match };
  if (from && to) {
    const diff = to.getTime() - from.getTime();
    prevMatch.date = {
      $gte: new Date(from.getTime() - diff),
      $lte: new Date(from.getTime())
    };
  }

  const [monthly, categories, groupSpending, userContribution, settlements, prevMonthly] = await Promise.all([
    Expense.aggregate([{ $match: match }, { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { "_id.y": 1, "_id.m": 1 } }]),
    Expense.aggregate([{ $match: match }, { $group: { _id: { $ifNull: ["$category", "General"] }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Expense.aggregate([{ $match: match }, { $group: { _id: "$groupId", total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $lookup: { from: "groups", localField: "_id", foreignField: "_id", as: "group" } }, { $unwind: "$group" }]),
    Expense.aggregate([{ $match: match }, { $unwind: "$splitBetween" }, { $group: { _id: "$splitBetween.userId", total: { $sum: "$splitBetween.amount" } } }, { $sort: { total: -1 } }, { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } }, { $unwind: "$user" }]),
    Settlement.aggregate([{ $match: { $or: [{ fromUser: uid }, { toUser: uid }] } }, { $group: { _id: "$paymentMethod", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    (from && to) ? Expense.aggregate([{ $match: prevMatch }, { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { "_id.y": 1, "_id.m": 1 } }]) : Promise.resolve([])
  ]);

  return ok({
    monthly: monthly.map((row) => ({ month: `${row._id.y}-${String(row._id.m).padStart(2, "0")}`, total: row.total, count: row.count })),
    prevMonthly: prevMonthly.map((row) => ({ month: `${row._id.y}-${String(row._id.m).padStart(2, "0")}`, total: row.total, count: row.count })),
    categories: categories.map((row) => ({ category: row._id, total: row.total, count: row.count })),
    groups: groupSpending.map((row) => ({ groupId: row._id, name: row.group.name, total: row.total, count: row.count })),
    userContribution: userContribution.map((row) => ({ userId: row._id, name: row.user.name, total: row.total })),
    settlements: settlements.map((row) => ({ method: row._id ?? "cash", total: row.total, count: row.count })),
  });
}
