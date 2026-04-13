import { NextRequest, NextResponse } from "next/server";
import {
  createPortalAttemptToken,
  readPortalPublicAccessToken,
  setPortalAttemptCookie,
} from "@/lib/portal/auth";
import { hashToken } from "@/lib/portal/crypto";
import { consumeRateLimit } from "@/lib/portal/rate-limit";
import { getClientIp } from "@/lib/portal/request";
import { ensurePortalSchema } from "@/lib/portal/schema";
import {
  isValidEmail,
  isValidPhone,
  isValidSlug,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/portal/validation";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type AuthorizeBody = {
  slug?: string;
  token?: string;
  accessToken?: string;
  nome?: string;
  email?: string;
  telefone?: string;
};

type PortalTestRow = {
  id: number;
  owner_user_id: number;
  slug: string;
  token_hash: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  status: "active" | "used" | "expired" | "revoked";
};

type ExistingResultRow = {
  id: number;
  slug: string;
};

export async function POST(req: NextRequest) {
  try {
    await ensurePortalSchema();

    const ip = getClientIp(req);
    const limiter = consumeRateLimit(`portal-authorize:${ip}`, 20, 60_000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde e tente novamente." },
        { status: 429 },
      );
    }

    const body = (await req.json().catch(() => null)) as AuthorizeBody | null;
    const slug = String(body?.slug ?? "")
      .trim()
      .toLowerCase();
    const nome = normalizeName(body?.nome).slice(0, 120);
    const email = normalizeEmail(body?.email);
    const phone = normalizePhone(body?.telefone);

    const rawAccessToken = String(body?.accessToken ?? "").trim();
    const rawManualToken = String(body?.token ?? "").trim().toUpperCase();

    if (!slug || !isValidSlug(slug)) {
      return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
    }

    if (!nome) {
      return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Informe e-mail ou telefone." },
        { status: 400 },
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    let accessPayload: ReturnType<typeof readPortalPublicAccessToken> = null;
    let hasValidAccessLink = false;

    if (rawAccessToken) {
      accessPayload = readPortalPublicAccessToken(rawAccessToken);
      if (!accessPayload) {
        return NextResponse.json({ error: "Link de acesso inválido." }, { status: 401 });
      }
      if (accessPayload.slug !== slug) {
        return NextResponse.json(
          { error: "Link inválido para este slug." },
          { status: 401 },
        );
      }

      hasValidAccessLink = true;
    }

    if (!hasValidAccessLink && !rawManualToken) {
      return NextResponse.json(
        { error: "Token obrigatório no link ou formulário." },
        { status: 400 },
      );
    }

    const tests = await db<PortalTestRow[]>`
      SELECT
        id,
        owner_user_id,
        slug,
        token_hash,
        expires_at,
        max_uses,
        used_count,
        status
      FROM public.portal_tests
      WHERE slug = ${slug}
      LIMIT 1
    `;
    const test = tests[0];

    if (!test) {
      return NextResponse.json(
        { error: "Teste não encontrado para o slug informado." },
        { status: 404 },
      );
    }

    if (accessPayload) {
      if (
        accessPayload.testId !== test.id ||
        accessPayload.ownerUserId !== test.owner_user_id
      ) {
        return NextResponse.json({ error: "Link de acesso inválido." }, { status: 401 });
      }
    }

    if (!hasValidAccessLink) {
      const matches = hashToken(rawManualToken) === test.token_hash;
      if (!matches) {
        return NextResponse.json({ error: "Token inválido." }, { status: 401 });
      }
    }

    let existingResults: ExistingResultRow[] = [];
    if (email && phone) {
      existingResults = await db<ExistingResultRow[]>`
        SELECT id, slug
        FROM public.portal_results
        WHERE owner_user_id = ${test.owner_user_id}
          AND slug = ${slug}
          AND (
            normalized_email = ${email}
            OR normalized_phone = ${phone}
          )
        ORDER BY created_at DESC
        LIMIT 1
      `;
    } else if (email) {
      existingResults = await db<ExistingResultRow[]>`
        SELECT id, slug
        FROM public.portal_results
        WHERE owner_user_id = ${test.owner_user_id}
          AND slug = ${slug}
          AND normalized_email = ${email}
        ORDER BY created_at DESC
        LIMIT 1
      `;
    } else if (phone) {
      existingResults = await db<ExistingResultRow[]>`
        SELECT id, slug
        FROM public.portal_results
        WHERE owner_user_id = ${test.owner_user_id}
          AND slug = ${slug}
          AND normalized_phone = ${phone}
        ORDER BY created_at DESC
        LIMIT 1
      `;
    }

    if (existingResults.length > 0) {
      const existing = existingResults[0];
      return NextResponse.json({
        ok: true,
        alreadyCompleted: true,
        redirectUrl: `/resultado/${existing.slug}/${existing.id}`,
      });
    }

    if (test.status === "revoked") {
      return NextResponse.json(
        { error: "Este teste não está mais disponível." },
        { status: 400 },
      );
    }

    const expiresAt = new Date(test.expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return NextResponse.json({ error: "Token expirado." }, { status: 400 });
    }

    if (test.status === "used" || test.used_count >= test.max_uses) {
      return NextResponse.json(
        { error: "Este link já foi utilizado." },
        { status: 400 },
      );
    }

    const attemptToken = createPortalAttemptToken({
      ownerUserId: test.owner_user_id,
      testId: test.id,
      slug,
      nome,
      email,
      phone,
    });

    const response = NextResponse.json({ ok: true });
    setPortalAttemptCookie(response, attemptToken);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao validar token." },
      { status: 500 },
    );
  }
}
