import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
export type TokenPayload = { sub: string; email: string };
export const signAccessToken = (p: TokenPayload) => jwt.sign(p, process.env.JWT_SECRET!, { expiresIn: "15m" });
export const signRefreshToken = (p: TokenPayload) => jwt.sign(p, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
export const verifyAccessToken = (t: string) => jwt.verify(t, process.env.JWT_SECRET!) as TokenPayload;
export const verifyRefreshToken = (t: string) => jwt.verify(t, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
export const authCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
  path: "/",
  ...(maxAge ? { maxAge } : {})
});
export async function currentUserId() {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return null;
  try { return verifyAccessToken(token).sub; } catch { return null; }
}
export function userIdFromRequest(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;
  if (!token) return null;
  try { return verifyAccessToken(token).sub; } catch { return null; }
}
