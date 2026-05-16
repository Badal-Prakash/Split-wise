import { z } from "zod";
import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Friendship } from "@/models/Friendship";
import { User } from "@/models/User";
import { calculateBalances } from "@/services/balanceService";

const friendSchema = z.object({ userId: z.string(), status: z.enum(["pending", "accepted", "blocked"]).default("pending") });

export async function GET() {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const friendships = await Friendship.find({ $or: [{ requesterId: uid }, { addresseeId: uid }] })
    .populate("requesterId", "name email avatar")
    .populate("addresseeId", "name email avatar")
    .lean();
  const balances = await calculateBalances({ userId: uid });
  return ok({ currentUserId: uid, friendships, balances: balances.simplifiedBalances });
}

export async function POST(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const parsed = friendSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.message);

  const friend = await User.findById(parsed.data.userId).select("_id").lean();
  if (!friend) return fail("User not found", 404);
  if (parsed.data.userId === uid) return fail("You cannot add yourself");

  const friendship = await Friendship.findOneAndUpdate(
    { requesterId: uid, addresseeId: parsed.data.userId },
    { requesterId: uid, addresseeId: parsed.data.userId, status: parsed.data.status, recentInteractionAt: new Date() },
    { new: true, upsert: true },
  );
  return ok(friendship, { status: 201 });
}

export async function PATCH(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const body = await req.json();
  if (!body.id || !["accepted", "blocked", "pending"].includes(body.status)) return fail("Friendship id and valid status are required");
  const friendship = await Friendship.findOneAndUpdate(
    { _id: body.id, $or: [{ requesterId: uid }, { addresseeId: uid }] },
    { status: body.status, recentInteractionAt: new Date() },
    { new: true },
  );
  return friendship ? ok(friendship) : fail("Not found", 404);
}

export async function DELETE(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("Friendship id is required");
  await Friendship.deleteOne({ _id: id, $or: [{ requesterId: uid }, { addresseeId: uid }] });
  return ok({ deleted: true });
}
