"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Award,
  Brain,
  Download,
  Lightbulb,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"

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
  branding?: {
    brandName: string
    logoUrl: string | null
    logoBackground: "dark" | "light"
    heroTitle: string
    heroDescription: string
  } | null
}

function TemperamentAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, (max-width: 1024px) 96px, 112px"
        className="object-contain"
        loading="lazy"
      />
    </div>
  )
}

const temperamentData = {
  sanguineo: {
    name: "Sanguíneo",
    color: "from-yellow-400 to-orange-500",
    pdfColor: [245, 158, 11] as [number, number, number],
    description: "Comunicador nato, otimista e sociável",
    characteristics: ["Extrovertido", "Otimista", "Comunicativo", "Espontâneo", "Entusiasta"],
    strengths: ["Excelente comunicação", "Motivador natural", "Adaptável", "Criativo", "Carismático"],
    challenges: ["Pode ser desorganizado", "Dificuldade com detalhes", "Impulsivo", "Busca aprovação"],
    icon: <Users className="h-6 w-6" />,
    imageSrc: "/sanguineo-att-2.png",
  },
  colerico: {
    name: "Colérico",
    color: "from-red-500 to-orange-600",
    pdfColor: [239, 68, 68] as [number, number, number],
    description: "Líder natural, determinado e orientado a resultados",
    characteristics: ["Determinado", "Líder", "Competitivo", "Direto", "Ambicioso"],
    strengths: ["Liderança natural", "Orientado a resultados", "Decisivo", "Eficiente", "Corajoso"],
    challenges: ["Pode ser impaciente", "Dominador", "Pouco empático", "Workaholic"],
    icon: <Target className="h-6 w-6" />,
    imageSrc: "/colerico.png",
  },
  melancolico: {
    name: "Melancólico",
    color: "from-green-500 to-emerald-600",
    pdfColor: [16, 185, 129] as [number, number, number],
    description: "Analítico, perfeccionista e detalhista",
    characteristics: ["Analítico", "Perfeccionista", "Detalhista", "Sensível", "Criativo"],
    strengths: ["Atenção aos detalhes", "Qualidade superior", "Planejamento", "Lealdade", "Profundidade"],
    challenges: ["Tendência ao pessimismo", "Autocrítico", "Oscilação de humor", "Procrastinação"],
    icon: <Brain className="h-6 w-6" />,
    imageSrc: "/melancolico.png",
  },
  fleumatico: {
    name: "Fleumático",
    color: "from-blue-500 to-cyan-600",
    pdfColor: [6, 182, 212] as [number, number, number],
    description: "Paciente, estável e diplomático",
    characteristics: ["Paciente", "Estável", "Diplomático", "Confiável", "Calmo"],
    strengths: ["Estabilidade emocional", "Mediador natural", "Confiável", "Paciente", "Leal"],
    challenges: ["Resistente a mudanças", "Pode ser passivo", "Evita conflitos", "Lento para decidir"],
    icon: <Award className="h-6 w-6" />,
    imageSrc: "/fleumatico.png",
  },
} as const

