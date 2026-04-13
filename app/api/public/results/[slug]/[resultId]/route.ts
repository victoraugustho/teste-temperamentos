import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensurePortalSchema } from "@/lib/portal/schema";
import { isValidSlug } from "@/lib/portal/validation";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ slug: string; resultId: string }>;
};

export async function GET(_req: NextRequest, context: Params) {
  try {
    await ensurePortalSchema();
    const { slug: rawSlug, resultId: rawResultId } = await context.params;

    const slug = String(rawSlug ?? "")
      .trim()
      .toLowerCase();
    const resultId = Number(rawResultId);

    if (!slug || !isValidSlug(slug)) {
      return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
    }

    if (!Number.isInteger(resultId) || resultId <= 0) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const result = await db`
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
      WHERE id = ${resultId}
        AND slug = ${slug}
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Resultado não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, result: result[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao buscar resultado." },
      { status: 500 },
    );
  }
}
