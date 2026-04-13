BEGIN;

CREATE TABLE IF NOT EXISTS public.portal_user_branding (
  owner_user_id BIGINT PRIMARY KEY REFERENCES public.portal_users(id) ON DELETE CASCADE,
  brand_name TEXT,
  logo_url TEXT,
  logo_background TEXT NOT NULL DEFAULT 'dark' CHECK (logo_background IN ('dark', 'light')),
  hero_title TEXT,
  hero_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
