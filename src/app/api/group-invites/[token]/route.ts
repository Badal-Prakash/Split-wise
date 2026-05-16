import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Group } from "@/models/Group";
import { Activity } from "@/models/Activity";
import { GroupInvite } from "@/models/GroupInvite";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  await connectDb();
  const { token } = await params;
  const invite: any = await GroupInvite.findOne({ token, status: "pending" }).populate("groupId", "name category defaultCurrency avatar").populate("invitedBy", "name email").lean();
  if (!invite) return fail("Invite not found or already used", 404);
  if (invite.expiresAt && invite.expiresAt < new Date()) return fail("Invite has expired", 410);
  return ok(invite);
}

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const { token } = await params;
  const invite = await GroupInvite.findOne({ token, status: "pending" });
  if (!invite) return fail("Invite not found or already used", 404);
  if (invite.expiresAt && invite.expiresAt < new Date()) return fail("Invite has expired", 410);
  if (invite.invitedUserId && String(invite.invitedUserId) !== uid) return fail("This invite belongs to another user", 403);

  invite.status = "accepted";
  invite.acceptedAt = new Date();
  await invite.save();
  await Group.findByIdAndUpdate(invite.groupId, { $addToSet: { members: uid } });
  await Activity.create({ actorId: uid, groupId: invite.groupId, type: "user.joined_group", payload: { inviteId: invite._id, via: "invite-link" } });
  return ok(invite);
}
