import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Package,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { lastMonths, monthlyRevenue, sum } from "@/lib/calc";
import { demoData } from "@/lib/demo-data";
import { formatBRL, formatNumber } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

// Dados demonstrativos embutidos (fallback offline) — a landing nunca depende de fetch.
const CHART_DATA = monthlyRevenue(demoData.sales, lastMonths(6));
const REVENUE_90D = sum(demoData.sales.filter((s) => s.status !== "cancelado").map((s) => s.total));
const SALES_COUNT = demoData.sales.filter((s) => s.status !== "cancelado").length;

const FEATURES = [
  { icon: ShoppingCart, title: "Vendas & PDV", text: "Registre pedidos em segundos, acompanhe pagamentos e o desempenho da equipe." },
  { icon: Package, title: "Estoque inteligente", text: "Alertas de reposição, estoque mínimo e baixa automática a cada venda." },
  { icon: Wallet, title: "Financeiro completo", text: "Contas a pagar e receber, fluxo de caixa e resultado mês a mês." },
  { icon: Users, title: "CRM de clientes", text: "Histórico de compras, contatos e oportunidades em um só lugar." },
  { icon: Wrench, title: "Serviços & OS", text: "Catálogo de serviços com precificação fixa ou por hora." },
  { icon: BarChart3, title: "Relatórios & BI", text: "Curva ABC, top produtos e exportação de dados em um clique." },
];

const PLANS = [
  { name: "Essencial", price: "79", desc: "Para quem está começando a organizar o negócio.", features: ["1 usuário", "Vendas + Estoque", "Relatórios essenciais", "Suporte por e-mail"], highlight: false },
  { name: "Profissional", price: "149", desc: "O completo para pequenas empresas em crescimento.", features: ["5 usuários", "Todos os módulos", "Relatórios avançados e exportação", "Suporte prioritário"], highlight: true },
  { name: "Corporativo", price: "299", desc: "Multiempresa e integrações para operações maiores.", features: ["Usuários ilimitados", "Gestão multiempresa", "API e integrações", "Gerente de conta"], highlight: false },
];

const TESTIMONIALS = [
  { quote: "Controle total do caixa pela primeira vez. Em vinte minutos o negócio inteiro estava mapeado.", name: "Fernanda Ribeiro", role: "Pet Amigo · São Paulo" },
  { quote: "O alerta de estoque me salvou de perder vendas na alta temporada. Vale cada centavo.", name: "Ricardo Alves", role: "Auto Peças Alves · Curitiba" },
  { quote: "Um financeiro que finalmente eu entendo: receitas, despesas e lucro na mesma tela.", name: "Camila Nunes", role: "Studio Design & Tech · Belo Horizonte" },
];

const DASHBOARD_IMG =
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=srgb&fm=jpg&q=85";
const FINANCE_IMG =
  "https://images.unsplash.com/photo-1748609160056-7b95f30041f0?crop=entropy&cs=srgb&fm=jpg&q=85";
