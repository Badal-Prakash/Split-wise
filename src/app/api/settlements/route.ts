import { z } from "zod";
import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { Settlement } from "@/models/Settlement";
import { Activity } from "@/models/Activity";
import { Notification } from "@/models/Notification";
import { ok, fail } from "@/lib/http";

const settlementSchema = z.object({
  fromUser: z.string(),
  toUser: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  paymentMethod: z.enum(["cash", "upi", "bank", "card", "other"]).default("cash"),
  status: z.enum(["pending", "partial", "settled"]).default("settled"),
  groupId: z.string().optional(),
  notes: z.string().optional(),
  date: z.coerce.date().optional(),
});

export async function GET(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const url = new URL(req.url);
  const query: any = { $or: [{ fromUser: uid }, { toUser: uid }] };
  if (url.searchParams.get("groupId")) query.groupId = url.searchParams.get("groupId");
  return ok(await Settlement.find(query).populate("fromUser", "name email avatar").populate("toUser", "name email avatar").sort({ date: -1 }).lean());
}

export async function POST(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const parsed = settlementSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.message);

  const settlement = await Settlement.create({
    ...parsed.data,
    history: [{ actorId: uid, status: parsed.data.status, amount: parsed.data.amount, notes: parsed.data.notes }],
  });
  await Activity.create({ actorId: uid, groupId: parsed.data.groupId, type: "settlement.completed", payload: { settlementId: settlement._id, amount: settlement.amount } });
  await Notification.create({ userId: parsed.data.toUser, type: "settlement.completed", title: "Settlement recorded", body: `${parsed.data.currency} ${parsed.data.amount} was settled` });
  return ok(settlement, { status: 201 });
}
