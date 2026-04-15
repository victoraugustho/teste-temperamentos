import { db } from "@/lib/db";
import { normalizePortalLogoPublicUrl } from "@/lib/portal/logo-upload";
import { ensurePortalSchema } from "@/lib/portal/schema";
import { isValidSlug } from "@/lib/portal/validation";

export type PortalBranding = {
  brandName: string;
  logoUrl: string | null;
  logoBackground: "dark" | "light";
  heroTitle: string;
  heroDescription: string;
};

type BrandingRow = {
  brand_name: string | null;
  logo_url: string | null;
  logo_background: string | null;
  hero_title: string | null;
  hero_description: string | null;
};

type BrandingBySlugRow = BrandingRow & {
  owner_name: string | null;
  owner_email: string;
};

const DEFAULT_BRAND_NAME = "Portal de Testes";
const DEFAULT_HERO_TITLE = "Teste de Temperamentos";
const DEFAULT_HERO_DESCRIPTION =
  "Responda com calma e sinceridade para gerar um resultado completo.";
const DEFAULT_LOGO_BACKGROUND: PortalBranding["logoBackground"] = "dark";

function normalizeOptionalText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function normalizeLogoUrl(value: unknown) {
  const url = String(value ?? "").trim();
  if (!url) return null;
  const normalized = normalizePortalLogoPublicUrl(url.slice(0, 500));
  return normalized ? normalized.slice(0, 500) : null;
}

export function isValidBrandingLogoUrl(value: string | null) {
  if (!value) return true;
  if (value.startsWith("/")) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function toBranding(row: BrandingRow | null | undefined, fallbackName: string): PortalBranding {
  const brandName = String(row?.brand_name ?? "").trim() || fallbackName || DEFAULT_BRAND_NAME;
  const logoBackground =
    row?.logo_background === "light" || row?.logo_background === "dark"
      ? row.logo_background
      : DEFAULT_LOGO_BACKGROUND;
  const heroTitle = String(row?.hero_title ?? "").trim() || DEFAULT_HERO_TITLE;
  const heroDescription =
    String(row?.hero_description ?? "").trim() || DEFAULT_HERO_DESCRIPTION;

  return {
    brandName,
    logoUrl: normalizeLogoUrl(row?.logo_url),
    logoBackground,
    heroTitle,
    heroDescription,
  };
}

export function sanitizeBrandingInput(
  payload: {
    brandName?: unknown;
    logoUrl?: unknown;
    logoBackground?: unknown;
    heroTitle?: unknown;
    heroDescription?: unknown;
  } | null,
  fallbackName: string,
) {
  const brandName =
    normalizeOptionalText(payload?.brandName, 120) || fallbackName || DEFAULT_BRAND_NAME;
  const logoUrl = normalizeLogoUrl(payload?.logoUrl);
  const logoBackground =
    payload?.logoBackground === "light" || payload?.logoBackground === "dark"
      ? payload.logoBackground
      : DEFAULT_LOGO_BACKGROUND;
  const heroTitle = normalizeOptionalText(payload?.heroTitle, 160);
  const heroDescription = normalizeOptionalText(payload?.heroDescription, 600);

  return {
    brandName,
    logoUrl,
    logoBackground,
    heroTitle,
    heroDescription,
  };
}

export async function getPortalBrandingByUserId(
  ownerUserId: number,
  fallbackName: string,
) {
  await ensurePortalSchema();

  const rows = await db<BrandingRow[]>`
    SELECT
      brand_name,
      logo_url,
      logo_background,
      hero_title,
      hero_description
    FROM public.portal_user_branding
    WHERE owner_user_id = ${ownerUserId}
    LIMIT 1
  `;

  return toBranding(rows[0], fallbackName);
}

export async function getPortalBrandingBySlug(slug: string) {
  const normalizedSlug = String(slug ?? "").trim().toLowerCase();
  if (!normalizedSlug || !isValidSlug(normalizedSlug)) {
    return null;
  }

  await ensurePortalSchema();

  const rows = await db<BrandingBySlugRow[]>`
    SELECT
      u.name AS owner_name,
      u.email AS owner_email,
      b.brand_name,
      b.logo_url,
      b.logo_background,
      b.hero_title,
      b.hero_description
    FROM public.portal_tests t
    INNER JOIN public.portal_users u
      ON u.id = t.owner_user_id
    LEFT JOIN public.portal_user_branding b
      ON b.owner_user_id = t.owner_user_id
    WHERE t.slug = ${normalizedSlug}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  const fallbackName =
    String(row.owner_name ?? "").trim() || String(row.owner_email ?? "").trim() || DEFAULT_BRAND_NAME;

  return toBranding(row, fallbackName);
}
