import { NextResponse } from "next/server";
import { clearPortalAuthCookie } from "@/lib/portal/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearPortalAuthCookie(response);
  return response;
}
