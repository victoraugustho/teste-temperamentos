-- Marcar testes expirados como expired
UPDATE public.portal_tests
SET
  status = 'expired',
  updated_at = NOW()
WHERE status = 'active'
  AND expires_at < NOW();

-- Opcional: listar estado geral de testes
-- SELECT id, slug, status, expires_at, used_count, max_uses
-- FROM public.portal_tests
-- ORDER BY created_at DESC;
