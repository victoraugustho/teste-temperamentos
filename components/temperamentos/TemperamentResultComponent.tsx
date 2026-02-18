"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Brain, TrendingUp, Award, Users, Target, Lightbulb, Star } from "lucide-react"
import Image from "next/image"

interface TemperamentScores {
  sanguineo: number
  colerico: number
  melancolico: number
  fleumatico: number
}

interface TemperamentResultProps {
  scores: TemperamentScores
  clienteNome: string
  dataRealizacao: string
}

function TemperamentAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 shrink-0">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, (max-width: 1024px) 96px, 112px"
        className="object-contain"
      />
    </div>
  )
}

const temperamentData = {
  sanguineo: {
    name: "Sanguíneo",
    color: "from-yellow-400 to-orange-500",
    description: "Comunicador nato, otimista e sociável",
    characteristics: ["Extrovertido", "Otimista", "Comunicativo", "Espontâneo", "Entusiasta"],
    strengths: ["Excelente comunicação", "Motivador natural", "Adaptável", "Criativo", "Carismático"],
    challenges: ["Pode ser desorganizado", "Dificuldade com detalhes", "Impulsivo", "Busca aprovação"],
    icon: <Users className="w-6 h-6" />,
    imageSrc: "/sanguineo-att-2.png",
  },
  colerico: {
    name: "Colérico",
    color: "from-red-500 to-orange-600",
    description: "Líder natural, determinado e orientado a resultados",
    characteristics: ["Determinado", "Líder", "Competitivo", "Direto", "Ambicioso"],
    strengths: ["Liderança natural", "Orientado a resultados", "Decisivo", "Eficiente", "Corajoso"],
    challenges: ["Pode ser impaciente", "Dominador", "Pouco empático", "Workaholic"],
    icon: <Target className="w-6 h-6" />,
    imageSrc: "/colerico.png",
  },
  melancolico: {
    name: "Melancólico",
    color: "from-green-500 to-emerald-600",
    description: "Analítico, perfeccionista e detalhista",
    characteristics: ["Analítico", "Perfeccionista", "Detalhista", "Sensível", "Criativo"],
    strengths: ["Atenção aos detalhes", "Qualidade superior", "Planejamento", "Lealdade", "Profundidade"],
    challenges: ["Tendência ao pessimismo", "Autocrítico", "Moody", "Procrastinação"],
    icon: <Brain className="w-6 h-6" />,
    imageSrc: "/melancolico.png",
  },
  fleumatico: {
    name: "Fleumático",
    color: "from-blue-500 to-cyan-600",
    description: "Paciente, estável e diplomático",
    characteristics: ["Paciente", "Estável", "Diplomático", "Confiável", "Calmo"],
    strengths: ["Estabilidade emocional", "Mediador natural", "Confiável", "Paciente", "Leal"],
    challenges: ["Resistente a mudanças", "Pode ser passivo", "Evita conflitos", "Lento para decidir"],
    icon: <Award className="w-6 h-6" />,
    imageSrc: "/fleumatico.png",
  },
} as const

