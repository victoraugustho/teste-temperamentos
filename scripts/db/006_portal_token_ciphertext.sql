BEGIN;

ALTER TABLE IF EXISTS public.portal_tests
  ADD COLUMN IF NOT EXISTS token_ciphertext TEXT;

COMMIT;
