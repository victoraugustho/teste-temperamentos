import postgres, { type Sql } from "postgres";

declare global {
  var __db__: Sql | undefined;
}

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não definido`);
  return v;
}

function createDb() {
  const DATABASE_URL = requiredEnv("DATABASE_URL");

  const ssl =
    process.env.DATABASE_SSL === "true" ? ("require" as const) : false;

  const max = Number(process.env.DATABASE_POOL_SIZE ?? "10");

  return postgres(DATABASE_URL, {
    ssl,
    max,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export const db: Sql = globalThis.__db__ ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__db__ = db;
}
