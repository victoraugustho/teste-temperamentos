import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/portal/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      nome: user.name,
    },
  });
}
