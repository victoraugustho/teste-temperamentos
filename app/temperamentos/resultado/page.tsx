"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, RotateCcw } from "lucide-react"

import TemperamentResultComponent from "@/components/temperamentos/TemperamentResultComponent"

type Temperament = "sanguineo" | "colerico" | "melancolico" | "fleumatico"

type Scores = Record<Temperament, number>

type ClienteCookie = {
  nome: string
  email?: string | null
  telefone: string
  createdAt: number
}

const CLIENT_COOKIE = "temperamentos_cliente"
const SCORES_COOKIE = "temperamentos_scores"

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export default function Page() {
  const router = useRouter()

  const [cliente, setCliente] = useState<ClienteCookie | null>(null)
  const [scores, setScores] = useState<Scores | null>(null)

  useEffect(() => {
    const c = parseJSON<ClienteCookie>(getCookie(CLIENT_COOKIE))
    const s = parseJSON<Scores>(getCookie(SCORES_COOKIE))

    if (!c || !c.nome || !c.telefone) {
      router.replace("/temperamentos")
      return
    }

    if (!s) {
      router.replace("/temperamentos/teste")
      return
    }

    setCliente(c)
    setScores(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dataRealizacao = useMemo(() => {
    const dt = cliente?.createdAt ? new Date(cliente.createdAt) : new Date()
    return dt.toLocaleDateString("pt-BR")
  }, [cliente])

  function refazerTeste() {
    deleteCookie(SCORES_COOKIE)
    router.push("/temperamentos/teste")
  }

  function voltarInicio() {
    router.push("/temperamentos")
  }

  if (!cliente || !scores) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
        Carregando...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ações rápidas */}
      <div className="pt-10 max-w-6xl mx-auto">
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="text-sm text-slate-300">
              Resultado para <b className="text-white">{cliente.nome}</b>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={voltarInicio}
                className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:cursor-pointer hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              <Button
                onClick={refazerTeste}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refazer teste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* relatório bonito */}
      <TemperamentResultComponent scores={scores} clienteNome={cliente.nome} dataRealizacao={dataRealizacao} />
    </div>
  )
}
