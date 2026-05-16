import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDb, isDbConnectionError } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { User } from "@/models/User";
import { loginSchema } from "@/validators/auth";
import { authCookieOptions, signAccessToken, signRefreshToken } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    await connectDb();
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid credentials",401);
    const user = await User.findOne({ email: parsed.data.email });
    if (!user || !(await bcrypt.compare(parsed.data.password,user.password))) return fail("Invalid credentials",401);
    const jar = await cookies();
    const payload = { sub:user.id, email:user.email };
    const maxAge = body.remember === false ? undefined : 60 * 60 * 24 * 7;
    jar.set("accessToken",signAccessToken(payload),authCookieOptions(maxAge));
    jar.set("refreshToken",signRefreshToken(payload),authCookieOptions(maxAge));
    return ok({ id:user.id, name:user.name, email:user.email });
  } catch (error) {
    if (isDbConnectionError(error)) return fail("Database unavailable. Start MongoDB with `docker compose up -d mongo` and retry.", 503);
    throw error;
  }
}
