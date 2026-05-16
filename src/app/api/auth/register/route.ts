import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDb, isDbConnectionError } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { User } from "@/models/User";
import { registerSchema } from "@/validators/auth";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    await connectDb();
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.message);
    if (await User.exists({ email: parsed.data.email })) return fail("Email already registered",409);
    const user = await User.create({ ...parsed.data, password: await bcrypt.hash(parsed.data.password,12) });
    const jar = await cookies();
    const payload = { sub:user.id, email:user.email };
    jar.set("accessToken",signAccessToken(payload),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});
    jar.set("refreshToken",signRefreshToken(payload),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});
    return ok({ id:user.id, name:user.name, email:user.email }, { status: 201 });
  } catch (error) {
    if (isDbConnectionError(error)) return fail("Database unavailable. Start MongoDB with `docker compose up -d mongo` and retry.", 503);
    throw error;
  }
}
