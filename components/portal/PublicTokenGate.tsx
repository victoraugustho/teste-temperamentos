"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function onlyDigits(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

function isValidEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  if (!value) return true;
  return /^\d{8,15}$/.test(value);
}

function setCookie(name: string, value: string, days = 1) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

type Props = {
  slug: string;
  accessToken?: string | null;
  branding?: {
    brandName: string;
    logoUrl: string | null;
    logoBackground: "dark" | "light";
    heroTitle: string;
    heroDescription: string;
  } | null;
};

export default function PublicTokenGate({
  slug,
  accessToken = null,
  branding = null,
}: Props) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const brandName = String(branding?.brandName ?? "").trim() || "Portal de Testes";
  const heroTitle = String(branding?.heroTitle ?? "").trim() || "Acesso ao Teste";
  const heroDescription =
    String(branding?.heroDescription ?? "").trim() ||
    "Preencha seus dados para iniciar o teste.";
  const logoUrl = String(branding?.logoUrl ?? "").trim() || null;
  const logoBackground = branding?.logoBackground === "light" ? "light" : "dark";

  const maskedPhone = useMemo(() => {
    const d = onlyDigits(telefone);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return d;
  }, [telefone]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanName = nome.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = onlyDigits(telefone);
    const cleanToken = token.trim().toUpperCase();
    const cleanAccess = String(accessToken ?? "").trim();

    if (!cleanName) {
      setError("Informe o nome.");
      setIsSubmitting(false);
      return;
    }

    if (!cleanEmail && !cleanPhone) {
      setError("Informe e-mail ou telefone.");
      setIsSubmitting(false);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("E-mail inválido.");
      setIsSubmitting(false);
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      setError("Telefone inválido.");
      setIsSubmitting(false);
      return;
    }

    if (!cleanAccess && !cleanToken) {
      setError("Link inválido. Token ausente.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/public/tests/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          accessToken: cleanAccess || null,
          token: cleanToken || null,
          nome: cleanName,
          email: cleanEmail || null,
          telefone: cleanPhone || null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível validar o acesso.");
        return;
      }

      setCookie(
        "temperamentos_cliente",
        JSON.stringify({
          nome: cleanName,
          email: cleanEmail || null,
          telefone: cleanPhone || "",
          createdAt: Date.now(),
        }),
        2,
      );

      if (data?.alreadyCompleted && typeof data?.redirectUrl === "string") {
        router.push(data.redirectUrl);
        return;
      }

      router.push(`/teste/${slug}/questionario`);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex items-center justify-center">
      <Card className="w-full max-w-xl bg-white/5 border-white/10">
        <CardHeader>
          {logoUrl && (
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-cyan-400/35 blur-2xl" />
                <img
                  src={logoUrl}
                  alt={brandName}
                  className={`relative h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-contain border-2 border-cyan-300/70 p-2 shadow-[0_0_35px_rgba(34,211,238,0.35)] ${
                    logoBackground === "light" ? "bg-white" : "bg-slate-900/85"
                  }`}
                />
              </div>
            </div>
          )}
          <div className="space-y-1 text-center">
            <CardTitle className="text-2xl">{heroTitle}</CardTitle>
            <p className="text-sm text-cyan-300">{brandName}</p>
          </div>
          <p className="text-sm text-slate-300">{heroDescription}</p>
          <p className="text-sm text-slate-300">
            Slug: <b>{slug}</b>
          </p>
          <p className="text-xs text-slate-400">
            {accessToken
              ? "Link seguro validado automaticamente. Informe seus dados para continuar."
              : "Informe seus dados e token para continuar."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-slate-900/60 border-white/10"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900/60 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={maskedPhone}
                  onChange={(e) => setTelefone(onlyDigits(e.target.value))}
                  className="bg-slate-900/60 border-white/10"
                />
              </div>
            </div>

            {!accessToken && (
              <div className="space-y-2">
                <Label>Token *</Label>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  className="bg-slate-900/60 border-white/10"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {isSubmitting ? "Validando..." : "Iniciar teste"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