export default function TemperamentResultComponent({
  scores,
  clienteNome,
  dataRealizacao,
  branding = null,
}: TemperamentResultProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const brandName = String(branding?.brandName ?? "").trim() || "Portal de Testes"
  const logoUrl = String(branding?.logoUrl ?? "").trim() || "/logo.png"
  const logoBackground = branding?.logoBackground === "light" ? "light" : "dark"
  const heroTitle = String(branding?.heroTitle ?? "").trim()
  const heroDescription = String(branding?.heroDescription ?? "").trim()

  const totalQuestions = useMemo(
    () => Object.values(scores).reduce((sum, score) => sum + score, 0),
    [scores],
  )

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
      const doc = new jsPDF({ unit: "mm", format: "a4" })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 14
      const contentWidth = pageWidth - margin * 2
      let y = 18

      const ensureSpace = (required: number) => {
        if (y + required <= pageHeight - 20) return
        doc.addPage()
        y = 20
      }

      const writeWrapped = (
        text: string,
        x: number,
        maxWidth: number,
        {
          size = 10,
          color = [51, 65, 85] as [number, number, number],
          bold = false,
          lineHeight = 4.8,
        }: {
          size?: number
          color?: [number, number, number]
          bold?: boolean
          lineHeight?: number
        } = {},
      ) => {
        doc.setFont("helvetica", bold ? "bold" : "normal")
        doc.setFontSize(size)
        doc.setTextColor(color[0], color[1], color[2])
        const lines = doc.splitTextToSize(text, maxWidth)
        ensureSpace(lines.length * lineHeight + 2)
        lines.forEach((line: string) => {
          doc.text(line, x, y)
          y += lineHeight
        })
      }

      const sectionTitle = (title: string) => {
        ensureSpace(10)
        y += 2
        doc.setFillColor(241, 245, 249)
        doc.roundedRect(margin, y - 5.5, contentWidth, 8, 2, 2, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text(title, margin + 3, y)
        y += 6
      }

      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, pageWidth, 40, "F")
      doc.setFillColor(8, 145, 178)
      doc.rect(0, 40, pageWidth, 4, "F")

      doc.setFont("helvetica", "bold")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.text("Relatório de Temperamentos", margin, 16)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(226, 232, 240)
      doc.text(brandName, margin, 23)
      doc.text(`Data: ${dataRealizacao}`, margin, 29)
      doc.text("Perfil comportamental - 4 Temperamentos", margin, 35)

      y = 52

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD")
      y += 7
      writeWrapped(`Cliente: ${clienteNome}`, margin + 4, contentWidth - 8, {
        size: 12,
        bold: true,
        color: [15, 23, 42],
      })
      writeWrapped(`Data da realização: ${dataRealizacao}`, margin + 4, contentWidth - 8, {
        size: 10,
        color: [71, 85, 105],
      })
      writeWrapped(`Total de respostas: ${totalQuestions}`, margin + 4, contentWidth - 8, {
        size: 10,
        color: [71, 85, 105],
      })

      y += 4
      ensureSpace(34)
      const [dr, dg, db] = dominantData.pdfColor
      doc.setFillColor(dr, dg, db)
      doc.roundedRect(margin, y, contentWidth, 30, 3, 3, "F")
      y += 8
      writeWrapped(`Temperamento predominante: ${dominantData.name}`, margin + 4, contentWidth - 8, {
        size: 13,
        bold: true,
        color: [255, 255, 255],
      })
      writeWrapped(`${percentages[0]?.percentage ?? 0}% (${percentages[0]?.score ?? 0} respostas)`, margin + 4, contentWidth - 8, {
        size: 11,
        bold: true,
        color: [255, 255, 255],
      })
      writeWrapped(dominantData.description, margin + 4, contentWidth - 8, {
        size: 10,
        color: [255, 255, 255],
      })

      y += 2
      sectionTitle("Distribuição dos Temperamentos")

      percentages.forEach(({ temperament, percentage, score }) => {
        const td = temperamentData[temperament]
        ensureSpace(22)
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD")

        doc.setFont("helvetica", "bold")
        doc.setFontSize(10.5)
        doc.setTextColor(15, 23, 42)
        doc.text(td.name, margin + 3, y + 6)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(71, 85, 105)
        doc.text(`${score} respostas`, margin + 3, y + 11)

        doc.setFont("helvetica", "bold")
        doc.setTextColor(15, 23, 42)
        doc.text(`${percentage}%`, margin + contentWidth - 16, y + 6)

        doc.setFillColor(226, 232, 240)
        doc.roundedRect(margin + 3, y + 13, contentWidth - 6, 4, 1.5, 1.5, "F")
        const [pr, pg, pb] = td.pdfColor
        doc.setFillColor(pr, pg, pb)
        const progress = Math.max(2, ((contentWidth - 6) * percentage) / 100)
        doc.roundedRect(margin + 3, y + 13, progress, 4, 1.5, 1.5, "F")

        y += 24
      })

      sectionTitle("Perfil Detalhado")

      const drawListBox = (
        title: string,
        color: [number, number, number],
        items: readonly string[],
      ) => {
        const lineHeight = 4.2
        const boxHeight = 10 + items.length * lineHeight
        ensureSpace(boxHeight + 3)

        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD")

        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(color[0], color[1], color[2])
        doc.text(title, margin + 3, y + 6)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(51, 65, 85)
        let lineY = y + 10
        items.forEach((item) => {
          const lines = doc.splitTextToSize(`- ${item}`, contentWidth - 8)
          lines.forEach((line: string) => {
            doc.text(line, margin + 4, lineY)
            lineY += lineHeight
          })
        })

        y += boxHeight + 3
      }

      drawListBox("Características", [8, 145, 178], dominantData.characteristics)
      drawListBox("Pontos Fortes", [5, 150, 105], dominantData.strengths)
      drawListBox("Áreas de Desenvolvimento", [217, 119, 6], dominantData.challenges)

      const createdAt = new Date().toLocaleString("pt-BR")
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i)
        doc.setDrawColor(226, 232, 240)
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(`${brandName} • Gerado em ${createdAt}`, margin, pageHeight - 9)
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 9, {
          align: "right",
        })
      }

      doc.save(
        `Relatorio_Temperamentos_${clienteNome.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
      )
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar PDF. Tente novamente.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 via-cyan-600/40 to-emerald-600/40" />
          <div className="relative z-10">
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-cyan-400/35 blur-2xl" />
                  <img
                    src={logoUrl}
                    alt={brandName}
                    className={`relative h-24 w-24 rounded-3xl border-2 border-cyan-300/70 p-2 object-contain shadow-[0_0_35px_rgba(34,211,238,0.35)] sm:h-28 sm:w-28 ${
                      logoBackground === "light" ? "bg-white" : "bg-slate-900/85"
                    }`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">Relatório de Temperamentos</h1>
                  <div className="flex items-center justify-center gap-2 text-white/80">
                    <Star className="h-4 w-4" />
                    <span>Análise Completa</span>
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-cyan-200">{brandName}</p>
              {heroTitle && <p className="text-sm text-white/90">{heroTitle}</p>}
              {heroDescription && <p className="text-xs text-white/70">{heroDescription}</p>}
              <p className="text-lg font-semibold">{clienteNome}</p>
              <p className="text-white/70">Realizado em: {dataRealizacao}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="border border-white/15 bg-white/10 hover:cursor-pointer hover:bg-white/15"
              >
                <Download className="mr-2 h-4 w-4" />
                {isGeneratingPDF ? "Gerando PDF..." : "Baixar PDF"}
              </Button>
            </div>
          </div>
        </div>

        <Card className="relative overflow-hidden border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <div className={`absolute inset-0 bg-gradient-to-r ${dominantData.color} opacity-20`} />

          <CardHeader className="relative pb-6">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="flex justify-center md:justify-start">
                <div className="relative h-56 w-56 sm:h-64 sm:w-64 md:h-72 md:w-72">
                  <div
                    className={`absolute inset-0 rounded-full bg-gradient-to-r ${dominantData.color} opacity-40 blur-3xl`}
                  />
                  <Image
                    src={dominantData.imageSrc}
                    alt={`Boneco ${dominantData.name}`}
                    fill
                    sizes="(max-width: 768px) 256px, 288px"
                    className="relative z-10 object-contain"
                    loading="eager"
                  />
                </div>
              </div>

              <div className="space-y-4 text-center md:text-left">
                <div className="flex justify-center md:justify-start">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${dominantData.color}`}
                  >
                    {dominantData.icon}
                  </div>
                </div>

                <CardTitle className="text-3xl font-bold text-white md:text-4xl">
                  {dominantData.name}
                </CardTitle>

                <p className="text-lg text-white/80">{dominantData.description}</p>

                <div className="flex items-center justify-center gap-4 md:justify-start">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r ${dominantData.color} shadow-xl`}
                  >
                    <span className="text-2xl font-bold">{percentages[0].percentage}%</span>
                  </div>

                  <div className="text-sm text-white/70">
                    <div>Predominância</div>
                    <div>{totalQuestions} respostas</div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-cyan-300">
                  <TrendingUp className="h-4 w-4" />
                  Características
                </h4>
                <div className="flex flex-wrap gap-2">
                  {dominantData.characteristics.map((characteristic) => (
                    <Badge
                      key={characteristic}
                      className="border border-white/15 bg-white/10 text-white"
                    >
                      {characteristic}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-emerald-300">
                  <Award className="h-4 w-4" />
                  Pontos Fortes
                </h4>
                <ul className="space-y-2 text-sm text-white/90">
                  {dominantData.strengths.map((strength) => (
                    <li key={strength} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-amber-300">
                  <Lightbulb className="h-4 w-4" />
                  Desenvolvimento
                </h4>
                <ul className="space-y-2 text-sm text-white/90">
                  {dominantData.challenges.map((challenge) => (
                    <li key={challenge} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                <TrendingUp className="h-5 w-5" />
              </div>
              Distribuição dos Temperamentos
            </CardTitle>
            <p className="text-white/70">Visão geral das porcentagens e principais traços</p>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {percentages.map(({ temperament, score, percentage }) => {
                const temperamentInfo = temperamentData[temperament]
                return (
                  <div
                    key={temperament}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r ${temperamentInfo.color}`}
                        >
                          {temperamentInfo.icon}
                        </div>

                        <div className="hidden sm:block">
                          <TemperamentAvatar
                            src={temperamentInfo.imageSrc}
                            alt={`Boneco ${temperamentInfo.name}`}
                          />
                        </div>

                        <div>
                          <div className="text-lg font-bold text-white">{temperamentInfo.name}</div>
                          <div className="text-sm text-white/60">{score} respostas</div>
                        </div>
                      </div>

                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r ${temperamentInfo.color}`}
                      >
                        <span className="font-bold">{percentage}%</span>
                      </div>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-3 rounded-full bg-gradient-to-r ${temperamentInfo.color} transition-all duration-700`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="mt-3 text-sm text-white/70">{temperamentInfo.description}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {temperamentInfo.characteristics.slice(0, 3).map((characteristic) => (
                        <Badge
                          key={characteristic}
                          className="border border-white/15 bg-white/10 text-xs text-white"
                        >
                          {characteristic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-extrabold text-white">{totalQuestions}</div>
              <div className="text-sm text-white/70">Total de respostas</div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-extrabold text-white">{percentages[0].percentage}%</div>
              <div className="text-sm text-white/70">Dominante</div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-extrabold text-white">
                {percentages.filter((item) => item.percentage > 15).length}
              </div>
              <div className="text-sm text-white/70">Temperamentos ativos</div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-extrabold text-white">100%</div>
              <div className="text-sm text-white/70">Análise completa</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
