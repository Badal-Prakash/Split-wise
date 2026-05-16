import crypto from "crypto";
import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Group } from "@/models/Group";
import { User } from "@/models/User";
import { Activity } from "@/models/Activity";
import { Notification } from "@/models/Notification";
import { GroupInvite } from "@/models/GroupInvite";
import { calculateBalances } from "@/services/balanceService";

function inviteUrl(req: Request, token: string) {
  const origin = process.env.APP_URL || new URL(req.url).origin;
  return `${origin}/groups/join?token=${token}`;
}

async function createInvite({ req, group, uid, email, mode }: { req: Request; group: any; uid: string; email?: string; mode: "user" | "link" }) {
  const normalizedEmail = email?.trim().toLowerCase();
  const invitedUser: any = normalizedEmail ? await User.findOne({ email: normalizedEmail, deletedAt: { $exists: false } }).select("_id email name").lean() : null;

  if (mode === "user") {
    if (!normalizedEmail) throw new Error("Existing user email is required");
    if (!invitedUser) throw new Error("No existing user found with that email");
    if (group.members.some((member: any) => String(member) === String(invitedUser._id))) throw new Error("User is already a member");
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const invite = await GroupInvite.findOneAndUpdate(
    mode === "user"
      ? { groupId: group._id, invitedUserId: invitedUser?._id, status: "pending" }
      : { token },
    {
      groupId: group._id,
      invitedBy: uid,
      invitedUserId: invitedUser?._id,
      email: normalizedEmail,
      token,
      mode,
      status: "pending",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  if (invitedUser) {
    await Notification.create({
      userId: invitedUser._id,
      type: "group.invite",
      title: "Group invite",
      body: `You have a pending invite to join ${group.name}`,
      payload: { inviteId: invite._id, groupId: group._id, token: invite.token, inviteUrl: inviteUrl(req, invite.token) },
    });
  }

  await Activity.create({ actorId: uid, groupId: group._id, type: "group.invite_sent", payload: { groupId: group._id, inviteId: invite._id, mode, email: normalizedEmail } });
  return { invite, inviteUrl: inviteUrl(req, invite.token) };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const { id } = await params;
  const group = await Group.findOne({ _id: id, members: uid, deletedAt: { $exists: false } }).populate("members", "name email avatar currency timezone");
  if (!group) return fail("Not found", 404);

  const [balances, invites] = await Promise.all([
    calculateBalances({ groupId: id, userId: uid }),
    GroupInvite.find({ groupId: id, status: "pending" }).populate("invitedUserId", "name email avatar").populate("invitedBy", "name email").sort({ createdAt: -1 }).lean(),
  ]);
  return ok({ group, balances, invites });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  try {
    const { id } = await params;
    const body = await req.json();
    const group = await Group.findOne({ _id: id, members: uid, deletedAt: { $exists: false } });
    if (!group) return fail("Not found", 404);

    if (body.action === "invite" || body.action === "invite-user") {
      const result = await createInvite({ req, group, uid, email: body.email, mode: "user" });
      return ok({ group, ...result });
    }

    if (body.action === "create-invite-link") {
      const result = await createInvite({ req, group, uid, mode: "link" });
      return ok({ group, ...result });
    }

    let update: any = body;
    let type = "group.updated";
    if (body.action === "leave") {
      update = { $pull: { members: uid } };
      type = "user.left_group";
    } else if (body.action === "delete") {
      update = { deletedAt: new Date() };
      type = "group.deleted";
    } else if (body.action === "remove-member" && body.userId) {
      update = { $pull: { members: body.userId } };
      type = "user.left_group";
    }

    const updated = await Group.findOneAndUpdate({ _id: id, members: uid }, update, { new: true }).populate("members", "name email avatar currency timezone");
    if (!updated) return fail("Not found", 404);
    await Activity.create({ actorId: uid, groupId: id, type, payload: { groupId: id, ...body } });
    return ok(updated);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to update group");
  }
}
