import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { User } from "@/models/User";
import { Expense } from "@/models/Expense";
import { Group } from "@/models/Group";
import { Settlement } from "@/models/Settlement";

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url().or(z.literal("")).optional(),
  currency: z.string().min(3).max(3).optional(),
  timezone: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notificationSettings: z.object({
    expenseAlerts: z.boolean().optional(),
    settlementReminders: z.boolean().optional(),
    groupInvites: z.boolean().optional(),
    commentMentions: z.boolean().optional(),
    email: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function GET(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const url = new URL(req.url);

  const user = await User.findById(uid).select("-password -resetToken -resetTokenExpiresAt").lean();
  if (!user) return fail("User not found", 404);

  if (url.searchParams.get("export") === "true") {
    const [expenses, groups, settlements] = await Promise.all([
      Expense.find({ $or: [{ paidBy: uid }, { "payers.userId": uid }, { "splitBetween.userId": uid }] }).lean(),
      Group.find({ members: uid }).lean(),
      Settlement.find({ $or: [{ fromUser: uid }, { toUser: uid }] }).lean(),
    ]);
    return ok({ user, expenses, groups, settlements, exportedAt: new Date().toISOString() });
  }

  return ok(user);
}

export async function PATCH(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  const parsed = profileSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.message);

  const user = await User.findById(uid);
  if (!user) return fail("User not found", 404);

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) return fail("Current password is required");
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!valid) return fail("Current password is incorrect", 401);
    user.password = await bcrypt.hash(parsed.data.newPassword, 12);
  }

  for (const key of ["name", "avatar", "currency", "timezone", "theme"] as const) {
    if (parsed.data[key] !== undefined) user[key] = parsed.data[key];
  }
  if (parsed.data.notificationSettings) {
    user.notificationSettings = { ...(user.notificationSettings ?? {}), ...parsed.data.notificationSettings };
  }

  await user.save();
  return ok({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, currency: user.currency, timezone: user.timezone, theme: user.theme, notificationSettings: user.notificationSettings });
}

export async function DELETE() {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);
  await User.findByIdAndUpdate(uid, { deletedAt: new Date() });
  return ok({ deleted: true });
}
