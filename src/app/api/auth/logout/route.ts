import { cookies } from "next/headers";
import { ok } from "@/lib/http";
import { authCookieOptions } from "@/lib/auth";
export async function POST(){ const jar=await cookies(); jar.set("accessToken","",{...authCookieOptions(),maxAge:0}); jar.set("refreshToken","",{...authCookieOptions(),maxAge:0}); return ok(true); }
