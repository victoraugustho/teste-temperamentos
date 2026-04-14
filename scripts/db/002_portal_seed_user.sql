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
  'matrizsuaessencia@gmail.com',
  'scrypt$16384$8$1$26518104f91e2076d78eb17e387f6b68$5bc14b917f48f4b12f9d9cf905c0b7b2f20e8db0937ae9f10eb1645ffd6cb899127586f535609ff7ebfd0a09110b310ed61d2e2021355f206d89fc21f45e09b1',
  'Juliana Barbosa',
  TRUE
)
ON CONFLICT (email)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  is_active = TRUE,
  updated_at = NOW();
