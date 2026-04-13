"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PortalUser = {
  id: number;
  email: string;
  nome: string | null;
};

type PortalTest = {
  id: number;
  slug: string;
  titulo: string | null;
  token_hint: string;
  token?: string | null;
  share_url: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  status: "active" | "used" | "expired" | "revoked";
  created_at: string;
};

type PortalResult = {
  id: number;
  slug: string;
  nome: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

type TestEditState = {
  id: number;
  titulo: string;
  expiraEm: string;
  maxUsos: string;
  status: "active" | "revoked";
};

type ResultEditState = {
  id: number;
  nome: string;
  email: string;
  phone: string;
};

type PortalBrandingForm = {
  brandName: string;
  logoUrl: string;
  logoBackground: "dark" | "light";
  heroTitle: string;
  heroDescription: string;
};

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};

function getDefaultBranding(user: PortalUser): PortalBrandingForm {
  return {
    brandName: user.nome?.trim() || user.email,
    logoUrl: "",
    logoBackground: "dark",
    heroTitle: "Teste de Temperamentos",
    heroDescription: "Responda com calma para gerar um resultado completo.",
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function formatDateInputDefault() {
  const now = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function onlyDigits(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

function toAbsoluteUrl(pathOrUrl: string) {
  const value = String(pathOrUrl ?? "").trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!origin) return value;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

function isValidEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  if (!value) return true;
  return /^\d{8,15}$/.test(value);
}

function getDisplayTestStatus(test: PortalTest) {
  if (test.status === "revoked") return "revoked";
  if (test.status === "used" || test.used_count >= test.max_uses) return "used";

  const expiresAtMs = new Date(test.expires_at).getTime();
  if (test.status === "expired" || (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now())) {
    return "expired";
  }

  return "active";
}

function getDisplayTestStatusLabel(status: ReturnType<typeof getDisplayTestStatus>) {
  if (status === "used") return "usado";
  if (status === "expired") return "expirado";
  if (status === "revoked") return "revogado";
  return "ativo";
}

function getDisplayTestStatusClass(status: ReturnType<typeof getDisplayTestStatus>) {
  if (status === "used") return "text-amber-300";
  if (status === "expired") return "text-orange-300";
  if (status === "revoked") return "text-rose-300";
  return "text-emerald-300";
}

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
      <span>
        Pagina {pagination.page} de {Math.max(1, pagination.totalPages)} ({pagination.total} itens)
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Proxima
        </Button>
      </div>
    </div>
  );
}

export default function PortalDashboard({ user }: { user: PortalUser }) {
  const router = useRouter();

  const [tests, setTests] = useState<PortalTest[]>([]);
  const [results, setResults] = useState<PortalResult[]>([]);
  const [testsPagination, setTestsPagination] =
    useState<Pagination>(DEFAULT_PAGINATION);
  const [resultsPagination, setResultsPagination] =
    useState<Pagination>(DEFAULT_PAGINATION);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"tests" | "results">("tests");

  const [titulo, setTitulo] = useState("");
  const [expiraEm, setExpiraEm] = useState(formatDateInputDefault());
  const [maxUsos, setMaxUsos] = useState("1");

  const [editTest, setEditTest] = useState<TestEditState | null>(null);
  const [editResult, setEditResult] = useState<ResultEditState | null>(null);
  const [branding, setBranding] = useState<PortalBrandingForm>(() =>
    getDefaultBranding(user),
  );
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [brandingFeedback, setBrandingFeedback] = useState<string | null>(null);

  const testsByStatus = useMemo(() => {
    const active: PortalTest[] = [];
    const used: PortalTest[] = [];
    const expired: PortalTest[] = [];
    const revoked: PortalTest[] = [];

    for (const test of tests) {
      const status = getDisplayTestStatus(test);
      if (status === "used") {
        used.push(test);
        continue;
      }
      if (status === "expired") {
        expired.push(test);
        continue;
      }
      if (status === "revoked") {
        revoked.push(test);
        continue;
      }
      active.push(test);
    }

    return { active, used, expired, revoked };
  }, [tests]);

  async function fetchBranding() {
    setIsLoadingBranding(true);
    try {
      const response = await fetch("/api/portal/branding", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/portal/login");
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setBrandingFeedback(data?.error ?? "Erro ao carregar personalizacao.");
        setBranding(getDefaultBranding(user));
        return;
      }

      const nextBranding = data?.branding ?? {};
      setBranding({
        brandName: String(nextBranding.brandName ?? "").trim() || getDefaultBranding(user).brandName,
        logoUrl: String(nextBranding.logoUrl ?? "").trim(),
        logoBackground:
          nextBranding.logoBackground === "light" || nextBranding.logoBackground === "dark"
            ? nextBranding.logoBackground
            : getDefaultBranding(user).logoBackground,
        heroTitle:
          String(nextBranding.heroTitle ?? "").trim() || getDefaultBranding(user).heroTitle,
        heroDescription:
          String(nextBranding.heroDescription ?? "").trim() ||
          getDefaultBranding(user).heroDescription,
      });
    } finally {
      setIsLoadingBranding(false);
    }
  }

  async function fetchTests(page = testsPagination.page) {
    setIsLoadingTests(true);
    try {
      const response = await fetch(
        `/api/portal/tests?page=${page}&pageSize=${testsPagination.pageSize}`,
        { cache: "no-store" },
      );
      if (response.status === 401) {
        router.replace("/portal/login");
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Erro ao carregar testes.");
        return;
      }

      setTests(Array.isArray(data?.tests) ? data.tests : []);
      setTestsPagination(
        data?.pagination
          ? {
              page: Number(data.pagination.page ?? 1),
              pageSize: Number(data.pagination.pageSize ?? testsPagination.pageSize),
              total: Number(data.pagination.total ?? 0),
              totalPages: Number(data.pagination.totalPages ?? 1),
              hasPrev: Boolean(data.pagination.hasPrev),
              hasNext: Boolean(data.pagination.hasNext),
            }
          : DEFAULT_PAGINATION,
      );
    } finally {
      setIsLoadingTests(false);
    }
  }

  async function fetchResults(page = resultsPagination.page) {
    setIsLoadingResults(true);
    try {
      const response = await fetch(
        `/api/portal/results?page=${page}&pageSize=${resultsPagination.pageSize}`,
        { cache: "no-store" },
      );
      if (response.status === 401) {
        router.replace("/portal/login");
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Erro ao carregar resultados.");
        return;
      }

      setResults(Array.isArray(data?.results) ? data.results : []);
      setResultsPagination(
        data?.pagination
          ? {
              page: Number(data.pagination.page ?? 1),
              pageSize: Number(data.pagination.pageSize ?? resultsPagination.pageSize),
              total: Number(data.pagination.total ?? 0),
              totalPages: Number(data.pagination.totalPages ?? 1),
              hasPrev: Boolean(data.pagination.hasPrev),
              hasNext: Boolean(data.pagination.hasNext),
            }
          : DEFAULT_PAGINATION,
      );
    } finally {
      setIsLoadingResults(false);
    }
  }

  useEffect(() => {
    void Promise.all([fetchBranding(), fetchTests(1), fetchResults(1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveBranding() {
    setBrandingFeedback(null);
    setIsSavingBranding(true);

    try {
      const response = await fetch("/api/portal/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: branding.brandName,
          logoUrl: branding.logoUrl,
          logoBackground: branding.logoBackground,
          heroTitle: branding.heroTitle,
          heroDescription: branding.heroDescription,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setBrandingFeedback(data?.error ?? "Nao foi possivel salvar a personalizacao.");
        return;
      }

      const nextBranding = data?.branding ?? {};
      setBranding({
        brandName: String(nextBranding.brandName ?? "").trim() || getDefaultBranding(user).brandName,
        logoUrl: String(nextBranding.logoUrl ?? "").trim(),
        logoBackground:
          nextBranding.logoBackground === "light" || nextBranding.logoBackground === "dark"
            ? nextBranding.logoBackground
            : getDefaultBranding(user).logoBackground,
        heroTitle:
          String(nextBranding.heroTitle ?? "").trim() || getDefaultBranding(user).heroTitle,
        heroDescription:
          String(nextBranding.heroDescription ?? "").trim() ||
          getDefaultBranding(user).heroDescription,
      });
      setBrandingFeedback("Personalizacao salva com sucesso.");
    } catch {
      setBrandingFeedback("Erro de conexao ao salvar personalizacao.");
    } finally {
      setIsSavingBranding(false);
    }
  }

  async function uploadLogoToServer(file: File) {
    setBrandingFeedback(null);
    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/portal/branding/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setBrandingFeedback(data?.error ?? "Nao foi possivel enviar a logo.");
        return;
      }

      const nextLogoUrl = String(data?.logoUrl ?? "").trim();
      if (nextLogoUrl) {
        setBranding((prev) => ({ ...prev, logoUrl: nextLogoUrl }));
      }

      const width = Number(data?.meta?.width ?? 0);
      const height = Number(data?.meta?.height ?? 0);
      const size = Number(data?.meta?.size ?? 0);
      if (width > 0 && height > 0 && size > 0) {
        const kb = Math.round(size / 1024);
        setBrandingFeedback(`Logo enviada e salva (${width}x${height}, ${kb}KB).`);
      } else {
        setBrandingFeedback("Logo enviada e salva no servidor.");
      }
    } catch {
      setBrandingFeedback("Erro de conexao ao enviar logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function createTest() {
    setError(null);
    setCreatedLink(null);
    setCreatedToken(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/portal/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          expiraEm: new Date(expiraEm).toISOString(),
          maxUsos: Number(maxUsos),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error ?? "Nao foi possivel criar o teste.");
        return;
      }

      const path = String(data.url ?? "");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = origin ? `${origin}${path}` : path;
      const token = String(data?.token ?? "").trim() || null;
      setCreatedLink(link);
      setCreatedToken(token);
      setActiveSection("tests");
      setTitulo("");
      setExpiraEm(formatDateInputDefault());
      setMaxUsos("1");
      await fetchTests(1);
    } catch {
      setError("Erro de conexao.");
    } finally {
      setIsCreating(false);
    }
  }

  async function saveTestEdit() {
    if (!editTest) return;
    setError(null);
    setIsSavingTest(true);

    try {
      const response = await fetch(`/api/portal/tests/${editTest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editTest.titulo,
          expiraEm: new Date(editTest.expiraEm).toISOString(),
          maxUsos: Number(editTest.maxUsos),
          status: editTest.status,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Nao foi possivel atualizar o teste.");
        return;
      }
      setEditTest(null);
      await fetchTests(testsPagination.page);
    } catch {
      setError("Erro de conexao.");
    } finally {
      setIsSavingTest(false);
    }
  }

  async function deleteTest(id: number) {
    const confirmed = window.confirm("Deseja excluir este teste?");
    if (!confirmed) return;
    setError(null);

    try {
      const response = await fetch(`/api/portal/tests/${id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Nao foi possivel excluir o teste.");
        return;
      }

      const nextPage =
        tests.length === 1 && testsPagination.page > 1
          ? testsPagination.page - 1
          : testsPagination.page;
      await fetchTests(nextPage);
      await fetchResults(resultsPagination.page);
    } catch {
      setError("Erro de conexao.");
    }
  }

  async function saveResultEdit() {
    if (!editResult) return;
    setError(null);
    setIsSavingResult(true);

    const cleanEmail = editResult.email.trim().toLowerCase();
    const cleanPhone = onlyDigits(editResult.phone);

    if (!editResult.nome.trim()) {
      setError("Nome obrigatorio.");
      setIsSavingResult(false);
      return;
    }
    if (!cleanEmail && !cleanPhone) {
      setError("Informe email ou telefone.");
      setIsSavingResult(false);
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError("Email invalido.");
      setIsSavingResult(false);
      return;
    }
    if (!isValidPhone(cleanPhone)) {
      setError("Telefone invalido.");
      setIsSavingResult(false);
      return;
    }

    try {
      const response = await fetch(`/api/portal/results/${editResult.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editResult.nome.trim(),
          email: cleanEmail || null,
          phone: cleanPhone || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Nao foi possivel atualizar o resultado.");
        return;
      }
      setEditResult(null);
      await fetchResults(resultsPagination.page);
    } catch {
      setError("Erro de conexao.");
    } finally {
      setIsSavingResult(false);
    }
  }

  async function deleteResult(id: number) {
    const confirmed = window.confirm("Deseja excluir este resultado?");
    if (!confirmed) return;
    setError(null);

    try {
      const response = await fetch(`/api/portal/results/${id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Nao foi possivel excluir o resultado.");
        return;
      }
      const nextPage =
        results.length === 1 && resultsPagination.page > 1
          ? resultsPagination.page - 1
          : resultsPagination.page;
      await fetchResults(nextPage);
    } catch {
      setError("Erro de conexao.");
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError("Nao foi possivel copiar para a area de transferencia.");
    }
  }

  async function logout() {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    router.replace("/portal/login");
  }

  function renderTestRow(test: PortalTest) {
    const displayStatus = getDisplayTestStatus(test);
    const statusLabel = getDisplayTestStatusLabel(displayStatus);
    const statusClass = getDisplayTestStatusClass(displayStatus);

    return (
      <div
        key={test.id}
        className="p-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4"
      >
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{test.titulo || "(Sem titulo)"}</div>
          <div className="text-xs text-slate-400 truncate">
            slug: {test.slug} | token: {test.token_hint} | uso: {test.used_count}/{test.max_uses}
          </div>
          <div className="text-xs text-slate-400">
            expira: {formatDate(test.expires_at)} | status:{" "}
            <span className={statusClass}>{statusLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
            onClick={() => copyText(toAbsoluteUrl(test.share_url || `/teste/${test.slug}`))}
          >
            Copiar link
          </Button>
          <Button
            variant="outline"
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              const fullToken = String(test.token ?? "").trim();
              if (!fullToken) {
                setError(
                  "Token completo indisponivel para este teste antigo. Crie um novo teste para copiar o token inteiro.",
                );
                return;
              }
              void copyText(fullToken);
            }}
          >
            Copiar token
          </Button>
          <Button
            variant="outline"
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
            onClick={() =>
              setEditTest({
                id: test.id,
                titulo: test.titulo ?? "",
                expiraEm: toDatetimeLocal(test.expires_at),
                maxUsos: String(test.max_uses),
                status: test.status === "revoked" ? "revoked" : "active",
              })
            }
          >
            Editar
          </Button>
          <Button
            variant="outline"
            className="bg-transparent border-red-400/40 text-red-200 hover:bg-red-500/10"
            onClick={() => deleteTest(test.id)}
          >
            Excluir
          </Button>
        </div>
      </div>
    );
  }

  function renderTestSection(title: string, count: number, emptyLabel: string, rows: PortalTest[]) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-sm font-medium text-slate-200">{title}</span>
          <span className="text-xs text-slate-400">{count}</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500 px-1">{emptyLabel}</p>
        ) : (
          <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
            {rows.map(renderTestRow)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Portal de Gerenciamento</CardTitle>
              <p className="text-sm text-slate-300 mt-1">
                Usuario: <b>{user.nome || user.email}</b>
              </p>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Sair
            </Button>
          </CardHeader>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle>Personalizacao do Teste</CardTitle>
            <p className="text-sm text-slate-300">
              Esta configuracao aparece no acesso do teste e no questionario para todos os seus slugs.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingBranding ? (
              <p className="text-slate-300">Carregando personalizacao...</p>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nome da marca</Label>
                    <Input
                      value={branding.brandName}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, brandName: e.target.value }))
                      }
                      className="bg-slate-900/60 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo (upload no servidor)</Label>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      disabled={isUploadingLogo}
                      onChange={(e) => {
                        const input = e.currentTarget;
                        const file = input.files?.[0] ?? null;
                        input.value = "";
                        if (file) {
                          void uploadLogoToServer(file);
                        }
                      }}
                      className="bg-slate-900/60 border-white/10"
                    />
                    <p className="text-xs text-slate-400">
                      PNG, JPG ou WEBP ate 2MB, dimensao minima 32x32 e maxima 2000x2000.
                    </p>
                    {isUploadingLogo && (
                      <p className="text-xs text-cyan-300">Enviando logo...</p>
                    )}
                    <div className="space-y-2">
                      <Label>Fundo da logo</Label>
                      <select
                        value={branding.logoBackground}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            logoBackground: e.target.value === "light" ? "light" : "dark",
                          }))
                        }
                        className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                      >
                        <option value="dark">Escuro</option>
                        <option value="light">Branco</option>
                      </select>
                    </div>
                    <Input
                      value={branding.logoUrl}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, logoUrl: e.target.value }))
                      }
                      placeholder="/uploads/portal-logos/... (automatico)"
                      className="bg-slate-900/60 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Titulo do teste</Label>
                    <Input
                      value={branding.heroTitle}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, heroTitle: e.target.value }))
                      }
                      className="bg-slate-900/60 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descricao</Label>
                    <textarea
                      value={branding.heroDescription}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, heroDescription: e.target.value }))
                      }
                      rows={3}
                      className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus-visible:border-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  {branding.logoUrl.trim() ? (
                    <img
                      src={branding.logoUrl.trim()}
                      alt={branding.brandName || "Logo"}
                      className={`h-14 w-14 rounded-lg object-contain border border-white/10 p-1 ${
                        branding.logoBackground === "light" ? "bg-white" : "bg-slate-950/70"
                      }`}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg border border-dashed border-white/20 grid place-items-center text-xs text-slate-500">
                      logo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {branding.heroTitle.trim() || "Teste de Temperamentos"}
                    </div>
                    <div className="text-sm text-cyan-300 truncate">
                      {branding.brandName.trim() || user.nome || user.email}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {branding.heroDescription.trim() || "Descricao do teste"}
                    </div>
                  </div>
                </div>

                {brandingFeedback && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                    {brandingFeedback}
                  </div>
                )}

                <Button
                  onClick={saveBranding}
                  disabled={isSavingBranding || isUploadingLogo}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  {isSavingBranding ? "Salvando..." : "Salvar personalizacao"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setActiveSection("tests")}
                className={
                  activeSection === "tests"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-transparent border border-white/20 text-white hover:bg-white/10"
                }
              >
                Testes Criados ({testsPagination.total})
              </Button>
              <Button
                onClick={() => setActiveSection("results")}
                className={
                  activeSection === "results"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-transparent border border-white/20 text-white hover:bg-white/10"
                }
              >
                Resultados ({resultsPagination.total})
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {activeSection === "tests" && (
          <>
            <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle>Criar Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-2 md:col-span-1">
                <Label>Titulo *</Label>
                <Input
                  placeholder="Ex.: Perfil de Lideranca"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="bg-slate-900/60 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Expira em *</Label>
                <Input
                  type="datetime-local"
                  value={expiraEm}
                  onChange={(e) => setExpiraEm(e.target.value)}
                  className="bg-slate-900/60 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Max usos *</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={maxUsos}
                  onChange={(e) => setMaxUsos(e.target.value)}
                  className="bg-slate-900/60 border-white/10"
                />
              </div>
            </div>

            {createdLink && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-emerald-200">Link gerado com sucesso.</span>
                  <Button
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10"
                    onClick={() => copyText(createdLink)}
                  >
                    Copiar link
                  </Button>
                  {createdToken && (
                    <Button
                      variant="outline"
                      className="bg-transparent border-white/20 text-white hover:bg-white/10"
                      onClick={() => copyText(createdToken)}
                    >
                      Copiar token
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={createTest}
              disabled={isCreating}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {isCreating ? "Criando..." : "Criar teste"}
            </Button>
          </CardContent>
        </Card>

            <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle>Testes Criados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editTest && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 space-y-3">
                <div className="grid md:grid-cols-4 gap-2">
                  <Input
                    value={editTest.titulo}
                    onChange={(e) =>
                      setEditTest((prev) => (prev ? { ...prev, titulo: e.target.value } : prev))
                    }
                    className="bg-slate-900/60 border-white/10"
                  />
                  <Input
                    type="datetime-local"
                    value={editTest.expiraEm}
                    onChange={(e) =>
                      setEditTest((prev) => (prev ? { ...prev, expiraEm: e.target.value } : prev))
                    }
                    className="bg-slate-900/60 border-white/10"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={editTest.maxUsos}
                    onChange={(e) =>
                      setEditTest((prev) => (prev ? { ...prev, maxUsos: e.target.value } : prev))
                    }
                    className="bg-slate-900/60 border-white/10"
                  />
                  <select
                    value={editTest.status}
                    onChange={(e) =>
                      setEditTest((prev) =>
                        prev
                          ? { ...prev, status: e.target.value as "active" | "revoked" }
                          : prev,
                      )
                    }
                    className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                  >
                    <option value="active">active</option>
                    <option value="revoked">revoked</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-gradient-to-r from-cyan-500 to-blue-600"
                    onClick={saveTestEdit}
                    disabled={isSavingTest}
                  >
                    {isSavingTest ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10"
                    onClick={() => setEditTest(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {isLoadingTests ? (
              <p className="text-slate-300">Carregando...</p>
            ) : tests.length === 0 ? (
              <p className="text-slate-400">Nenhum teste criado.</p>
            ) : (
              <div className="space-y-4">
                {renderTestSection(
                  "Disponiveis",
                  testsByStatus.active.length,
                  "Nenhum teste disponivel nesta pagina.",
                  testsByStatus.active,
                )}
                {renderTestSection(
                  "Usados",
                  testsByStatus.used.length,
                  "Nenhum teste usado nesta pagina.",
                  testsByStatus.used,
                )}
                {renderTestSection(
                  "Expirados",
                  testsByStatus.expired.length,
                  "Nenhum teste expirado nesta pagina.",
                  testsByStatus.expired,
                )}
                {renderTestSection(
                  "Revogados",
                  testsByStatus.revoked.length,
                  "Nenhum teste revogado nesta pagina.",
                  testsByStatus.revoked,
                )}
              </div>
            )}

            <PaginationControls
              pagination={testsPagination}
              onPageChange={(page) => {
                if (page < 1) return;
                void fetchTests(page);
              }}
            />
          </CardContent>
        </Card>
          </>
        )}

        {activeSection === "results" && (
          <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editResult && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 space-y-3">
                <div className="grid md:grid-cols-3 gap-2">
                  <Input
                    value={editResult.nome}
                    onChange={(e) =>
                      setEditResult((prev) => (prev ? { ...prev, nome: e.target.value } : prev))
                    }
                    className="bg-slate-900/60 border-white/10"
                  />
                  <Input
                    value={editResult.email}
                    onChange={(e) =>
                      setEditResult((prev) => (prev ? { ...prev, email: e.target.value } : prev))
                    }
                    className="bg-slate-900/60 border-white/10"
                  />
                  <Input
                    value={editResult.phone}
                    onChange={(e) =>
                      setEditResult((prev) => (prev ? { ...prev, phone: e.target.value } : prev))
                    }
                    className="bg-slate-900/60 border-white/10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-gradient-to-r from-cyan-500 to-blue-600"
                    onClick={saveResultEdit}
                    disabled={isSavingResult}
                  >
                    {isSavingResult ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10"
                    onClick={() => setEditResult(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {isLoadingResults ? (
              <p className="text-slate-300">Carregando...</p>
            ) : results.length === 0 ? (
              <p className="text-slate-400">Sem resultados.</p>
            ) : (
              <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
                {results.map((result) => {
                  const cleanPhone = onlyDigits(result.phone ?? "");
                  const hasPhone = cleanPhone.length >= 8;
                  return (
                    <div
                      key={result.id}
                      className="p-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{result.nome}</div>
                        <div className="text-xs text-slate-400 truncate">
                          email: {result.email || "-"}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          telefone: {result.phone || "-"}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {hasPhone && (
                          <Button
                            asChild
                            variant="outline"
                            className="bg-transparent border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10"
                          >
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                          </Button>
                        )}

                        <Button
                          asChild
                          variant="outline"
                          className="bg-transparent border-white/20 text-white hover:bg-white/10"
                        >
                          <Link href={`/resultado/${result.slug}/${result.id}`}>
                            Ver resultado
                          </Link>
                        </Button>

                        <Button
                          variant="outline"
                          className="bg-transparent border-white/20 text-white hover:bg-white/10"
                          onClick={() =>
                            setEditResult({
                              id: result.id,
                              nome: result.nome,
                              email: result.email ?? "",
                              phone: result.phone ?? "",
                            })
                          }
                        >
                          Editar
                        </Button>

                        <Button
                          variant="outline"
                          className="bg-transparent border-red-400/40 text-red-200 hover:bg-red-500/10"
                          onClick={() => deleteResult(result.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <PaginationControls
              pagination={resultsPagination}
              onPageChange={(page) => {
                if (page < 1) return;
                void fetchResults(page);
              }}
            />
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
