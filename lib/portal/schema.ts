import { db } from "@/lib/db";

const PORTAL_SCHEMA_VERSION = 2;

declare global {
  var __portal_schema_ready__: boolean | undefined;
  var __portal_schema_version__: number | undefined;
  var __portal_schema_promise__: Promise<void> | null | undefined;
}

function isSchemaReady() {
  return (globalThis.__portal_schema_version__ ?? 0) >= PORTAL_SCHEMA_VERSION;
}

function getSchemaPromise() {
  return globalThis.__portal_schema_promise__ ?? null;
}

function setSchemaPromise(promise: Promise<void> | null) {
  globalThis.__portal_schema_promise__ = promise;
}

function markSchemaReady() {
  globalThis.__portal_schema_ready__ = true;
  globalThis.__portal_schema_version__ = PORTAL_SCHEMA_VERSION;
}

export async function ensurePortalSchema() {
  if (isSchemaReady()) return;
  const existingPromise = getSchemaPromise();
  if (existingPromise) return existingPromise;

  const currentPromise = (async () => {
    await db`
      CREATE TABLE IF NOT EXISTS public.portal_users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS public.portal_tests (
        id BIGSERIAL PRIMARY KEY,
        owner_user_id BIGINT NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        title TEXT,
        token_hash TEXT NOT NULL UNIQUE,
        token_hint TEXT NOT NULL,
        token_ciphertext TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
        used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
        used_email TEXT,
        used_phone TEXT,
        used_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (owner_user_id, slug)
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_portal_tests_owner_slug
      ON public.portal_tests (owner_user_id, slug)
    `;

    await db`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_tests_slug
      ON public.portal_tests (slug)
    `;

    await db`
      ALTER TABLE public.portal_tests
      ADD COLUMN IF NOT EXISTS token_ciphertext TEXT
    `;

    await db`
      CREATE TABLE IF NOT EXISTS public.portal_user_branding (
        owner_user_id BIGINT PRIMARY KEY REFERENCES public.portal_users(id) ON DELETE CASCADE,
        brand_name TEXT,
        logo_url TEXT,
        logo_background TEXT NOT NULL DEFAULT 'dark' CHECK (logo_background IN ('dark', 'light')),
        hero_title TEXT,
        hero_description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      ALTER TABLE public.portal_user_branding
      ADD COLUMN IF NOT EXISTS logo_background TEXT NOT NULL DEFAULT 'dark'
    `;

    await db`
      CREATE TABLE IF NOT EXISTS public.portal_clients (
        id BIGSERIAL PRIMARY KEY,
        owner_user_id BIGINT NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        normalized_email TEXT,
        normalized_phone TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_portal_clients_owner_email
      ON public.portal_clients (owner_user_id, normalized_email)
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_portal_clients_owner_phone
      ON public.portal_clients (owner_user_id, normalized_phone)
    `;

    await db`
      CREATE TABLE IF NOT EXISTS public.portal_results (
        id BIGSERIAL PRIMARY KEY,
        owner_user_id BIGINT NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
        client_id BIGINT REFERENCES public.portal_clients(id) ON DELETE SET NULL,
        test_id BIGINT NOT NULL REFERENCES public.portal_tests(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        nome TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        normalized_email TEXT,
        normalized_phone TEXT,
        melancolico NUMERIC(5,2) NOT NULL,
        sanguineo NUMERIC(5,2) NOT NULL,
        fleumatico NUMERIC(5,2) NOT NULL,
        colerico NUMERIC(5,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (test_id)
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_portal_results_owner_slug
      ON public.portal_results (owner_user_id, slug, created_at DESC)
    `;

    await db`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_results_owner_slug_email
      ON public.portal_results (owner_user_id, slug, normalized_email)
      WHERE normalized_email IS NOT NULL
    `;

    await db`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_results_owner_slug_phone
      ON public.portal_results (owner_user_id, slug, normalized_phone)
      WHERE normalized_phone IS NOT NULL
    `;

    markSchemaReady();
  })().finally(() => {
    setSchemaPromise(null);
  });

  setSchemaPromise(currentPromise);
  return currentPromise;
}
