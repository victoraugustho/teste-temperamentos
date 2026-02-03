import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const tempUser = cookieStore.get("temp_user")?.value
    if (!tempUser) return NextResponse.json({ error: "Sem sessão." }, { status: 401 })

    const body = await req.json()
    // body: { scores, pedidoId?, usuarioId? ... }

    const res = NextResponse.json({ ok: true })

    res.cookies.set("temp_result", Buffer.from(JSON.stringify(body)).toString("base64"), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erro ao salvar resultado." }, { status: 500 })
  }
}
