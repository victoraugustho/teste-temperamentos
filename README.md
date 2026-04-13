# Portal de Teste de Temperamentos

Projeto em Next.js com:
- fluxo público de teste por `slug` + `token` único com expiração;
- portal de gerenciamento autenticado (email/senha no banco);
- armazenamento de resultados vinculado ao `userId` do criador do teste;
- autenticação via JWT em cookie `httpOnly` e senha em hash `scrypt`.

## Requisitos de ambiente

Defina no `.env.development`:

```env
DATABASE_URL=postgresql://...
DATABASE_SSL=false
DATABASE_POOL_SIZE=10
PORTAL_JWT_SECRET=uma_chave_bem_longa_com_32_caracteres_ou_mais
```

## Rodando

```bash
npm install
npm run dev
```

## Criar usuário do portal manualmente no banco

1. Gere o hash da senha:

```bash
npm run hash:senha -- "SuaSenhaForteAqui"
```

2. Insira no banco (use o hash gerado):

```sql
INSERT INTO public.portal_users (email, password_hash, name, is_active)
VALUES ('voce@dominio.com', 'scrypt$...', 'Administrador', TRUE);
```

## Scripts SQL prontos (portal)

Arquivos:
- `scripts/db/001_portal_schema.sql` (tabelas + índices + constraints)
- `scripts/db/002_portal_seed_user.sql` (seed/update do usuário do portal)
- `scripts/db/003_portal_maintenance.sql` (rotina de manutenção para expiração)

Exemplo com `psql`:

```bash
psql "$DATABASE_URL" -f scripts/db/001_portal_schema.sql
psql "$DATABASE_URL" -f scripts/db/002_portal_seed_user.sql
```

Obs.: as tabelas também podem ser criadas automaticamente pela aplicação na primeira chamada das rotas do portal.

## Rotas principais

- Login do portal: `/portal/login`
- Dashboard do portal: `/portal`
- Teste público por slug: `/teste/{slug}`
- Questionário público: `/teste/{slug}/questionario`
- Resultado público por slug/id: `/resultado/{slug}/{id}`

## Segurança implementada

- JWT assinado em `httpOnly cookie` (`SameSite=Strict` no portal);
- hash de senha com `scrypt` + `timingSafeEqual`;
- token do teste armazenado no banco como hash SHA-256 (não em texto puro);
- controle de expiração e uso único (ou `maxUsos`);
- bloqueio de repetição por email/telefone no mesmo slug;
- rate limit básico em endpoints sensíveis (login e validação de token);
- headers de segurança HTTP no `next.config.ts`.
