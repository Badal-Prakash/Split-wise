import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Group } from "@/models/Group";
import { User } from "@/models/User";
import { Activity } from "@/models/Activity";
import { Notification } from "@/models/Notification";
import { GroupInvite } from "@/models/GroupInvite";

async function completeInvite(invite: any, uid: string, status: "accepted" | "rejected") {
  if (invite.status !== "pending") throw new Error("Invite is no longer pending");
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Invite has expired");
  if (invite.invitedUserId && String(invite.invitedUserId) !== uid) throw new Error("This invite belongs to another user");

  invite.status = status;
  if (status === "accepted") invite.acceptedAt = new Date();
  if (status === "rejected") invite.rejectedAt = new Date();
  await invite.save();

  if (status === "accepted") {
    await Group.findByIdAndUpdate(invite.groupId, { $addToSet: { members: uid } });
    await Activity.create({ actorId: uid, groupId: invite.groupId, type: "user.joined_group", payload: { inviteId: invite._id } });
  }

  await Notification.updateMany({ userId: uid, "payload.inviteId": invite._id }, { $set: { readAt: new Date() } });
  return invite;
}

export async function GET() {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const user: any = await User.findById(uid).select("email").lean();
  const invites = await GroupInvite.find({
    status: "pending",
    $or: [{ invitedUserId: uid }, { email: user?.email }],
  }).populate("groupId", "name category defaultCurrency avatar").populate("invitedBy", "name email").sort({ createdAt: -1 }).lean();
  return ok(invites);
}

export async function PATCH(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  try {
    const body = await req.json();
    if (!body.id || !["accepted", "rejected"].includes(body.status)) return fail("Invite id and accepted/rejected status are required");
    const invite = await GroupInvite.findById(body.id);
    if (!invite) return fail("Invite not found", 404);
    return ok(await completeInvite(invite, uid, body.status));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to update invite");
  }
}
