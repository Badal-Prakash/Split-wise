import { cookies } from "next/headers";
import { ok } from "@/lib/http";
export async function POST(){ const jar=await cookies(); jar.delete("accessToken"); jar.delete("refreshToken"); return ok(true); }
