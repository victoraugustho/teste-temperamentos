import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal/auth";
import { ensurePortalSchema } from "@/lib/portal/schema";
import { isValidSlug } from "@/lib/portal/validation";

export const runtime = "nodejs";

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export async function GET(req: NextRequest) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  await ensurePortalSchema();

  const page = toPositiveInt(req.nextUrl.searchParams.get("page"), 1);
  const pageSize = Math.min(
    50,
    toPositiveInt(req.nextUrl.searchParams.get("pageSize"), 8),
  );
  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase() ?? "";
  const q = String(req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();

  if (slug && !isValidSlug(slug)) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
  }

  const likeQ = `%${q}%`;

  const slugFilter = slug ? db`AND r.slug = ${slug}` : db``;
  const searchFilter = q
    ? db`AND (
        LOWER(r.nome) LIKE ${likeQ}
        OR LOWER(COALESCE(r.email, '')) LIKE ${likeQ}
        OR LOWER(COALESCE(r.phone, '')) LIKE ${likeQ}
        OR LOWER(r.slug) LIKE ${likeQ}
      )`
    : db``;

  const totalRows = await db<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM public.portal_results r
    WHERE r.owner_user_id = ${user.id}
    ${slugFilter}
    ${searchFilter}
  `;
  const total = totalRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const results = await db`
    SELECT
      r.id,
      r.slug,
      r.nome,
      r.email,
      r.phone,
      r.melancolico,
      r.sanguineo,
      r.fleumatico,
      r.colerico,
      r.created_at
    FROM public.portal_results r
    WHERE r.owner_user_id = ${user.id}
    ${slugFilter}
    ${searchFilter}
    ORDER BY r.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  return NextResponse.json({
    ok: true,
    results,
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
