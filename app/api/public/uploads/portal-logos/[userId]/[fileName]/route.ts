import { promises as fs } from "node:fs"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getPortalLogoUserDir } from "@/lib/portal/logo-upload"

export const runtime = "nodejs"

type Params = {
  params: Promise<{
    userId: string
    fileName: string
  }>
}

function parseUserId(raw: string) {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

function getMimeByFileName(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".webp")) return "image/webp"
  return null
}

function isSafeFileName(fileName: string) {
  return /^[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp)$/i.test(fileName)
}

export async function GET(_req: NextRequest, context: Params) {
  const { userId: rawUserId, fileName: rawFileName } = await context.params
  const userId = parseUserId(rawUserId)
  const fileName = String(rawFileName ?? "").trim()

  if (!userId || !isSafeFileName(fileName)) {
    return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 })
  }

  const contentType = getMimeByFileName(fileName)
  if (!contentType) {
    return NextResponse.json({ error: "Tipo de arquivo invalido." }, { status: 400 })
  }

  const absolutePath = path.join(getPortalLogoUserDir(userId), fileName)

  try {
    const file = await fs.readFile(absolutePath)
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(file.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: "Erro ao carregar arquivo." }, { status: 500 })
  }
}
