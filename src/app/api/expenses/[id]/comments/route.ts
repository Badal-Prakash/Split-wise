import { z } from "zod";
import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Expense } from "@/models/Expense";
import { Activity } from "@/models/Activity";

const commentSchema = z.object({
  body: z.string().min(1),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).default([]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const parsed = commentSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.message);

  const { id } = await params;
  const expense = await Expense.findByIdAndUpdate(id, {
    $push: { comments: { userId: uid, ...parsed.data } },
  }, { new: true });
  if (!expense) return fail("Not found", 404);

  await Activity.create({ actorId: uid, groupId: expense.groupId, type: "comment.added", payload: { expenseId: id } });
  return ok(expense.comments.at(-1), { status: 201 });
}
