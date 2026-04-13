import { NextRequest, NextResponse } from "next/server";
import { getPortalBrandingBySlug } from "@/lib/portal/branding";
import { isValidSlug } from "@/lib/portal/validation";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: NextRequest, context: Params) {
  const { slug: rawSlug } = await context.params;
  const slug = String(rawSlug ?? "")
    .trim()
    .toLowerCase();

  if (!slug || !isValidSlug(slug)) {
    return NextResponse.json({ error: "Slug invalido." }, { status: 400 });
  }

  const branding = await getPortalBrandingBySlug(slug);
  if (!branding) {
    return NextResponse.json({ error: "Branding nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, branding });
}

