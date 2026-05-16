import { cookies } from "next/headers";
import { fail, ok } from "@/lib/http";
import { signAccessToken, verifyRefreshToken } from "@/lib/auth";
export async function POST(){
  const jar=await cookies(); const token=jar.get("refreshToken")?.value;
  if(!token) return fail("Missing refresh token",401);
  try { const payload=verifyRefreshToken(token); jar.set("accessToken",signAccessToken(payload),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"}); return ok(true); }
  catch { return fail("Invalid refresh token",401); }
}
