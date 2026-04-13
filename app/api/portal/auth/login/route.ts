import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createPortalAuthToken,
  setPortalAuthCookie,
} from "@/lib/portal/auth";
import { verifyPassword } from "@/lib/portal/crypto";
import { consumeRateLimit } from "@/lib/portal/rate-limit";
import { getClientIp } from "@/lib/portal/request";
import { ensurePortalSchema } from "@/lib/portal/schema";
import { isValidEmail, normalizeEmail } from "@/lib/portal/validation";

export const runtime = "nodejs";

type LoginBody = {
  email?: string;
  senha?: string;
};

type PortalUserRow = {
  id: number;
  email: string;
  password_hash: string;
  is_active: boolean;
};

export async function POST(req: NextRequest) {
  try {
    await ensurePortalSchema();

    const ip = getClientIp(req);
    const limiter = consumeRateLimit(`portal-login:${ip}`, 10, 60_000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde e tente novamente." },
        { status: 429 },
      );
    }

    const body = (await req.json().catch(() => null)) as LoginBody | null;
    const email = normalizeEmail(body?.email);
    const senha = String(body?.senha ?? "");

    if (!email || !senha || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 400 },
      );
    }

    const rows = await db<PortalUserRow[]>`
      SELECT id, email, password_hash, is_active
      FROM public.portal_users
      WHERE email = ${email}
      LIMIT 1
    `;
    const user = rows[0];

    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(senha, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    const token = createPortalAuthToken(user.id, user.email);
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email },
    });
    setPortalAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao autenticar." },
      { status: 500 },
    );
  }
}
