import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal/auth";
import { ensurePortalSchema } from "@/lib/portal/schema";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type UpdateBody = {
  titulo?: string | null;
  expiraEm?: string;
  maxUsos?: number;
  status?: "active" | "revoked";
};

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(_req: NextRequest, context: Params) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  await ensurePortalSchema();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const rows = await db`
    SELECT
      id,
      slug,
      title AS titulo,
      token_hint,
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
    WHERE id = ${id}
      AND owner_user_id = ${user.id}
    LIMIT 1
  `;
  const test = rows[0];

  if (!test) {
    return NextResponse.json({ error: "Teste nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, test });
}

export async function PATCH(req: NextRequest, context: Params) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  await ensurePortalSchema();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => null)) as UpdateBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
    }

    const currentRows = await db`
      SELECT id, title, expires_at, max_uses, used_count, status
      FROM public.portal_tests
      WHERE id = ${id}
        AND owner_user_id = ${user.id}
      LIMIT 1
    `;
    const current = currentRows[0] as
      | {
          id: number;
          title: string | null;
          expires_at: string;
          max_uses: number;
          used_count: number;
          status: "active" | "used" | "expired" | "revoked";
        }
      | undefined;

    if (!current) {
      return NextResponse.json({ error: "Teste nao encontrado." }, { status: 404 });
    }

    const nextTitulo =
      body.titulo !== undefined
        ? String(body.titulo ?? "")
            .trim()
            .slice(0, 120) || null
        : current.title;

    let nextExpiraEmIso = current.expires_at;
    if (body.expiraEm !== undefined) {
      const parsed = new Date(String(body.expiraEm).trim());
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Data de expiracao invalida." }, { status: 400 });
      }
      nextExpiraEmIso = parsed.toISOString();
    }

    let nextMaxUses = current.max_uses;
    if (body.maxUsos !== undefined) {
      const parsedMax = Number(body.maxUsos);
      if (!Number.isInteger(parsedMax) || parsedMax < 1 || parsedMax > 20) {
        return NextResponse.json(
          { error: "maxUsos deve ser inteiro entre 1 e 20." },
          { status: 400 },
        );
      }
      if (parsedMax < current.used_count) {
        return NextResponse.json(
          { error: "maxUsos nao pode ser menor que a quantidade ja usada." },
          { status: 400 },
        );
      }
      nextMaxUses = parsedMax;
    }

    let nextStatus = current.status;
    if (body.status !== undefined) {
      const status = String(body.status);
      if (status !== "active" && status !== "revoked") {
        return NextResponse.json({ error: "Status invalido." }, { status: 400 });
      }
      nextStatus = status;
    }

    const updatedRows = await db`
      UPDATE public.portal_tests
      SET
        title = ${nextTitulo},
        expires_at = ${nextExpiraEmIso},
        max_uses = ${nextMaxUses},
        status = ${nextStatus},
        updated_at = NOW()
      WHERE id = ${id}
        AND owner_user_id = ${user.id}
      RETURNING
        id,
        slug,
        title AS titulo,
        token_hint,
        expires_at,
        max_uses,
        used_count,
        used_at,
        created_at,
        CASE
          WHEN status = 'active' AND expires_at < NOW() THEN 'expired'
          ELSE status
        END AS status
    `;

    return NextResponse.json({ ok: true, test: updatedRows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar teste." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: Params) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  await ensurePortalSchema();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const deleted = await db`
    DELETE FROM public.portal_tests
    WHERE id = ${id}
      AND owner_user_id = ${user.id}
    RETURNING id
  `;

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Teste nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
