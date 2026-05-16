import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { calculateBalances } from "@/services/balanceService";

export async function GET(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const url = new URL(req.url);
  return ok(await calculateBalances({
    userId: url.searchParams.get("userId") ?? uid,
    groupId: url.searchParams.get("groupId") ?? undefined,
  }));
}
