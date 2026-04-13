import postgres, { type Sql } from "postgres";

declare global {
  var __db__: Sql | undefined;
}

function createMissingEnvDbProxy(message: string) {
  const throwingHandler: ProxyHandler<CallableFunction> = {
    apply() {
      throw new Error(message);
    },
    get() {
      throw new Error(message);
    },
  };

  return new Proxy((() => undefined) as CallableFunction, throwingHandler) as Sql;
}

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return createMissingEnvDbProxy("DATABASE_URL nao definido");
  }

  const ssl = process.env.DATABASE_SSL === "true" ? ("require" as const) : false;
  const max = Number(process.env.DATABASE_POOL_SIZE ?? "10");

  return postgres(databaseUrl, {
    ssl,
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: (notice) => {
      // Suppress expected DDL idempotency notices (e.g. CREATE ... IF NOT EXISTS).
      if (notice?.code === "42P07") return;
      console.warn("Postgres notice:", notice.message);
    },
  });
}

export const db: Sql = globalThis.__db__ ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__db__ = db;
}