const HERO_IMG =
  "https://images.unsplash.com/photo-1579389083046-e3df9c2b3325?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Landing() {
  const session = useSession();
  return (
    <div className="min-h-svh bg-background" data-testid="page-landing">
      {/* Navegação */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo to="/" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#recursos" className="transition-colors hover:text-foreground">Recursos</a>
            <a href="#modulos" className="transition-colors hover:text-foreground">Módulos</a>
            <a href="#planos" className="transition-colors hover:text-foreground">Planos</a>
            <a href="#depoimentos" className="transition-colors hover:text-foreground">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link to="/app" className={buttonVariants({ size: "sm" })} data-testid="nav-ir-painel">
                Ir para o painel <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })} data-testid="nav-entrar">
                  Entrar
                </Link>
                <Link to="/cadastro" className={buttonVariants({ size: "sm" })} data-testid="nav-criar-conta">
                  Criar conta grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B132B] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 85% 10%, rgba(37,99,235,0.35), transparent 70%), radial-gradient(500px 260px at 10% 90%, rgba(56,189,248,0.18), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <Badge className="border border-blue-400/30 bg-blue-500/15 text-blue-300" data-testid="badge-hero-novo">
              <Sparkles className="size-3" /> Novo · Gestão 4.0 para pequenos negócios
            </Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              A gestão do seu negócio,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">inteira em um só lugar</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Vendas, estoque, financeiro, clientes e serviços conectados em uma plataforma
              simples de usar — no computador e no celular.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/cadastro"
                className={buttonVariants({ size: "lg" })}
                data-testid="hero-cta-criar-conta"
              >
                Começar agora grátis <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/login"
                className={buttonVariants({ variant: "outline", size: "lg", className: "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" })}
                data-testid="hero-cta-demo"
              >
                Ver demonstração
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Sem cartão de crédito · Dados demonstrativos prontos · Pronto para multiempresa
            </p>
          </motion.div>

          {/* Cartão de prévia com KPIs (dados demo embutidos) */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <Card className="border-white/10 bg-white p-5 text-foreground shadow-2xl" data-testid="hero-kpi-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Painel do NEXBIZ</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> demonstração
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Faturamento · últimos 90 dias</p>
              <p className="font-mono text-3xl font-bold tracking-tight">{formatBRL(REVENUE_90D)}</p>
              <div className="mt-3 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={CHART_DATA} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip
                      formatter={(v: number) => formatBRL(v)}
                      contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="total" name="Faturamento" stroke="#2563EB" strokeWidth={2} fill="url(#hero-grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-center">
                <div>
                  <p className="font-mono text-lg font-bold">{formatNumber(SALES_COUNT)}</p>
                  <p className="text-[11px] text-muted-foreground">vendas</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-bold">{formatNumber(demoData.products.length)}</p>
                  <p className="text-[11px] text-muted-foreground">produtos</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-bold">{formatNumber(demoData.clients.length)}</p>
                  <p className="text-[11px] text-muted-foreground">clientes</p>
                </div>
              </div>
            </Card>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              className="absolute -right-3 -top-4 hidden rounded-xl border border-border bg-white p-3 shadow-lg sm:block"
              data-testid="hero-float-estoque"
            >
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                <Package className="size-3.5" /> 4 produtos com estoque baixo
              </p>
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-3 hidden rounded-xl border border-border bg-white p-3 shadow-lg sm:block"
              data-testid="hero-float-vendas"
            >
              <p className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <TrendingUp className="size-3.5" /> Vendas em crescimento este mês
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Faixa de números */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            ["+2.400", "empresas ativas"],
            ["R$ 8,7 bi", "movimentados por ano"],
            ["98%", "de satisfação"],
            ["4,9/5", "avaliação média"],
          ].map(([value, label], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="text-center"
            >
              <p className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="bg-[#F8FAFC] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Recursos</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Tudo o que a sua empresa precisa, sem planilhas</h2>
            <p className="mt-3 text-muted-foreground">
              Módulos que conversam entre si: uma venda dá baixa no estoque e entra no financeiro automaticamente.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <Card className="group h-full border-border/80 p-6 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Módulos em destaque (com imagens) */}
      <section id="modulos" className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
          <ShowcaseRow
            img={DASHBOARD_IMG}
            alt="Painéis e indicadores do NEXBIZ"
            tag="Dashboards"
            title="Decida com dados, não com achismo"
            bullets={[
              "Faturamento, ticket médio e saldo do mês na primeira tela",
              "Alertas de estoque baixo antes de perder a venda",
              "Relatórios com curva ABC e top produtos",
            ]}
            testId="showcase-dashboards"
          />
          <ShowcaseRow
            reverse
            img={FINANCE_IMG}
            alt="Gestão financeira no celular com NEXBIZ"
            tag="Financeiro"
            title="O caixa sob controle — de qualquer lugar"
            bullets={[
              "Contas a pagar e receber com lembretes de vencimento",
              "Fluxo de caixa realizado mês a mês",
              "Funciona perfeitamente no celular",
            ]}
            testId="showcase-financeiro"
          />
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-[#F8FAFC] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Planos</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Preço simples, sem surpresa</h2>
            <p className="mt-3 text-muted-foreground">Comece grátis e evolua conforme o seu negócio cresce.</p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <Card
                  className={cn(
                    "relative h-full p-6",
                    plan.highlight && "border-primary shadow-lg ring-1 ring-primary/20",
                  )}
                  data-testid={`plano-${plan.name.toLowerCase()}`}
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-white">Mais popular</Badge>
                  )}
                  <h3 className="text-base font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                  <p className="mt-4">
                    <span className="font-mono text-4xl font-bold tracking-tight">R$ {plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/cadastro"
                    className={buttonVariants({
                      variant: plan.highlight ? "default" : "outline",
                      className: "mt-6 w-full",
                    })}
                    data-testid={`plano-${plan.name.toLowerCase()}-cta`}
                  >
                    Começar com {plan.name}
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Depoimentos</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Quem usa, recomenda</h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="rounded-xl border border-border/80 bg-[#F8FAFC] p-6"
                data-testid={`depoimento-${i + 1}`}
              >
                <div className="flex gap-1 text-amber-400" aria-label="5 estrelas">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Sparkles key={s} className="size-3.5" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-foreground">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{t.name}</span> · {t.role}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden bg-[#0B132B] py-16 text-center text-white lg:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(500px 240px at 50% 0%, rgba(37,99,235,0.4), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pronto para organizar o seu negócio?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Crie a sua conta em minutos e explore o NEXBIZ com dados demonstrativos completos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/cadastro" className={buttonVariants({ size: "lg" })} data-testid="cta-final-criar-conta">
              Criar conta grátis <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className={buttonVariants({ variant: "outline", size: "lg", className: "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" })}
              data-testid="cta-final-demo"
            >
              Entrar com conta demo
            </Link>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-white/10 bg-[#080E20] py-12 text-slate-400">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-1">
            <Logo onDark />
            <p className="mt-4 max-w-xs text-xs leading-relaxed">
              Sistema de gestão empresarial para pequenos negócios. Ambiente de demonstração —
              dados fictícios, autenticação e pagamentos em modo demonstração.
            </p>
          </div>
          <FooterCol
            title="Produto"
            links={[["Recursos", "#recursos"], ["Módulos", "#modulos"], ["Planos", "#planos"], ["Depoimentos", "#depoimentos"]]}
          />
          <FooterCol
            title="Módulos"
            links={[["Vendas", "/app/vendas"], ["Produtos e estoque", "/app/produtos"], ["Financeiro", "/app/financeiro"], ["Relatórios", "/app/relatorios"]]}
          />
          <FooterCol title="Segurança" custom={<SecurityNote />} />
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-6 text-xs sm:px-6 lg:px-8">
          © {new Date().getFullYear()} NEXBIZ · Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
}

function ShowcaseRow({
  img,
  alt,
  tag,
  title,
  bullets,
  reverse = false,
  testId,
}: {
  img: string;
  alt: string;
  tag: string;
  title: string;
  bullets: string[];
  reverse?: boolean;
  testId?: string;
}) {
  return (
    <div className={cn("grid items-center gap-10 lg:grid-cols-2", testId)} data-testid={testId}>
      <div className={cn(reverse && "lg:order-2")}>
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">{tag}</Badge>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h3>
        <ul className="mt-5 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={cn("overflow-hidden rounded-2xl border border-border shadow-lg", reverse && "lg:order-1")}>
        <img src={img} alt={alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
      </div>
    </div>
  );
}

function FooterCol({ title, links, custom }: { title: string; links?: [string, string][]; custom?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      {links ? (
        <ul className="mt-4 space-y-2.5 text-sm">
          {links.map(([label, href]) => (
            <li key={label}>
              {href.startsWith("/") ? (
                <Link to={href} className="transition-colors hover:text-white">{label}</Link>
              ) : (
                <a href={href} className="transition-colors hover:text-white">{label}</a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        custom
      )}
    </div>
  );
}

function SecurityNote() {
  return (
    <ul className="mt-4 space-y-2.5 text-sm">
      <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-blue-400" /> Dados da sua empresa isolados</li>
      <li className="flex items-center gap-2"><Smartphone className="size-4 text-blue-400" /> 100% responsivo</li>
      <li className="flex items-center gap-2"><ShoppingBag className="size-4 text-blue-400" /> Multiempresa na arquitetura</li>
    </ul>
  );
}
