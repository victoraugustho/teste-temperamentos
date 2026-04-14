import { NextResponse } from "next/server"

export const runtime = "nodejs"

function disabledResponse() {
  return NextResponse.json(
    {
      error:
        "Fluxo público desativado. Acesse /portal/login e utilize os links gerados no portal.",
    },
    { status: 410 },
  )
}

export async function POST() {
  return disabledResponse()
}

export async function DELETE() {
  return disabledResponse()
}
