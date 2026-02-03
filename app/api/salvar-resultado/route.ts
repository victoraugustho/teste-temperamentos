// app/api/salvar-resultado/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

type Temperament = "melancolico" | "sanguineo" | "fleumatico" | "colerico"
type Scores = Record<Temperament, number>

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "")
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Converte contagens -> percentuais (0..100) e ajusta para fechar 100.
 * Ex: {10,10,10,10} => {25,25,25,25}
 */
function toPercentages(scores: Scores) {
  const total = Object.values(scores).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0)

  if (total <= 0) {
    return { melancolico: 0, sanguineo: 0, fleumatico: 0, colerico: 0 }
  }

  // 2 casas decimais para ficar bonito e ainda bater no CHECK de 99.99..100.01
  const raw = {
    melancolico: (scores.melancolico / total) * 100,
    sanguineo: (scores.sanguineo / total) * 100,
    fleumatico: (scores.fleumatico / total) * 100,
    colerico: (scores.colerico / total) * 100,
  }

  const rounded = {
    melancolico: Math.round(raw.melancolico * 100) / 100,
    sanguineo: Math.round(raw.sanguineo * 100) / 100,
    fleumatico: Math.round(raw.fleumatico * 100) / 100,
    colerico: Math.round(raw.colerico * 100) / 100,
  }

  // Ajusta “sobrou/faltou” por arredondamento pra fechar 100
  const sum = rounded.melancolico + rounded.sanguineo + rounded.fleumatico + rounded.colerico
  const diff = Math.round((100 - sum) * 100) / 100 // em centésimos

  if (diff !== 0) {
    // joga o ajuste no maior temperamento (mais consistente)
    const entries = Object.entries(rounded) as Array<[Temperament, number]>
    entries.sort((a, b) => b[1] - a[1])
    const top = entries[0][0]
    rounded[top] = Math.round((rounded[top] + diff) * 100) / 100
  }

  // segurança final (CHECK 0..100)
  return {
    melancolico: clamp(rounded.melancolico, 0, 100),
    sanguineo: clamp(rounded.sanguineo, 0, 100),
    fleumatico: clamp(rounded.fleumatico, 0, 100),
    colerico: clamp(rounded.colerico, 0, 100),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    const nome = String(body.nome ?? "").trim()
    const email = body.email ? String(body.email).trim().toLowerCase() : null
    const telefone = onlyDigits(String(body.telefone ?? ""))

    const scores: Scores | null = body.scores ?? null

    if (!nome || !telefone || !scores) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, telefone, scores" },
        { status: 400 }
      )
    }

    // valida scores
    const safeScores: Scores = {
      melancolico: Number(scores.melancolico ?? 0),
      sanguineo: Number(scores.sanguineo ?? 0),
      fleumatico: Number(scores.fleumatico ?? 0),
      colerico: Number(scores.colerico ?? 0),
    }

    for (const [k, v] of Object.entries(safeScores)) {
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: `Score inválido: ${k}` }, { status: 400 })
      }
    }

    const perc = toPercentages(safeScores)

    // UPSERT por telefone (UNIQUE)
    const [row] = await db`
      INSERT INTO public.clientes (
        nome, email, telefone, data_teste,
        melancolico, sanguineo, fleumatico, colerico,
        criado_em
      )
      VALUES (
        ${nome},
        ${email},
        ${telefone},
        CURRENT_DATE,
        ${perc.melancolico},
        ${perc.sanguineo},
        ${perc.fleumatico},
        ${perc.colerico},
        NOW()
      )
      ON CONFLICT (telefone)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        email = COALESCE(EXCLUDED.email, public.clientes.email),
        data_teste = CURRENT_DATE,
        melancolico = EXCLUDED.melancolico,
        sanguineo = EXCLUDED.sanguineo,
        fleumatico = EXCLUDED.fleumatico,
        colerico = EXCLUDED.colerico
      RETURNING
        id, nome, email, telefone, data_teste,
        melancolico, sanguineo, fleumatico, colerico,
        status_pagamento, status_cliente, valor_pago, criado_em
    `

    return NextResponse.json({ ok: true, cliente: row })
  } catch (e: any) {
    console.error(e)

    // erros comuns: constraint de soma, etc.
    return NextResponse.json(
      { error: "Erro ao salvar resultado" },
      { status: 500 }
    )
  }
}
