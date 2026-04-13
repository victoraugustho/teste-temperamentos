import { notFound } from "next/navigation";
import TesteDeTemperamentoPage from "@/components/temperamentos/TesteDeTemperamentoPage";
import { getPortalBrandingBySlug } from "@/lib/portal/branding";
import { isValidSlug } from "@/lib/portal/validation";

type Params = {
  params: Promise<{ slug: string }>;
};

export default async function QuestionarioPage({ params }: Params) {
  const { slug: rawSlug } = await params;
  const slug = String(rawSlug ?? "")
    .trim()
    .toLowerCase();

  if (!slug || !isValidSlug(slug)) {
    notFound();
  }

  const branding = await getPortalBrandingBySlug(slug);

  return (
    <TesteDeTemperamentoPage
      gatePath={`/teste/${slug}`}
      resultPath={`/resultado/${slug}`}
      submitEndpoint="/api/public/tests/submit"
      submitOnlyScores
      clientCookieName="temperamentos_cliente"
      scoresCookieName=""
      branding={branding}
    />
  );
}
