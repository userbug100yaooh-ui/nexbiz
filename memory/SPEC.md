# NEXBIZ — Especificação viva

SaaS de gestão empresarial para pequenos negócios (pt-BR, moeda BRL). Modo demonstração:
sem autenticação real e sem pagamentos (pedido explícito do usuário).

## Stack
- Frontend: Vite + React 19 + TS strict + Tailwind v4 + shadcn/ui (base-nova), TanStack Query, recharts, sonner. Porta 3000.
- Backend: FastAPI + motor (Mongo db "app"), porta 8001; todas as rotas sob /api via api_router.
- Identidade: azul-marinho #0B132B/#0F172A, branco, azul royal #2563EB; fontes Plus Jakarta Sans (sans) + IBM Plex Mono (mono).

## Autenticação (Supabase + modo demonstração)
- Login real: POST /api/auth/login → Supabase sign_in_with_password; cookies httpOnly `nexbiz_access`/`nexbiz_refresh` (Secure, SameSite=Lax). Tokens nunca no JSON nem no localStorage.
- Cadastro real: POST /api/auth/register → Supabase sign_up + cria Company + AppUser(supabase_user_id) no Mongo. Se o projeto exige confirmação de e-mail, retorna email_confirmation_required=true (frontend manda para /login).
- Demo: POST /api/auth/demo → cookie `nexbiz_demo=1`, empresa seed emp-nexbiz-001 (usuário usr-001 = pintopinto.yaooh@gmail.com).
- GET /api/auth/me (401 se sem sessão) · POST /api/auth/logout (204, limpa cookies).
- lib/tenant.py: middleware resolve cookie → Ctx(company_id) num ContextVar; routers.common.get_company() exige Ctx (401 sem sessão). Sessão Supabase inválida nunca cai no demo. Refresh automático pelo refresh token.
- Sem SUPABASE_URL/SUPABASE_ANON_KEY → login/cadastro reais respondem 503 com mensagem clara; demo segue funcionando.
- Projeto Supabase do usuário EXIGE confirmação de e-mail: cadastro → 201 com email_confirmation_required=true e sem cookies; login antes de confirmar → 403 "Confirme seu e-mail…". Senha errada → 401. E-mail duplicado → 409.
- lib/supabase_auth._project_url() corrige automaticamente "<ref>.supabase.com" → "<ref>.supabase.co" (a URL salva usava .com). Falha de rede/DNS ou "Invalid API key" → 503 (nunca "senha incorreta").
- Frontend guarda só o perfil (nexbiz.session) para render; AppShell revalida /auth/me e, em 401, limpa e volta ao /login. Erro de rede (preview estático) → modo offline com demo-data.
- Para testes via curl: `curl -c jar -X POST /api/auth/demo` e depois `-b jar` nas rotas de negócio.

## Login demo (legado — substituído pela seção acima)
- Formulário aceita QUALQUER e-mail/senha; botão "Entrar com Conta Demo (Admin)" entra direto com:
- ana@nexbiz.com.br → substituído: admin demo agora é pintopinto.yaooh@gmail.com (Administrador NEXBIZ) — empresa NEXBIZ Comercial Ltda.
- Sessão mock em localStorage (chave "nexbiz.session"); logout limpa o cache do react-query.
- /cadastro cria conta+empresa (2 passos); e-mail duplicado → 409. Sem backend, cria sessão local.

## Dados demonstrativos (seed idempotente)
- `cd /app/backend && python seed.py` — recria as coleções demo: 1 company, 3 users, 18 products, 14 clients, 8 services, 10 service_orders (OS-0001..OS-0010, 4 concluídas, 3 abertas, 2 em andamento, 1 cancelada), 46 sales nos últimos ~90 dias (~70% pagas, códigos VND-0001..VND-0046), 79 transactions.
- `cd /app/backend && python export_demo.py` — regenera `frontend/src/lib/demo-data.ts` (fallback offline para o preview estático sem backend).
- IDs fixos de seed: emp-nexbiz-001, usr-00X, prd-00X, cli-00X, srv-00X, sal-00X, trx-00X.

## Rotas backend (todas sob /api, routers em backend/routers/)
- GET/PUT /company · GET /users
- POST /auth/login (mock) · POST /auth/register (cria Company+AppUser; 409 se e-mail existe)
- CRUD /products, /clients, /services (POST 201 · PUT /{id} · DELETE /{id})
- GET/POST /sales · PUT /sales/{id} — criar venda baixa estoque; status "pago" gera receita idempotente ("Venda VND-XXXX"); "cancelado" devolve estoque e remove a receita
- GET/POST/PUT/DELETE /transactions (?kind=receita|despesa) — 422 se amount ≤ 0 ou kind inválido
- GET/POST /service-orders · PUT/DELETE /service-orders/{id} — status aberta|em_andamento|concluida|cancelada; concluir gera receita "OS OS-XXXX" (pendente, categoria Serviços); cancelar/excluir remove essa receita; serviço inexistente → 404; código = maior existente + 1
- POST /import/{products|clients} (multipart "file", CSV ou XLSX) — cabeçalhos pt-BR com/sem acento, números "1.234,56"; retorna {created, skipped, total}; sem coluna Nome → 422; produto sem preço é ignorado

## Rotas frontend
- Públicas: / (landing) · /login · /cadastro
- App (guard de sessão mock em AppShell): /app (dashboard), /app/produtos, /app/vendas, /app/financeiro, /app/clientes, /app/servicos, /app/ordens-servico, /app/relatorios, /app/configuracoes
- Importar planilha: botão em Produtos e Clientes (dialog com arrastar-e-soltar + planilha modelo para baixar)
- PDF (jspdf + autotable, gerado no navegador): "Exportar PDF" em Relatórios (resumo, faturamento mensal, curva ABC, categorias) e em Ordens de Serviço
- Fallback offline: leituras sem backend exibem demo-data (nunca tela em branco); escritas sem backend mostram toast de erro.

## Fronteira de tipos (manual)
- backend/models/entities.py (Pydantic v2) ↔ frontend/src/lib/types.ts (interfaces TS) — manter em sincronia no mesmo lote.

## Preparado para o futuro
- Todo documento carrega company_id (multiempresa); auth mock isolado em routers/auth.py + lib/session.ts — ponto único para trocar por Supabase/auth real.
