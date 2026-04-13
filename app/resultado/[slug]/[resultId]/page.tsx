"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import TemperamentResultComponent from "@/components/temperamentos/TemperamentResultComponent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type ApiResult = {
  id: number;
  slug: string;
  nome: string;
  email: string | null;
  phone: string | null;
  melancolico: number | string;
  sanguineo: number | string;
  fleumatico: number | string;
  colerico: number | string;
  created_at: string;
};

type PublicBranding = {
  brandName: string;
  logoUrl: string | null;
  logoBackground: "dark" | "light";
  heroTitle: string;
  heroDescription: string;
};

type Scores = {
  melancolico: number;
  sanguineo: number;
  fleumatico: number;
  colerico: number;
};

export default function PublicResultPage() {
  const params = useParams<{ slug: string; resultId: string }>();
  const slug = params?.slug ?? "";
  const resultId = params?.resultId ?? "";

  const [result, setResult] = useState<ApiResult | null>(null);
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [resultRes, brandingRes] = await Promise.all([
          fetch(`/api/public/results/${slug}/${resultId}`, {
            cache: "no-store",
          }),
          fetch(`/api/public/tests/branding/${slug}`, {
            cache: "no-store",
          }),
        ]);

        const resultData = await resultRes.json().catch(() => ({}));
        if (!resultRes.ok) {
          setError(resultData?.error ?? "Resultado não encontrado.");
          return;
        }

        const brandingData = await brandingRes.json().catch(() => ({}));
        if (brandingRes.ok && brandingData?.branding) {
          setBranding(brandingData.branding as PublicBranding);
        } else {
          setBranding(null);
        }

        setResult(resultData.result as ApiResult);
      } catch {
        setError("Erro de conexão.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [slug, resultId]);

  const scores: Scores | null = useMemo(() => {
    if (!result) return null;
    return {
      melancolico: Number(result.melancolico),
      sanguineo: Number(result.sanguineo),
      fleumatico: Number(result.fleumatico),
      colerico: Number(result.colerico),
    };
  }, [result]);

  const dataRealizacao = useMemo(() => {
    if (!result?.created_at) return new Date().toLocaleDateString("pt-BR");
    return new Date(result.created_at).toLocaleDateString("pt-BR");
  }, [result]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        Carregando...
      </div>
    );
  }

  if (!result || !scores) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg bg-white/5 border-white/10">
          <CardContent className="p-6 space-y-4">
            <p>{error ?? "Resultado não encontrado."}</p>
            <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-600">
              <Link href={`/teste/${slug}`}>Voltar ao início do teste</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pt-10 max-w-6xl mx-auto px-4">
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="p-4 space-y-4">
            {branding?.logoUrl && (
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-cyan-400/35 blur-2xl" />
                  <img
                    src={branding.logoUrl}
                    alt={branding.brandName}
                    className={`relative h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-contain border-2 border-cyan-300/70 p-2 shadow-[0_0_35px_rgba(34,211,238,0.35)] ${
                      branding.logoBackground === "light" ? "bg-white" : "bg-slate-900/85"
                    }`}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm text-slate-300">
                  Resultado para <b className="text-white">{result.nome}</b>
                </div>
                {branding?.brandName && (
                  <div className="text-sm text-cyan-300 truncate">{branding.brandName}</div>
                )}
                {branding?.heroDescription && (
                  <div className="text-xs text-slate-400 truncate">{branding.heroDescription}</div>
                )}
              </div>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <Link href={`/teste/${slug}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Novo acesso
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <TemperamentResultComponent
        scores={scores}
        clienteNome={result.nome}
        dataRealizacao={dataRealizacao}
        branding={branding}
      />
    </div>
  );
}

