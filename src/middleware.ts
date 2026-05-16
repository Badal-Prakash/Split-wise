import { NextRequest, NextResponse } from "next/server";
export function middleware(req:NextRequest){
  const protectedPaths=["/dashboard","/groups","/expenses","/settle","/friends","/activity","/search","/analytics","/import","/profile","/notifications"];
  if(protectedPaths.some(p=>req.nextUrl.pathname.startsWith(p)) && !req.cookies.get("accessToken")){
    return NextResponse.redirect(new URL("/login",req.url));
  }
  return NextResponse.next();
}
export const config={ matcher:["/dashboard/:path*","/groups/:path*","/expenses/:path*","/settle/:path*","/friends/:path*","/activity/:path*","/search/:path*","/analytics/:path*","/import/:path*","/profile/:path*","/notifications/:path*"] };
