import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { User } from "@/models/User";

export async function GET() {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const user = await User.findById(uid).select("name email avatar currency timezone notificationSettings theme createdAt").lean();
  if (!user) return fail("User not found", 404);
  return ok(user);
}
