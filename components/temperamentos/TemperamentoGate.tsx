"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Trash2, User, Mail, Phone } from "lucide-react"
import Image from "next/image"

type ClienteCookie = {
  nome: string
  email?: string | null
  telefone: string
  createdAt: number
}

const COOKIE_NAME = "temperamentos_cliente"

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "")
}

function setCookie(name: string, value: string, days = 30) {
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

function isValidEmail(email: string) {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function TemperamentoGate({
  nextPath = "/temperamentos/teste",
}: {
  nextPath?: string
}) {
  const router = useRouter()

  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [hasSaved, setHasSaved] = useState(false)

  useEffect(() => {
    const raw = getCookie(COOKIE_NAME)
    if (!raw) return
    try {
      const data = JSON.parse(raw) as ClienteCookie
      if (data?.nome && data?.telefone && data?.email) {
        setNome(data.nome)
        setEmail(data.email)
        setTelefone(data.telefone)
        setHasSaved(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const maskedTelefone = useMemo(() => {
    const d = onlyDigits(telefone)
    if (d.length <= 2) return d
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    return d
  }, [telefone])

  function salvarEContinuar() {
    setError(null)

    const n = nome.trim()
    const e = email.trim().toLowerCase()
    const t = onlyDigits(telefone)

    if (!n) return setError("Informe seu nome.")
    if (!t || t.length < 8) return setError("Informe um telefone válido (apenas números).")
    if (!isValidEmail(e)) return setError("E-mail inválido.")

    const payload: ClienteCookie = {
      nome: n,
      email: e || null,
      telefone: t,
      createdAt: Date.now(),
    }

    setCookie(COOKIE_NAME, JSON.stringify(payload), 30)
    router.push(nextPath)
  }

  function limparDados() {
    deleteCookie(COOKIE_NAME)
    setNome("")
    setEmail("")
    setTelefone("")
    setHasSaved(false)
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
      <Card className="w-full max-w-xl bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader className="text-center">
            {/* badge */}
            <div className="flex justify-center">
                <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                Acesso liberado
                </Badge>
            </div>

            {/* logo */}
            <div className="flex justify-center mt-4">
                <div className="hidden md:flex w-20 h-20 rounded-full bg-white/10 border border-white/10 items-center justify-center relative">
                <Image
                    src="/logo.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                    priority
                />
                </div>
            </div>

            {/* título + descrição */}
            <div className="mt-4">
                <CardTitle className="text-2xl sm:text-3xl text-white">
                Teste de Temperamentos
                </CardTitle>

                <p className="text-slate-300 mt-2 max-w-xl mx-auto">
                Preencha seus dados para liberar o teste. Ao final, salvaremos o resultado automaticamente.
                </p>
            </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Nome *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="pl-10 bg-slate-900/40 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">E-mail *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="pl-10 bg-slate-900/40 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Telefone *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <Input
                value={maskedTelefone}
                onChange={(e) => setTelefone(onlyDigits(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                className="pl-10 bg-slate-900/40 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <p className="text-xs text-slate-400">Use apenas números com DDD. Ex.: 62999999999</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-2">
            <Button
              onClick={salvarEContinuar}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95"
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {hasSaved && (
              <Button
                variant="outline"
                onClick={limparDados}
                className="bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar dados
              </Button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Seus dados ficam salvos no navegador (cookie) apenas para liberar o teste e registrar o resultado.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
