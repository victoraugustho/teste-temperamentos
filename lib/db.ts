// lib/db.ts
import postgres from "postgres"

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não definido no .env")
}

// OBS: em produção, você pode ajustar ssl conforme seu provedor.
// Se estiver em VPS com Postgres local, geralmente ssl: false está ok.
export const db = postgres(DATABASE_URL, {
  ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
  max: Number(process.env.DATABASE_POOL_SIZE ?? "10"),
  idle_timeout: 20,
  connect_timeout: 10,
})
