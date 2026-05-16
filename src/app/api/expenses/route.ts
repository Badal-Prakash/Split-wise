import { connectDb } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { Group } from "@/models/Group";
import { Activity } from "@/models/Activity";
import { Notification } from "@/models/Notification";
import { ok, fail } from "@/lib/http";
import { currentUserId } from "@/lib/auth";
import { expenseSchema } from "@/validators/expense";
import { normalizePayers, normalizeSplits } from "@/services/splitService";

export async function GET(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const url = new URL(req.url);
  const groups = await Group.find({ members: uid }).select("_id").lean();
  const groupIds = groups.map((group) => group._id);
  const query: any = {
    deletedAt: { $exists: false },
    $or: [{ paidBy: uid }, { "payers.userId": uid }, { "splitBetween.userId": uid }, { groupId: { $in: groupIds } }],
  };
  if (url.searchParams.get("groupId")) query.groupId = url.searchParams.get("groupId");
  if (url.searchParams.get("q")) query.$text = { $search: url.searchParams.get("q") };
  if (url.searchParams.get("category")) query.category = url.searchParams.get("category");
  if (url.searchParams.get("paidBy")) query.paidBy = url.searchParams.get("paidBy");
  if (url.searchParams.get("from") || url.searchParams.get("to")) {
    query.date = {
      ...(url.searchParams.get("from") ? { $gte: new Date(String(url.searchParams.get("from"))) } : {}),
      ...(url.searchParams.get("to") ? { $lte: new Date(String(url.searchParams.get("to"))) } : {}),
    };
  }

  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const skip = Number(url.searchParams.get("skip") ?? 0);
  return ok(await Expense.find(query).populate("paidBy", "name email avatar").populate("payers.userId", "name email avatar").populate("splitBetween.userId", "name email avatar").sort({ date: -1 }).skip(skip).limit(limit).lean());
}

export async function POST(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const parsed = expenseSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.message);

  try {
    const data = {
      ...parsed.data,
      payers: normalizePayers(parsed.data.amount, parsed.data.paidBy, parsed.data.payers),
      splitBetween: normalizeSplits(parsed.data.amount, parsed.data.splitType, parsed.data.splitBetween),
    };
    if (data.groupId) {
      const group = await Group.findOne({ _id: data.groupId, members: uid }).select("_id").lean();
      if (!group) return fail("Group not found", 404);
    }
    const expense = await Expense.create(data);
    if (data.groupId) await Group.findByIdAndUpdate(data.groupId, { $addToSet: { expenses: expense._id } });

    await Activity.create({ actorId: uid, groupId: data.groupId, type: "expense.added", payload: { expenseId: expense._id, title: expense.title, amount: expense.amount } });
    await Notification.insertMany(data.splitBetween.filter((split) => split.userId !== uid).map((split) => ({
      userId: split.userId,
      type: "expense.added",
      title: "New expense",
      body: `${expense.title} was added for ${expense.currency} ${split.amount}`,
    })));

    return ok(expense, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid expense");
  }
}
