-- 1) Gere o hash da senha localmente:
-- npm run hash:senha -- "SuaSenhaForteAqui"
--
-- 2) Cole o hash no lugar de 'COLE_O_HASH_AQUI'

INSERT INTO public.portal_users (
  email,
  password_hash,
  name,
  is_active
)
VALUES (
  'gomesvictor46@gmail.com',
  '$16384$8$1$494e44b10c7598422db45e71145387f4$f0dfd30b566a7a77d7d8f5634953bdc2dee1374870752cf9de81ee32fbd3b100002ace371730622d20f4d5fb176cf366bf17f8e1dbee3cbfd0231d971c10bb87',
  'Administrador',
  TRUE
)
ON CONFLICT (email)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  is_active = TRUE,
  updated_at = NOW();
