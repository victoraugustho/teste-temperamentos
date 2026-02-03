import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type Payload = {
  nome: string
  email: string
  telefone?: string
}

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "")
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload

    const nome = (body.nome ?? "").trim()
    const email = (body.email ?? "").trim().toLowerCase()
    const telefone = onlyDigits(body.telefone ?? "")

    if (!nome || !email) {
      return NextResponse.json({ error: "Nome e email são obrigatórios." }, { status: 400 })
    }

    // cookie compactado (evita estourar limite)
    const session = {
      nome,
      email,
      telefone,
      createdAt: Date.now(),
    }

    const res = NextResponse.json({ ok: true })

    // 7 dias
    res.cookies.set("temp_user", Buffer.from(JSON.stringify(session)).toString("base64"), {
      httpOnly: true,
      sameSite: "lax",
      secure: true, // em prod HTTPS
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erro ao iniciar sessão." }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set("temp_user", "", { path: "/", maxAge: 0 })
  res.cookies.set("temp_result", "", { path: "/", maxAge: 0 })
  return res
}
