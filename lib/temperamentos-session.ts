import { cookies } from "next/headers"

export type TempUser = {
  nome: string
  email: string
  telefone?: string
  createdAt: number
}

export type TempResult = unknown

function decodeBase64Json<T>(value?: string | null): T | null {
  if (!value) return null
  try {
    const json = Buffer.from(value, "base64").toString("utf-8")
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export async function getTemperamentosUser(): Promise<TempUser | null> {
  const c = await cookies()
  return decodeBase64Json<TempUser>(c.get("temp_user")?.value)
}

export async function getTemperamentosResult<T = unknown>(): Promise<T | null> {
  const c = await cookies()
  return decodeBase64Json<T>(c.get("temp_result")?.value)
}
