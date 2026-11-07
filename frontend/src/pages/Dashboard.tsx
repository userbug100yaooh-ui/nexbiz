import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CreditCard, DollarSign, Package, ShoppingCart, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, saleStatusMeta, STOCK_META } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHART_COLORS, expenseByCategory, lastMonths, monthlyCashflow, monthlyRevenue, round2, stockStatus, sum } from "@/lib/calc";
import { formatBRL, formatDate, formatDateTime, formatNumber, trendPercent } from "@/lib/format";
import { useCompany, useProducts, useSales, useTransactions } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function Dashboard() {
  const session = useSession();
  const { data: company } = useCompany();
  const { data: sales = [] } = useSales();
  const { data: transactions = [] } = useTransactions();
  const { data: products = [] } = useProducts();

  const months = useMemo(() => lastMonths(6), []);
  const current = months[months.length - 1];
  const previous = months[months.length - 2];

  const revenueSeries = useMemo(() => monthlyRevenue(sales, months), [sales, months]);
  const flow = useMemo(() => monthlyCashflow(transactions, months), [transactions, months]);

  const validSales = sales.filter((s) => s.status !== "cancelado");
  const salesMonth = validSales.filter((s) => s.created_at.slice(0, 7) === current);
  const salesPrev = validSales.filter((s) => s.created_at.slice(0, 7) === previous);

  const revenueMonth = sum(salesMonth.map((s) => s.total));
  const revenuePrev = sum(salesPrev.map((s) => s.total));
  const ticketMonth = salesMonth.length > 0 ? round2(revenueMonth / salesMonth.length) : 0;
  const ticketPrev = salesPrev.length > 0 ? round2(revenuePrev / salesPrev.length) : 0;

  const flowMonth = flow[flow.length - 1];
  const flowPrev = flow[flow.length - 2];

  const despesaData = useMemo(() => {
    const inMonth = expenseByCategory(transactions.filter((t) => t.due_date.slice(0, 7) === current));
    return inMonth.length > 0 ? inMonth : expenseByCategory(transactions);
  }, [transactions, current]);

  const lowStock = products.filter((p) => stockStatus(p) !== "ok");
  const recent = sales.slice(0, 6);

  return (
    <div data-testid="page-dashboard">
      <PageHeader
        title={`Olá, ${session?.user.name.split(" ")[0] ?? "bem-vindo"}`}
        description={`Visão geral de ${company?.name ?? "sua empresa"} — dados atualizados em tempo real.`}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Faturamento do mês"
          value={formatBRL(revenueMonth)}
          icon={DollarSign}
          trend={trendPercent(revenueMonth, revenuePrev)}
          hint="vs mês anterior"
          index={0}
          testId="stat-faturamento-mes"
        />
        <StatCard
          label="Vendas no mês"
          value={formatNumber(salesMonth.length)}
          icon={ShoppingCart}
          trend={trendPercent(salesMonth.length, salesPrev.length)}
          hint={`ticket médio ${formatBRL(ticketMonth)}`}
          index={1}
          testId="stat-vendas-mes"
        />
        <StatCard
          label="Despesas pagas no mês"
          value={formatBRL(flowMonth?.despesas ?? 0)}
          icon={CreditCard}
          trend={trendPercent(flowMonth?.despesas ?? 0, flowPrev?.despesas ?? 0)}
          hint="vs mês anterior"
          index={2}
          testId="stat-despesas-mes"
        />
        <StatCard
          label="Saldo do mês"
          value={formatBRL((flowMonth?.receitas ?? 0) - (flowMonth?.despesas ?? 0))}
          icon={Wallet}
          trend={trendPercent((flowMonth?.receitas ?? 0) - (flowMonth?.despesas ?? 0), (flowPrev?.receitas ?? 0) - (flowPrev?.despesas ?? 0))}
          hint="recebido − pago"
          index={3}
          testId="stat-saldo-mes"
        />
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} className="lg:col-span-3">
          <Card className="p-5" data-testid="card-grafico-faturamento">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Faturamento por mês</h2>
                <p className="text-xs text-muted-foreground">Vendas concluídas e pendentes, sem cancelamentos</p>
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dash-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                  <YAxis
                    tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    width={44}
                  />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" name="Faturamento" stroke="#2563EB" strokeWidth={2} fill="url(#dash-grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }} className="lg:col-span-2">
          <Card className="p-5" data-testid="card-grafico-despesas">
            <h2 className="text-sm font-bold">Despesas por categoria</h2>
            <p className="text-xs text-muted-foreground">Distribuição do gasto da empresa</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={despesaData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                      {despesaData.map((entry, i) => (
                        <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {despesaData.slice(0, 6).map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2 text-xs" data-testid={`despesa-legenda-${i}`}>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate text-muted-foreground">{d.name}</span>
                    <span className="ml-auto font-mono font-semibold">{formatBRL(d.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Vendas recentes + estoque baixo */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }} className="lg:col-span-3">
          <Card className="p-5" data-testid="card-vendas-recentes">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Vendas recentes</h2>
              <Link to="/app/vendas" className="text-xs font-semibold text-primary hover:underline" data-testid="dashboard-ver-todas-vendas">
                Ver todas
              </Link>
            </div>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((s) => {
                  const meta = saleStatusMeta(s.status);
                  return (
                    <TableRow key={s.id} data-testid={`dashboard-venda-${s.code}`}>
                      <TableCell className="font-mono text-xs font-semibold">{s.code}</TableCell>
                      <TableCell className="max-w-36 truncate">{s.client_name}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDateTime(s.created_at)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(s.total)}</TableCell>
                      <TableCell>
                        <StatusBadge tone={meta.tone} testId={`dashboard-venda-status-${s.code}`}>{meta.label}</StatusBadge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.35 }} className="lg:col-span-2">
          <Card className="p-5" data-testid="card-estoque-baixo">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Estoque baixo</h2>
              <Link to="/app/produtos" className="text-xs font-semibold text-primary hover:underline" data-testid="dashboard-ver-produtos">
                Gerenciar
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">Itens que precisam de reposição</p>
            <div className="mt-4 space-y-2">
              {lowStock.length === 0 ? (
                <p className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" data-testid="estoque-saudavel">
                  Todos os produtos com estoque saudável.
                </p>
              ) : (
                lowStock.slice(0, 6).map((p) => {
                  const meta = STOCK_META[stockStatus(p)];
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2" data-testid={`estoque-alerta-${p.id}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.stock} {p.unit} · mínimo {p.min_stock}
                        </p>
                      </div>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </div>
                  );
                })
              )}
            </div>
            <Link to="/app/produtos" className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted" data-testid="dashboard-cta-produtos">
              <Package className="size-3.5" /> Ir para Produtos e Estoque
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
