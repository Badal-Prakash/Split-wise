import crypto from "crypto";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";
import { ok } from "@/lib/http";
export async function POST(req: Request) {
  await connectDb();
  const { email } = await req.json();
  const token = crypto.randomBytes(24).toString("hex");
  const user = await User.findOneAndUpdate(
    { email },
    { resetToken: token, resetTokenExpiresAt: new Date(Date.now() + 3600_000) },
    { new: true },
  );
  return ok({
    accepted: true,
    resetUrl:
      user && process.env.NODE_ENV !== "production"
        ? `${process.env.APP_URL ?? "http://localhost:3000"}/forgot-password?token=${token}`
        : undefined,
  });
}
