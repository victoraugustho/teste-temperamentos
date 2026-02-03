"use client"

import React, { FC, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Loader2, ArrowLeft, Sparkles } from "lucide-react"

type Temperament = "sanguineo" | "colerico" | "melancolico" | "fleumatico"
type Scores = Record<Temperament, number>

type ClienteCookie = {
  nome: string
  email?: string | null
  telefone: string
  createdAt: number
}

const COOKIE_NAME = "temperamentos_cliente"
const SCORES_COOKIE = "temperamentos_scores"

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days = 30) {
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

function parseClienteCookie(): ClienteCookie | null {
  const raw = getCookie(COOKIE_NAME)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as ClienteCookie
    if (!data?.nome || !data?.telefone) return null
    return data
  } catch {
    return null
  }
}

type QuestionOption = { text: string; temperament: Temperament }
type Question = QuestionOption[]

const questions: Question[] = [
  // --- FORÇAS ---
  [
    { text: "Animado", temperament: "sanguineo" },
    { text: "Aventureiro", temperament: "colerico" },
    { text: "Analítico", temperament: "melancolico" },
    { text: "Adaptável", temperament: "fleumatico" },
  ],
  [
    { text: "Brincalhão", temperament: "sanguineo" },
    { text: "Persuasivo", temperament: "colerico" },
    { text: "Persistente", temperament: "melancolico" },
    { text: "Sereno", temperament: "fleumatico" },
  ],
  [
    { text: "Sociável", temperament: "sanguineo" },
    { text: "Energético", temperament: "colerico" },
    { text: "Abnegado", temperament: "melancolico" },
    { text: "Submisso", temperament: "fleumatico" },
  ],
  [
    { text: "Convincente", temperament: "sanguineo" },
    { text: "Competitivo", temperament: "colerico" },
    { text: "Atencioso", temperament: "melancolico" },
    { text: "Controlado", temperament: "fleumatico" },
  ],
  [
    { text: "Tranquilo", temperament: "sanguineo" },
    { text: "Habilidoso", temperament: "colerico" },
    { text: "Respeitoso", temperament: "melancolico" },
    { text: "Reservado", temperament: "fleumatico" },
  ],
  [
    { text: "Espirituoso", temperament: "sanguineo" },
    { text: "Autossuficiente", temperament: "colerico" },
    { text: "Sensível", temperament: "melancolico" },
    { text: "Satisfeito", temperament: "fleumatico" },
  ],
  [
    { text: "Estimulador", temperament: "sanguineo" },
    { text: "Positivo", temperament: "colerico" },
    { text: "Planejador", temperament: "melancolico" },
    { text: "Paciente", temperament: "fleumatico" },
  ],
  [
    { text: "Espontâneo", temperament: "sanguineo" },
    { text: "Seguro", temperament: "colerico" },
    { text: "Organizado", temperament: "melancolico" },
    { text: "Tímido", temperament: "fleumatico" },
  ],
  [
    { text: "Otimista", temperament: "sanguineo" },
    { text: "Franco", temperament: "colerico" },
    { text: "Ordeiro", temperament: "melancolico" },
    { text: "Serviçal", temperament: "fleumatico" },
  ],
  [
    { text: "Engraçado", temperament: "sanguineo" },
    { text: "Vigoroso", temperament: "colerico" },
    { text: "Fiel", temperament: "melancolico" },
    { text: "Amigável", temperament: "fleumatico" },
  ],
  [
    { text: "Encantador", temperament: "sanguineo" },
    { text: "Audacioso", temperament: "colerico" },
    { text: "Minucioso", temperament: "melancolico" },
    { text: "Diplomático", temperament: "fleumatico" },
  ],
  [
    { text: "Alegre", temperament: "sanguineo" },
    { text: "Confiante", temperament: "colerico" },
    { text: "Culto", temperament: "melancolico" },
    { text: "Consistente", temperament: "fleumatico" },
  ],
  [
    { text: "Inspirado", temperament: "sanguineo" },
    { text: "Independente", temperament: "colerico" },
    { text: "Idealista", temperament: "melancolico" },
    { text: "Inofensivo", temperament: "fleumatico" },
  ],
  [
    { text: "Demonstrativo", temperament: "sanguineo" },
    { text: "Decidido", temperament: "colerico" },
    { text: "Profundo", temperament: "melancolico" },
    { text: "Irônico", temperament: "fleumatico" },
  ],
  [
    { text: "Desembaraçado", temperament: "sanguineo" },
    { text: "Ativo", temperament: "colerico" },
    { text: "Musical", temperament: "melancolico" },
    { text: "Mediador", temperament: "fleumatico" },
  ],
  [
    { text: "Conversador", temperament: "sanguineo" },
    { text: "Tenaz", temperament: "colerico" },
    { text: "Pensativo", temperament: "melancolico" },
    { text: "Tolerante", temperament: "fleumatico" },
  ],
  [
    { text: "Vivo", temperament: "sanguineo" },
    { text: "Líder", temperament: "colerico" },
    { text: "Leal", temperament: "melancolico" },
    { text: "Ouvinte", temperament: "fleumatico" },
  ],
  [
    { text: "Atraente", temperament: "sanguineo" },
    { text: "Chefe", temperament: "colerico" },
    { text: "Detalhista", temperament: "melancolico" },
    { text: "Contente", temperament: "fleumatico" },
  ],
  [
    { text: "Popular", temperament: "sanguineo" },
    { text: "Produtivo", temperament: "colerico" },
    { text: "Perfeccionista", temperament: "melancolico" },
    { text: "Agradável", temperament: "fleumatico" },
  ],
  [
    { text: "Vivaz", temperament: "sanguineo" },
    { text: "Valente", temperament: "colerico" },
    { text: "Comportado", temperament: "melancolico" },
    { text: "Equilibrado", temperament: "fleumatico" },
  ],
  // --- FRAQUEZAS ---
  [
    { text: "Metido", temperament: "sanguineo" },
    { text: "Mandão", temperament: "colerico" },
    { text: "Acanhado", temperament: "melancolico" },
    { text: "Vazio", temperament: "fleumatico" },
  ],
  [
    { text: "Indisciplinado", temperament: "sanguineo" },
    { text: "Insensível", temperament: "colerico" },
    { text: "Rancoroso", temperament: "melancolico" },
    { text: "Desinteressado", temperament: "fleumatico" },
  ],
  [
    { text: "Repetitivo", temperament: "sanguineo" },
    { text: "Inflexível", temperament: "colerico" },
    { text: "Ressentido", temperament: "melancolico" },
    { text: "Relutante", temperament: "fleumatico" },
  ],
  [
    { text: "Esquecido", temperament: "sanguineo" },
    { text: "Franco", temperament: "colerico" },
    { text: "Complicado", temperament: "melancolico" },
    { text: "Medroso", temperament: "fleumatico" },
  ],
  [
    { text: "Inoportuno", temperament: "sanguineo" },
    { text: "Impaciente", temperament: "colerico" },
    { text: "Inseguro", temperament: "melancolico" },
    { text: "Indeciso", temperament: "fleumatico" },
  ],
  [
    { text: "Imprevisível", temperament: "sanguineo" },
    { text: "Frio", temperament: "colerico" },
    { text: "Impopular", temperament: "melancolico" },
    { text: "Desligado", temperament: "fleumatico" },
  ],
  [
    { text: "Casual", temperament: "sanguineo" },
    { text: "Teimoso", temperament: "colerico" },
    { text: "Insatisfeito", temperament: "melancolico" },
    { text: "Hesitante", temperament: "fleumatico" },
  ],
  [
    { text: "Permissivo", temperament: "sanguineo" },
    { text: "Orgulhoso", temperament: "colerico" },
    { text: "Pessimista", temperament: "melancolico" },
    { text: "Simples", temperament: "fleumatico" },
  ],
  [
    { text: "Esquentado", temperament: "sanguineo" },
    { text: "Combativo", temperament: "colerico" },
    { text: "Alienado", temperament: "melancolico" },
    { text: "Incerto", temperament: "fleumatico" },
  ],
  [
    { text: "Ingênuo", temperament: "sanguineo" },
    { text: "Corajoso", temperament: "colerico" },
    { text: "Negativo", temperament: "melancolico" },
    { text: "Indiferente", temperament: "fleumatico" },
  ],
  [
    { text: "Egoísta", temperament: "sanguineo" },
    { text: "Workaholic", temperament: "colerico" },
    { text: "Retraído", temperament: "melancolico" },
    { text: "Preocupado", temperament: "fleumatico" },
  ],
  [
    { text: "Tagarela", temperament: "sanguineo" },
    { text: "Indelicado", temperament: "colerico" },
    { text: "Sensível demais", temperament: "melancolico" },
    { text: "Tímido", temperament: "fleumatico" },
  ],
  [
    { text: "Desorganizado", temperament: "sanguineo" },
    { text: "Imperioso", temperament: "colerico" },
    { text: "Deprimido", temperament: "melancolico" },
    { text: "Confuso", temperament: "fleumatico" },
  ],
  [
    { text: "Inconstante", temperament: "sanguineo" },
    { text: "Birrento", temperament: "colerico" },
    { text: "Introvertido", temperament: "melancolico" },
    { text: "Ansioso", temperament: "fleumatico" },
  ],
  [
    { text: "Desordenado", temperament: "sanguineo" },
    { text: "Intolerante", temperament: "colerico" },
    { text: "Triste", temperament: "melancolico" },
    { text: "Resmungão", temperament: "fleumatico" },
  ],
  [
    { text: "Convencido", temperament: "sanguineo" },
    { text: "Manipulador", temperament: "colerico" },
    { text: "Cético", temperament: "melancolico" },
    { text: "Lento", temperament: "fleumatico" },
  ],
  [
    { text: "Barulhento", temperament: "sanguineo" },
    { text: "Obstinado", temperament: "colerico" },
    { text: "Desconfiado", temperament: "melancolico" },
    { text: "Preguiçoso", temperament: "fleumatico" },
  ],
  [
    { text: "Distraído", temperament: "sanguineo" },
    { text: "Tirânico", temperament: "colerico" },
    { text: "Vingativo", temperament: "melancolico" },
    { text: "Vagaroso", temperament: "fleumatico" },
  ],
  [
    { text: "Agitado", temperament: "sanguineo" },
    { text: "Imprudente", temperament: "colerico" },
    { text: "Crítico", temperament: "melancolico" },
    { text: "Relutante", temperament: "fleumatico" },
  ],
  [
    { text: "Instável", temperament: "sanguineo" },
    { text: "Astuto", temperament: "colerico" },
    { text: "Solitário", temperament: "melancolico" },
    { text: "Acomodado", temperament: "fleumatico" },
  ],
]


