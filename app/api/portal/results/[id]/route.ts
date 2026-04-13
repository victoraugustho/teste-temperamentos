import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal/auth";
import { ensurePortalSchema } from "@/lib/portal/schema";
import {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/portal/validation";
import { parseScores, toPercentages } from "@/lib/temperamentos-scores";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type UpdateBody = {
  nome?: string;
  email?: string | null;
  phone?: string | null;
  telefone?: string | null;
  scores?: unknown;
};

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(_req: NextRequest, context: Params) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  await ensurePortalSchema();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const rows = await db`
    SELECT
      id,
      slug,
      nome,
      email,
      phone,
      melancolico,
      sanguineo,
      fleumatico,
      colerico,
      created_at
    FROM public.portal_results
    WHERE id = ${id}
      AND owner_user_id = ${user.id}
    LIMIT 1
  `;

  const result = rows[0];
  if (!result) {
    return NextResponse.json({ error: "Resultado não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, result });
}

export async function PATCH(req: NextRequest, context: Params) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  await ensurePortalSchema();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => null)) as UpdateBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const currentRows = await db`
      SELECT
        id,
        slug,
        nome,
        email,
        phone,
        melancolico,
        sanguineo,
        fleumatico,
        colerico
      FROM public.portal_results
      WHERE id = ${id}
        AND owner_user_id = ${user.id}
      LIMIT 1
    `;
    const current = currentRows[0] as
      | {
          id: number;
          slug: string;
          nome: string;
          email: string | null;
          phone: string | null;
          melancolico: number;
          sanguineo: number;
          fleumatico: number;
          colerico: number;
        }
      | undefined;

    if (!current) {
      return NextResponse.json({ error: "Resultado não encontrado." }, { status: 404 });
    }

    const nextNome =
      body.nome !== undefined ? normalizeName(body.nome) : current.nome;

    if (!nextNome) {
      return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
    }

    const inputPhone = body.phone ?? body.telefone;
    const nextEmail =
      body.email !== undefined ? normalizeEmail(body.email) : current.email;
    const nextPhone =
      inputPhone !== undefined ? normalizePhone(inputPhone) : current.phone;

    if (!nextEmail && !nextPhone) {
      return NextResponse.json(
        { error: "Informe e-mail ou telefone." },
        { status: 400 },
      );
    }

    if (nextEmail && !isValidEmail(nextEmail)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    if (nextPhone && !isValidPhone(nextPhone)) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    const nextScoresRaw = body.scores ?? null;
    const parsedScores = nextScoresRaw ? parseScores(nextScoresRaw) : null;
    if (nextScoresRaw && !parsedScores) {
      return NextResponse.json({ error: "Scores inválidos." }, { status: 400 });
    }

    const nextPercentages = parsedScores
      ? toPercentages(parsedScores)
      : {
          melancolico: Number(current.melancolico),
          sanguineo: Number(current.sanguineo),
          fleumatico: Number(current.fleumatico),
          colerico: Number(current.colerico),
        };

    const updatedRows = await db`
      UPDATE public.portal_results
      SET
        nome = ${nextNome},
        email = ${nextEmail},
        phone = ${nextPhone},
        normalized_email = ${nextEmail},
        normalized_phone = ${nextPhone},
        melancolico = ${nextPercentages.melancolico},
        sanguineo = ${nextPercentages.sanguineo},
        fleumatico = ${nextPercentages.fleumatico},
        colerico = ${nextPercentages.colerico}
      WHERE id = ${id}
        AND owner_user_id = ${user.id}
      RETURNING
        id,
        slug,
        nome,
        email,
        phone,
        melancolico,
        sanguineo,
        fleumatico,
        colerico,
        created_at
    `;

    return NextResponse.json({ ok: true, result: updatedRows[0] });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "Já existe resultado para este e-mail/telefone neste slug." },
        { status: 409 },
      );
    }

    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar resultado." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: Params) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  await ensurePortalSchema();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const deleted = await db`
    DELETE FROM public.portal_results
    WHERE id = ${id}
      AND owner_user_id = ${user.id}
    RETURNING id
  `;

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Resultado não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
