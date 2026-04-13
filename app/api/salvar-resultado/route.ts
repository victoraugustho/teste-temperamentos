import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseScores, toPercentages } from "@/lib/temperamentos-scores";
import { normalizeEmail, normalizeName, normalizePhone } from "@/lib/portal/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const nome = normalizeName(body.nome);
    const email = normalizeEmail(body.email);
    const telefone = normalizePhone(body.telefone);
    const scores = parseScores(body.scores);

    if (!nome || !telefone || !scores) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, telefone, scores" },
        { status: 400 },
      );
    }

    const perc = toPercentages(scores);

    const result = await db`
      INSERT INTO public.clientes (
        nome,
        email,
        telefone,
        data_teste,
        melancolico,
        sanguineo,
        fleumatico,
        colerico,
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
        id,
        nome,
        email,
        telefone,
        data_teste,
        melancolico,
        sanguineo,
        fleumatico,
        colerico,
        status_pagamento,
        status_cliente,
        valor_pago,
        criado_em
    `;

    return NextResponse.json({ ok: true, cliente: result[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao salvar resultado" },
      { status: 500 },
    );
  }
}
