import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createPortalPublicAccessToken,
  requirePortalUser,
} from "@/lib/portal/auth";
import {
  decryptTokenFromStorage,
  encryptTokenForStorage,
  generatePortalToken,
  hashToken,
} from "@/lib/portal/crypto";
import { ensurePortalSchema } from "@/lib/portal/schema";

export const runtime = "nodejs";

type CreateTestBody = {
  titulo?: string;
  expiraEm?: string;
  maxUsos?: number;
};

type CreatedTestRow = {
  id: number;
  slug: string;
  titulo: string | null;
  token_hint?: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  status: string;
  created_at: string;
};

type ListTestRow = {
  id: number;
  slug: string;
  titulo: string | null;
  token_hint: string;
  token_ciphertext: string | null;
  expires_at: string;
  max_uses: number;
  used_count: number;
  used_at: string | null;
  created_at: string;
  status: "active" | "used" | "expired" | "revoked";
};

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function slugifyFromTitle(title: string) {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "teste";
}

function chooseAvailableSlug(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}

async function generateUniqueSlug(base: string) {
  const rows = await db<{ slug: string }[]>`
    SELECT slug
    FROM public.portal_tests
    WHERE slug = ${base}
       OR slug LIKE ${`${base}-%`}
    LIMIT 2000
  `;

  const taken = new Set(rows.map((row) => String(row.slug)));
  return chooseAvailableSlug(base, taken);
}

export async function GET(req: NextRequest) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  await ensurePortalSchema();

  const page = toPositiveInt(req.nextUrl.searchParams.get("page"), 1);
  const pageSize = Math.min(
    50,
    toPositiveInt(req.nextUrl.searchParams.get("pageSize"), 8),
  );
  const q = String(req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const likeQ = `%${q}%`;

  const searchFilter = q
    ? db`AND (LOWER(slug) LIKE ${likeQ} OR LOWER(COALESCE(title, '')) LIKE ${likeQ})`
    : db``;

  const totalRows = await db<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM public.portal_tests
    WHERE owner_user_id = ${user.id}
    ${searchFilter}
  `;
  const total = totalRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const safeOffset = (safePage - 1) * pageSize;

  const tests = await db<ListTestRow[]>`
    SELECT
      id,
      slug,
      title AS titulo,
      token_hint,
      token_ciphertext,
      expires_at,
      max_uses,
      used_count,
      used_at,
      created_at,
      CASE
        WHEN status = 'active' AND expires_at < NOW() THEN 'expired'
        ELSE status
      END AS status
    FROM public.portal_tests
    WHERE owner_user_id = ${user.id}
    ${searchFilter}
    ORDER BY created_at DESC
    LIMIT ${pageSize}
    OFFSET ${safeOffset}
  `;

  const testsWithShareUrl = tests.map((test) => {
    const { token_ciphertext, ...safeTest } = test;
    const fullToken = decryptTokenFromStorage(token_ciphertext);
    const expiresAtMs = new Date(test.expires_at).getTime();
    const ttlSeconds = Math.floor((expiresAtMs - Date.now()) / 1000);
    const canGenerateJwtLink =
      Number.isFinite(expiresAtMs) &&
      ttlSeconds > 0 &&
      test.status !== "revoked";

    const accessToken = canGenerateJwtLink
      ? createPortalPublicAccessToken(
          {
            ownerUserId: user.id,
            testId: test.id,
            slug: test.slug,
            token: fullToken,
          },
          ttlSeconds,
        )
      : null;

    return {
      ...safeTest,
      token: fullToken,
      share_url: accessToken
        ? `/teste/${test.slug}?access=${encodeURIComponent(accessToken)}`
        : `/teste/${test.slug}`,
    };
  });

  return NextResponse.json({
    ok: true,
    tests: testsWithShareUrl,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    await ensurePortalSchema();

    const body = (await req.json().catch(() => null)) as CreateTestBody | null;
    const titulo = String(body?.titulo ?? "").trim().slice(0, 120);
    const maxUsos = Number(body?.maxUsos ?? 1);
    const expiraEmRaw = String(body?.expiraEm ?? "").trim();

    if (!titulo) {
      return NextResponse.json(
        { error: "Titulo obrigatorio para gerar slug." },
        { status: 400 },
      );
    }

    if (!expiraEmRaw) {
      return NextResponse.json(
        { error: "Informe a data/hora de expiracao." },
        { status: 400 },
      );
    }

    const expiraEm = new Date(expiraEmRaw);
    if (Number.isNaN(expiraEm.getTime()) || expiraEm.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "A expiracao precisa estar no futuro." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(maxUsos) || maxUsos < 1 || maxUsos > 20) {
      return NextResponse.json(
        { error: "maxUsos deve ser um inteiro entre 1 e 20." },
        { status: 400 },
      );
    }

    const token = generatePortalToken();
    const tokenHash = hashToken(token);
    const tokenHint = `${token.slice(0, 4)}...${token.slice(-4)}`;
    const tokenCiphertext = encryptTokenForStorage(token);
    const slugBase = slugifyFromTitle(titulo);

    let createdTest: CreatedTestRow | null = null;
    let usedSlug = "";

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidateSlug =
        attempt === 0 ? await generateUniqueSlug(slugBase) : `${slugBase}-${Date.now().toString().slice(-6)}-${attempt}`;

      try {
        const created = await db<CreatedTestRow[]>`
          INSERT INTO public.portal_tests (
            owner_user_id,
            slug,
            title,
            token_hash,
            token_hint,
            token_ciphertext,
            expires_at,
            max_uses,
            status
          )
          VALUES (
            ${user.id},
            ${candidateSlug},
            ${titulo},
            ${tokenHash},
            ${tokenHint},
            ${tokenCiphertext},
            ${expiraEm.toISOString()},
            ${maxUsos},
            'active'
          )
          RETURNING
            id,
            slug,
            title AS titulo,
            token_hint,
            expires_at,
            max_uses,
            used_count,
            status,
            created_at
        `;

        createdTest = created[0] ?? null;
        usedSlug = candidateSlug;
        break;
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "23505"
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!createdTest || !usedSlug) {
      return NextResponse.json(
        { error: "Nao foi possivel gerar slug unico. Tente novamente." },
        { status: 409 },
      );
    }

    const ttlSeconds = Math.floor(
      (new Date(expiraEm.toISOString()).getTime() - Date.now()) / 1000,
    );
    const accessToken = createPortalPublicAccessToken(
      {
        ownerUserId: user.id,
        testId: createdTest.id,
        slug: usedSlug,
        token,
      },
      ttlSeconds,
    );

    return NextResponse.json({
      ok: true,
      test: createdTest,
      token,
      accessToken,
      url: `/teste/${usedSlug}?access=${encodeURIComponent(accessToken)}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar teste." }, { status: 500 });
  }
}
