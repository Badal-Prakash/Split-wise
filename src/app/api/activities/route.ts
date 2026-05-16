import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Activity } from "@/models/Activity";
import { Group } from "@/models/Group";

export async function GET(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const url = new URL(req.url);
  const groups = await Group.find({ members: uid }).select("_id").lean();
  const groupIds = groups.map((group) => group._id);
  const query: any = { $or: [{ actorId: uid }, { groupId: { $in: groupIds } }] };
  if (url.searchParams.get("groupId")) query.groupId = url.searchParams.get("groupId");
  if (url.searchParams.get("type")) query.type = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 40), 100);
  const skip = Number(url.searchParams.get("skip") ?? 0);

  const activities = await Activity.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  return ok(activities);
}