const label: Record<Temperament, string> = {
  sanguineo: "Sanguíneo",
  colerico: "Colérico",
  melancolico: "Melancólico",
  fleumatico: "Fleumático",
}

const TesteDeTemperamentoPage: FC<{
  resultPath?: string
  gatePath?: string
}> = ({ resultPath = "/temperamentos/resultado", gatePath = "/temperamentos" }) => {
  const router = useRouter()

  const [cliente, setCliente] = useState<ClienteCookie | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Temperament>>({})
  const [finalScores, setFinalScores] = useState<Scores | null>(null)

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const c = parseClienteCookie()
    setCliente(c)
    if (!c) router.replace(gatePath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress = useMemo(() => {
    return Math.round(((currentQuestionIndex + 1) / questions.length) * 100)
  }, [currentQuestionIndex])

  const handleAnswerSelect = (t: Temperament) => {
    if (isTransitioning || isSaving) return
    setIsTransitioning(true)

    const newAnswers = { ...answers, [currentQuestionIndex]: t }
    setAnswers(newAnswers)

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
        setIsTransitioning(false)
      } else {
        calculateAndSubmit(newAnswers)
      }
    }, 220)
  }

  const calculateAndSubmit = async (finalAnswers: Record<number, Temperament>) => {
    setError(null)
    setIsSaving(true)

    const scores: Scores = { sanguineo: 0, colerico: 0, melancolico: 0, fleumatico: 0 }
    Object.values(finalAnswers).forEach((t) => {
      if (t) scores[t]++
    })

    setFinalScores(scores)

    try {
      const c = parseClienteCookie()
      if (!c) throw new Error("Dados do cliente não encontrados. Volte e preencha o formulário.")

      // 👉 alinhado com a API /api/salvar-resultado
      const payload = {
        nome: c.nome,
        email: c.email ?? null,
        telefone: c.telefone,
        scores,
      }

      const res = await fetch("/api/salvar-resultado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(data?.error ?? "Falha ao salvar o resultado."))

      // cookie auxiliar pro resultado (client-side)
      setCookie(SCORES_COOKIE, JSON.stringify(scores), 30)

      router.replace(resultPath)
    } catch (e: any) {
      setError(e?.message ?? "Erro inesperado.")
      setIsSaving(false)
      setIsTransitioning(false)
    }
  }

  if (!cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200 p-4">
        Carregando...
      </div>
    )
  }

  const q = questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-4">
        {/* Header */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-cyan-400 text-xl sm:text-2xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  Teste de Temperamentos
                </CardTitle>
                <p className="text-slate-300 mt-1">
                  {cliente.nome} • {cliente.telefone}
                </p>
              </div>

              <Button
                variant="outline"
                className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white hover:cursor-pointer w-full sm:w-auto"
                onClick={() => router.push(gatePath)}
                disabled={isSaving}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>

            <div className="mt-4">
              <Progress className="h-3 bg-cyan-800/40 border-cyan-500/40" value={progress} />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Questão <b className="text-white">{currentQuestionIndex + 1}</b> de{" "}
                  <b className="text-white">{questions.length}</b>
                </span>
                <span className="text-white">{progress}%</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Pergunta */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg sm:text-2xl font-semibold text-white">Qual destas palavras melhor descreve você?</h2>
                <p className="text-sm text-slate-300 mt-1">Escolha apenas uma opção para avançar automaticamente.</p>
              </div>

              <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                {currentQuestionIndex + 1}/{questions.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.map((opt) => (
                <button
                  key={opt.text}
                  onClick={() => handleAnswerSelect(opt.temperament)}
                  disabled={isTransitioning || isSaving}
                  className={[
                    "text-left text-cyan-50 hover:cursor-pointer rounded-2xl border px-4 py-4 transition",
                    "disabled:opacity-50 disabled:cursor-not-allowed border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/30 hover:scale-[1.03]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-center">
                    <div className="font-semibold text-base">{opt.text}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* estado salvando/erro */}
            <div className="mt-6">
              {isSaving && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-200">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando resultado...
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>

            {/* scores (apenas quando finalizar) */}
            {finalScores && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(finalScores) as Temperament[]).map((t) => (
                  <div key={t} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-center">
                    <div className="text-xs text-slate-400">{label[t]}</div>
                    <div className="text-3xl font-bold mt-1">{finalScores[t]}</div>
                  </div>
                ))}
              </div>
            )}

            {finalScores && !isSaving && !error && (
              <div className="mt-5 flex items-center justify-center gap-2 text-emerald-300 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Resultado salvo com sucesso. Redirecionando...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TesteDeTemperamentoPage
