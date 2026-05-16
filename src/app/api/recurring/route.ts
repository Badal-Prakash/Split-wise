import { z } from "zod";
import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { RecurringExpense } from "@/models/RecurringExpense";
import { generateDueRecurringExpenses } from "@/services/recurringService";

const recurringSchema = z.object({
  template: z.record(z.any()),
  cadence: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  interval: z.number().int().positive().default(1),
  nextRunAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  reminderDaysBefore: z.number().int().min(0).default(0),
});

export async function GET() {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  return ok(await RecurringExpense.find({ createdBy: uid, canceledAt: { $exists: false } }).sort({ nextRunAt: 1 }).lean());
}

export async function POST(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const parsed = recurringSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.message);
  return ok(await RecurringExpense.create({ ...parsed.data, createdBy: uid }), { status: 201 });
}

export async function PATCH(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const body = await req.json();
  if (body.action === "generate-due") return ok(await generateDueRecurringExpenses());
  if (!body.id) return fail("Recurring expense id is required");

  const update = body.action === "pause"
    ? { pausedAt: new Date() }
    : body.action === "cancel"
      ? { canceledAt: new Date() }
      : body;
  return ok(await RecurringExpense.findOneAndUpdate({ _id: body.id, createdBy: uid }, update, { new: true }));
}
