import { cookies } from "next/headers";
import { fail, ok } from "@/lib/http";
import { authCookieOptions, signAccessToken, verifyRefreshToken } from "@/lib/auth";
export async function POST(){
  const jar=await cookies(); const token=jar.get("refreshToken")?.value;
  if(!token) return fail("Missing refresh token",401);
  try { const payload=verifyRefreshToken(token); jar.set("accessToken",signAccessToken(payload),authCookieOptions(60 * 15)); return ok(true); }
  catch { return fail("Invalid refresh token",401); }
}
