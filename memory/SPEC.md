# NEXBIZ — Especificação viva

SaaS de gestão empresarial para pequenos negócios (pt-BR, moeda BRL). Modo demonstração:
sem autenticação real e sem pagamentos (pedido explícito do usuário).

## Stack
- Frontend: Vite + React 19 + TS strict + Tailwind v4 + shadcn/ui (base-nova), TanStack Query, recharts, sonner. Porta 3000.
- Backend: FastAPI + motor (Mongo db "app"), porta 8001; todas as rotas sob /api via api_router.
- Identidade: azul-marinho #0B132B/#0F172A, branco, azul royal #2563EB; fontes Plus Jakarta Sans (sans) + IBM Plex Mono (mono).

## Login demo (mock — nenhuma senha é verificada)
- Formulário aceita QUALQUER e-mail/senha; botão "Entrar com Conta Demo (Admin)" entra direto com:
- ana@nexbiz.com.br (Ana Souza, Administrador) — empresa NEXBIZ Comercial Ltda.
- Sessão mock em localStorage (chave "nexbiz.session"); logout limpa o cache do react-query.
- /cadastro cria conta+empresa (2 passos); e-mail duplicado → 409. Sem backend, cria sessão local.

## Dados demonstrativos (seed idempotente)
- `cd /app/backend && python seed.py` — recria as coleções demo: 1 company, 3 users, 18 products, 14 clients, 8 services, 46 sales nos últimos ~90 dias (~70% pagas, códigos VND-0001..VND-0046), 75 transactions (receitas espelhando vendas, despesas recorrentes mensais e 3 receitas futuras).
- `cd /app/backend && python export_demo.py` — regenera `frontend/src/lib/demo-data.ts` (fallback offline para o preview estático sem backend).
- IDs fixos de seed: emp-nexbiz-001, usr-00X, prd-00X, cli-00X, srv-00X, sal-00X, trx-00X.

## Rotas backend (todas sob /api, routers em backend/routers/)
- GET/PUT /company · GET /users
- POST /auth/login (mock) · POST /auth/register (cria Company+AppUser; 409 se e-mail existe)
- CRUD /products, /clients, /services (POST 201 · PUT /{id} · DELETE /{id})
- GET/POST /sales · PUT /sales/{id} — criar venda baixa estoque; status "pago" gera receita idempotente ("Venda VND-XXXX"); "cancelado" devolve estoque e remove a receita
- GET/POST/PUT/DELETE /transactions (?kind=receita|despesa) — 422 se amount ≤ 0 ou kind inválido

## Rotas frontend
- Públicas: / (landing) · /login · /cadastro
- App (guard de sessão mock em AppShell): /app (dashboard), /app/produtos, /app/vendas, /app/financeiro, /app/clientes, /app/servicos, /app/relatorios, /app/configuracoes
- Fallback offline: leituras sem backend exibem demo-data (nunca tela em branco); escritas sem backend mostram toast de erro.

## Fronteira de tipos (manual)
- backend/models/entities.py (Pydantic v2) ↔ frontend/src/lib/types.ts (interfaces TS) — manter em sincronia no mesmo lote.

## Preparado para o futuro
- Todo documento carrega company_id (multiempresa); auth mock isolado em routers/auth.py + lib/session.ts — ponto único para trocar por Supabase/auth real.
