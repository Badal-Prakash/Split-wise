import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { Expense } from "@/models/Expense";
import { Group } from "@/models/Group";
import { Activity } from "@/models/Activity";
import { ok, fail } from "@/lib/http";
import { normalizePayers, normalizeSplits } from "@/services/splitService";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const { id } = await params;
  const groups = await Group.find({ members: uid }).select("_id").lean();
  const groupIds = groups.map((group) => group._id);
  const expense = await Expense.findOne({
    _id: id,
    deletedAt: { $exists: false },
    $or: [{ paidBy: uid }, { "payers.userId": uid }, { "splitBetween.userId": uid }, { groupId: { $in: groupIds } }],
  }).populate("paidBy", "name email avatar").populate("payers.userId", "name email avatar").populate("splitBetween.userId", "name email avatar").populate("comments.userId", "name email avatar").lean();
  return expense ? ok(expense) : fail("Not found", 404);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const { id } = await params;
  const before: any = await Expense.findById(id).lean();
  if (!before) return fail("Not found", 404);

  const body = await req.json();
  const next: any = { ...body };
  const amount = Number(body.amount ?? before.amount);
  const splitType = body.splitType ?? before.splitType;

  try {
    if (body.splitBetween) next.splitBetween = normalizeSplits(amount, splitType, body.splitBetween);
    if (body.payers || body.paidBy || body.amount) next.payers = normalizePayers(amount, body.paidBy ?? String(before.paidBy), body.payers);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid expense update");
  }

  const expense: any = await Expense.findByIdAndUpdate(id, {
    $set: next,
    $push: { editHistory: { actorId: uid, before, after: body } },
  }, { new: true });

  await Activity.create({ actorId: uid, groupId: expense.groupId, type: "expense.edited", payload: { expenseId: id } });
  return ok(expense);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const { id } = await params;
  const expense: any = await Expense.findByIdAndUpdate(id, { deletedAt: new Date(), deletedBy: uid }, { new: true });
  if (!expense) return fail("Not found", 404);
  await Activity.create({ actorId: uid, groupId: expense.groupId, type: "expense.deleted", payload: { expenseId: id } });
  return ok({ deleted: true });
}