export default function TemperamentResultComponent({ scores, clienteNome, dataRealizacao }: TemperamentResultProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const totalQuestions = useMemo(() => Object.values(scores).reduce((sum, score) => sum + score, 0), [scores])

  const percentages = useMemo(() => {
    return Object.entries(scores)
      .map(([temp, score]) => ({
        temperament: temp as keyof TemperamentScores,
        score,
        percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
      }))
      .sort((a, b) => b.score - a.score)
  }, [scores, totalQuestions])

  const dominantTemperament = percentages[0]?.temperament ?? "sanguineo"
  const dominantData = temperamentData[dominantTemperament]

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()

      const pageWidth = doc.internal.pageSize.width
      const margin = 16
      let y = margin

      const addLine = (text: string, size = 12, color: [number, number, number] = [0, 0, 0]) => {
        doc.setFontSize(size)
        doc.setTextColor(color[0], color[1], color[2])
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2)
        lines.forEach((l: string) => {
          if (y > doc.internal.pageSize.height - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(l, margin, y)
          y += size * 0.5 + 2
        })
        y += 2
      }

      addLine("RELATÓRIO DE TEMPERAMENTOS", 20, [59, 130, 246])
      y += 4
      addLine(`Cliente: ${clienteNome}`, 12)
      addLine(`Data de Realização: ${dataRealizacao}`, 12)
      addLine(`Pedido: CRM 4 Temperamentos`, 12)
      y += 6

      addLine("TEMPERAMENTO DOMINANTE", 14, [220, 38, 38])
      addLine(`${dominantData.name} (${percentages[0].percentage}%)`, 12)
      addLine(dominantData.description, 11, [80, 80, 80])
      y += 4

      addLine("Características Principais:", 12, [59, 130, 246])
      dominantData.characteristics.forEach((c) => addLine(`• ${c}`, 11))

      y += 2
      addLine("Pontos Fortes:", 12, [34, 197, 94])
      dominantData.strengths.forEach((s) => addLine(`• ${s}`, 11))

      y += 2
      addLine("Áreas de Desenvolvimento:", 12, [249, 115, 22])
      dominantData.challenges.forEach((c) => addLine(`• ${c}`, 11))

      y += 6
      addLine("DISTRIBUIÇÃO DOS TEMPERAMENTOS", 14, [59, 130, 246])
      percentages.forEach((p) => {
        const td = temperamentData[p.temperament]
        addLine(`${td.name}: ${p.percentage}% (${p.score} respostas)`, 11)
        addLine(td.description, 10, [100, 100, 100])
        y += 2
      })

      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(140, 140, 140)
        doc.text(`CRM 4 Temperamentos - Gerado em ${new Date().toLocaleDateString("pt-BR")}`, margin, doc.internal.pageSize.height - 10)
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 28, doc.internal.pageSize.height - 10)
      }

      doc.save(`Relatorio_Temperamentos_${clienteNome.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (e) {
      console.error(e)
      alert("Erro ao gerar PDF. Tente novamente.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 via-cyan-600/40 to-emerald-600/40" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Relatório de Temperamentos</h1>
                    <div className="flex items-center gap-2 text-white/80">
                      <Star className="w-4 h-4" />
                      <span>Análise Completa</span>
                    </div>
                  </div>
                </div>
                <p className="text-lg font-semibold">{clienteNome}</p>
                <p className="text-white/70">Realizado em: {dataRealizacao}</p>
              </div>

              <div className="hidden md:flex w-20 h-20 rounded-full bg-white/10 border border-white/10 items-center justify-center relative">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <Button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="bg-white/10 hover:bg-white/15 border border-white/15 hover:cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGeneratingPDF ? "Gerando PDF..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>

        {/* Dominante */}
        <Card className="relative overflow-hidden bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
          {/* Glow de fundo */}
          <div className={`absolute inset-0 opacity-20 bg-gradient-to-r ${dominantData.color}`} />

          <CardHeader className="relative pb-6">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              
              {/* IMAGEM GRANDE */}
              <div className="flex justify-center md:justify-start">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72">
                  <div
                    className={`absolute inset-0 rounded-full blur-3xl opacity-40 bg-gradient-to-r ${dominantData.color}`}
                  />
                  <Image
                    src={dominantData.imageSrc}
                    alt={`Boneco ${dominantData.name}`}
                    fill
                    sizes="(max-width: 768px) 256px, 288px"
                    className="object-contain relative z-10"
                    priority
                  />
                </div>
              </div>

              {/* INFORMAÇÕES */}
              <div className="space-y-4 text-center md:text-left">
                <div className="flex justify-center md:justify-start">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${dominantData.color} flex items-center justify-center`}
                  >
                    {dominantData.icon}
                  </div>
                </div>

                <CardTitle className="text-3xl md:text-4xl font-bold text-white">
                  {dominantData.name}
                </CardTitle>

                <p className="text-white/80 text-lg">
                  {dominantData.description}
                </p>

                <div className="flex justify-center md:justify-start items-center gap-4">
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-r ${dominantData.color} flex items-center justify-center shadow-xl`}
                  >
                    <span className="text-2xl font-bold">
                      {percentages[0].percentage}%
                    </span>
                  </div>

                  <div className="text-white/70 text-sm">
                    <div>Predominância</div>
                    <div>{totalQuestions} respostas</div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-cyan-300">
                  <TrendingUp className="w-4 h-4" />
                  Características
                </h4>
                <div className="flex flex-wrap gap-2">
                  {dominantData.characteristics.map((c) => (
                    <Badge key={c} className="bg-white/10 border border-white/15 text-white">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-emerald-300">
                  <Award className="w-4 h-4" />
                  Pontos Fortes
                </h4>
                <ul className="space-y-2 text-white/90 text-sm">
                  {dominantData.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-300" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-amber-300">
                  <Lightbulb className="w-4 h-4" />
                  Desenvolvimento
                </h4>
                <ul className="space-y-2 text-white/90 text-sm">
                  {dominantData.challenges.map((c) => (
                    <li key={c} className="flex items-start gap-2">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-300" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Distribuição */}
        <Card className="bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              Distribuição dos Temperamentos
            </CardTitle>
            <p className="text-white/70">Visão geral das porcentagens e principais traços</p>
          </CardHeader>

          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {percentages.map(({ temperament, score, percentage }) => {
                const td = temperamentData[temperament]
                return (
                  <div key={temperament} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${td.color} flex items-center justify-center`}>
                          {td.icon}
                        </div>

                        <div className="hidden sm:block">
                          <TemperamentAvatar src={td.imageSrc} alt={`Boneco ${td.name}`} />
                        </div>

                        <div>
                          <div className="font-bold text-lg text-white">{td.name}</div>
                          <div className="text-white/60 text-sm">{score} respostas</div>
                        </div>
                      </div>

                      <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${td.color} flex items-center justify-center`}>
                        <span className="font-bold">{percentage}%</span>
                      </div>
                    </div>

                    <div className="mt-4 bg-white/10 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 bg-gradient-to-r ${td.color} rounded-full transition-all duration-700`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="text-white/70 text-sm mt-3">{td.description}</p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {td.characteristics.slice(0, 3).map((c) => (
                        <Badge key={c} className="bg-white/10 border border-white/15 text-white text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white/5 border border-white/10 backdrop-blur-xl">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-extrabold text-white">{totalQuestions}</div>
              <div className="text-white/70 text-sm">Total de respostas</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 backdrop-blur-xl">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-extrabold text-white">{percentages[0].percentage}%</div>
              <div className="text-white/70 text-sm">Dominante</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 backdrop-blur-xl">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-extrabold text-white">{percentages.filter((p) => p.percentage > 15).length}</div>
              <div className="text-white/70 text-sm">Temperamentos ativos</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border border-white/10 backdrop-blur-xl">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-extrabold text-white">100%</div>
              <div className="text-white/70 text-sm">Análise completa</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
