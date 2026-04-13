import { notFound } from "next/navigation";
import PublicTokenGate from "@/components/portal/PublicTokenGate";
import { getPortalBrandingBySlug } from "@/lib/portal/branding";
import { isValidSlug } from "@/lib/portal/validation";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ access?: string }>;
};

export default async function PublicTestGatePage({
  params,
  searchParams,
}: Params) {
  const { slug: rawSlug } = await params;
  const sp = await searchParams;

  const slug = String(rawSlug ?? "")
    .trim()
    .toLowerCase();
  const accessToken = String(sp?.access ?? "").trim();

  if (!slug || !isValidSlug(slug)) {
    notFound();
  }

  const branding = await getPortalBrandingBySlug(slug);
  return (
    <PublicTokenGate
      slug={slug}
      accessToken={accessToken || null}
      branding={branding}
    />
  );
}
