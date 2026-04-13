BEGIN;

ALTER TABLE public.portal_user_branding
ADD COLUMN IF NOT EXISTS logo_background TEXT NOT NULL DEFAULT 'dark';

ALTER TABLE public.portal_user_branding
DROP CONSTRAINT IF EXISTS portal_user_branding_logo_background_check;

ALTER TABLE public.portal_user_branding
ADD CONSTRAINT portal_user_branding_logo_background_check
CHECK (logo_background IN ('dark', 'light'));

COMMIT;
