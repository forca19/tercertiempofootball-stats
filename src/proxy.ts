import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";

export async function proxy(request: NextRequest) {
  const isAdminRoute =
    request.nextUrl.pathname.startsWith("/admin");

  const isLoginRoute =
    request.nextUrl.pathname === "/admin/login";

  if (!isAdminRoute || isLoginRoute) {
    return NextResponse.next();
  }

  const token =
  request.cookies.get("admin-auth")?.value;

if (!token) {
  return NextResponse.redirect(
    new URL("/admin/login", request.url)
  );
}

const payload =
  await verifyAdminToken(token);

if (!payload) {
  return NextResponse.redirect(
    new URL("/admin/login", request.url)
  );
}

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};