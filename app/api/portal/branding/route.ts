import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal/auth";
import {
  getPortalBrandingByUserId,
  isValidBrandingLogoUrl,
  sanitizeBrandingInput,
} from "@/lib/portal/branding";
import { ensurePortalSchema } from "@/lib/portal/schema";

export const runtime = "nodejs";

type UpdateBrandingBody = {
  brandName?: string;
  logoUrl?: string;
  logoBackground?: "dark" | "light";
  heroTitle?: string;
  heroDescription?: string;
};

export async function GET() {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const fallbackName = String(user.name ?? "").trim() || user.email;
  const branding = await getPortalBrandingByUserId(user.id, fallbackName);
  return NextResponse.json({ ok: true, branding });
}

export async function PATCH(req: NextRequest) {
  const user = await requirePortalUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    await ensurePortalSchema();
    const body = (await req.json().catch(() => null)) as UpdateBrandingBody | null;

    const fallbackName = String(user.name ?? "").trim() || user.email;
    const next = sanitizeBrandingInput(body, fallbackName);

    if (!isValidBrandingLogoUrl(next.logoUrl)) {
      return NextResponse.json(
        { error: "URL da logo invalida. Use /arquivo ou http(s)." },
        { status: 400 },
      );
    }

    await db`
      INSERT INTO public.portal_user_branding (
        owner_user_id,
        brand_name,
        logo_url,
        logo_background,
        hero_title,
        hero_description,
        updated_at
      )
      VALUES (
        ${user.id},
        ${next.brandName},
        ${next.logoUrl},
        ${next.logoBackground},
        ${next.heroTitle},
        ${next.heroDescription},
        NOW()
      )
      ON CONFLICT (owner_user_id)
      DO UPDATE SET
        brand_name = EXCLUDED.brand_name,
        logo_url = EXCLUDED.logo_url,
        logo_background = EXCLUDED.logo_background,
        hero_title = EXCLUDED.hero_title,
        hero_description = EXCLUDED.hero_description,
        updated_at = NOW()
    `;

    const branding = await getPortalBrandingByUserId(user.id, fallbackName);
    return NextResponse.json({ ok: true, branding });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao salvar personalizacao." }, { status: 500 });
  }
}
