import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clearPortalAttemptCookie,
  readPortalAttemptToken,
} from "@/lib/portal/auth";
import { PORTAL_TEST_ATTEMPT_COOKIE } from "@/lib/portal/constants";
import { ensurePortalSchema } from "@/lib/portal/schema";
import { parseScores, toPercentages } from "@/lib/temperamentos-scores";

export const runtime = "nodejs";

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type SubmitBody = {
  scores?: unknown;
};

type LockedTestRow = {
  id: number;
  owner_user_id: number;
  slug: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  status: "active" | "used" | "expired" | "revoked";
};

export async function POST(req: NextRequest) {
  try {
    await ensurePortalSchema();

    const cookieStore = await cookies();
    const rawAttemptToken = cookieStore.get(PORTAL_TEST_ATTEMPT_COOKIE)?.value;
    if (!rawAttemptToken) {
      return NextResponse.json({ error: "Sessão do teste inválida." }, { status: 401 });
    }

    const attempt = readPortalAttemptToken(rawAttemptToken);
    if (!attempt) {
      return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as SubmitBody | null;
    const scores = parseScores(body?.scores);
    if (!scores) {
      return NextResponse.json({ error: "Scores inválidos." }, { status: 400 });
    }

    const perc = toPercentages(scores);

    const saved = await db.begin(async (tx) => {
      const sql = tx as unknown as typeof db;

      const tests = (await sql`
        SELECT
          id,
          owner_user_id,
          slug,
          expires_at,
          max_uses,
          used_count,
          status
        FROM public.portal_tests
        WHERE id = ${attempt.testId}
          AND owner_user_id = ${attempt.ownerUserId}
          AND slug = ${attempt.slug}
        FOR UPDATE
      `) as LockedTestRow[];
      const test = tests[0];

      if (!test) {
        throw new HttpError(404, "Teste não encontrado.");
      }

      if (test.status === "revoked") {
        throw new HttpError(403, "Este teste foi revogado.");
      }

      const expiresAt = new Date(test.expires_at).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        await sql`
          UPDATE public.portal_tests
          SET status = 'expired', updated_at = NOW()
          WHERE id = ${test.id}
        `;
        throw new HttpError(400, "Token expirado.");
      }

      if (test.used_count >= test.max_uses || test.status === "used") {
        throw new HttpError(409, "Este link já foi utilizado.");
      }

      let duplicates: { id: number }[] = [];
      if (attempt.email && attempt.phone) {
        duplicates = await sql`
          SELECT id
          FROM public.portal_results
          WHERE owner_user_id = ${attempt.ownerUserId}
            AND slug = ${attempt.slug}
            AND (
              normalized_email = ${attempt.email}
              OR normalized_phone = ${attempt.phone}
            )
          LIMIT 1
        `;
      } else if (attempt.email) {
        duplicates = await sql`
          SELECT id
          FROM public.portal_results
          WHERE owner_user_id = ${attempt.ownerUserId}
            AND slug = ${attempt.slug}
            AND normalized_email = ${attempt.email}
          LIMIT 1
        `;
      } else if (attempt.phone) {
        duplicates = await sql`
          SELECT id
          FROM public.portal_results
          WHERE owner_user_id = ${attempt.ownerUserId}
            AND slug = ${attempt.slug}
            AND normalized_phone = ${attempt.phone}
          LIMIT 1
        `;
      }

      if (duplicates.length > 0) {
        throw new HttpError(409, "Este e-mail/telefone já respondeu o teste.");
      }

      let matchedClients: { id: number }[] = [];
      if (attempt.email && attempt.phone) {
        matchedClients = await sql`
          SELECT id
          FROM public.portal_clients
          WHERE owner_user_id = ${attempt.ownerUserId}
            AND (
              normalized_email = ${attempt.email}
              OR normalized_phone = ${attempt.phone}
            )
          ORDER BY id ASC
          LIMIT 1
        `;
      } else if (attempt.email) {
        matchedClients = await sql`
          SELECT id
          FROM public.portal_clients
          WHERE owner_user_id = ${attempt.ownerUserId}
            AND normalized_email = ${attempt.email}
          ORDER BY id ASC
          LIMIT 1
        `;
      } else if (attempt.phone) {
        matchedClients = await sql`
          SELECT id
          FROM public.portal_clients
          WHERE owner_user_id = ${attempt.ownerUserId}
            AND normalized_phone = ${attempt.phone}
          ORDER BY id ASC
          LIMIT 1
        `;
      }

      let clientId: number | null = null;
      if (matchedClients[0]) {
        clientId = matchedClients[0].id;
        await sql`
          UPDATE public.portal_clients
          SET
            nome = ${attempt.nome},
            email = ${attempt.email},
            phone = ${attempt.phone},
            normalized_email = ${attempt.email},
            normalized_phone = ${attempt.phone},
            updated_at = NOW()
          WHERE id = ${clientId}
        `;
      } else {
        const createdClients = (await sql`
          INSERT INTO public.portal_clients (
            owner_user_id,
            nome,
            email,
            phone,
            normalized_email,
            normalized_phone
          )
          VALUES (
            ${attempt.ownerUserId},
            ${attempt.nome},
            ${attempt.email},
            ${attempt.phone},
            ${attempt.email},
            ${attempt.phone}
          )
          RETURNING id
        `) as { id: number }[];
        clientId = createdClients[0].id;
      }

      const insertedResults = (await sql`
        INSERT INTO public.portal_results (
          owner_user_id,
          client_id,
          test_id,
          slug,
          nome,
          email,
          phone,
          normalized_email,
          normalized_phone,
          melancolico,
          sanguineo,
          fleumatico,
          colerico
        )
        VALUES (
          ${attempt.ownerUserId},
          ${clientId},
          ${attempt.testId},
          ${attempt.slug},
          ${attempt.nome},
          ${attempt.email},
          ${attempt.phone},
          ${attempt.email},
          ${attempt.phone},
          ${perc.melancolico},
          ${perc.sanguineo},
          ${perc.fleumatico},
          ${perc.colerico}
        )
        RETURNING id, slug
      `) as { id: number; slug: string }[];
      const inserted = insertedResults[0];

      await sql`
        UPDATE public.portal_tests
        SET
          used_count = used_count + 1,
          used_email = COALESCE(${attempt.email}, used_email),
          used_phone = COALESCE(${attempt.phone}, used_phone),
          used_at = NOW(),
          status = CASE
            WHEN used_count + 1 >= max_uses THEN 'used'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = ${attempt.testId}
      `;

      return inserted;
    });

    const response = NextResponse.json({
      ok: true,
      resultId: saved.id,
      slug: saved.slug,
      redirectUrl: `/resultado/${saved.slug}/${saved.id}`,
    });
    clearPortalAttemptCookie(response);
    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Erro ao salvar resultado do teste." },
      { status: 500 },
    );
  }
}
