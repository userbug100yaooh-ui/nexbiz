import { useMemo, useState } from "react";
import { Download, Percent, ShoppingCart, Ticket, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHART_COLORS, expenseByCategory, lastMonths, monthlyRevenue, round2, sum, topProducts } from "@/lib/calc";
import { addDaysISO, formatBRL, formatDate, formatNumber, todayISO } from "@/lib/format";
import { useProducts, useSales, useTransactions } from "@/lib/queries";
import { cn } from "@/lib/utils";

const ABC_CLASS: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  A: { label: "Classe A — prioritários", tone: "success" },
  B: { label: "Classe B — intermediários", tone: "warning" },
  C: { label: "Classe C — marginais", tone: "danger" },
};

export default function Relatorios() {
  const { data: sales = [] } = useSales();
  const { data: products = [] } = useProducts();
  const { data: transactions = [] } = useTransactions();

  const [days, setDays] = useState("90");

  const periodStart = addDaysISO(todayISO(), -Number(days));
  const salesInPeriod = useMemo(
    () => sales.filter((s) => s.status !== "cancelado" && s.created_at.slice(0, 10) >= periodStart),
    [sales, periodStart],
  );
  const trxsInPeriod = useMemo(() => transactions.filter((t) => t.due_date >= periodStart), [transactions, periodStart]);

  const months = useMemo(() => lastMonths(Math.floor(Number(days) / 30) + 1), [days]);
  const monthlyData = useMemo(() => monthlyRevenue(salesInPeriod, months), [salesInPeriod, months]);

  const revenue = sum(salesInPeriod.map((s) => s.total));
  const ticket = salesInPeriod.length > 0 ? round2(revenue / salesInPeriod.length) : 0;
  const costMap = useMemo(() => new Map(products.map((p) => [p.id, p.cost])), [products]);
  const cogs = sum(salesInPeriod.flatMap((s) => s.items.map((i) => i.qty * (costMap.get(i.product_id) ?? 0))));
  const margin = revenue > 0 ? round2(((revenue - cogs) / revenue) * 100) : 0;

  const topData = useMemo(() => topProducts(salesInPeriod, 5), [salesInPeriod]);

  const categoryById = useMemo(() => new Map(products.map((p) => [p.id, p.category])), [products]);
  const categoryData = useMemo(() => {
    const agg = new Map<string, number>();
    for (const s of salesInPeriod) {
      for (const i of s.items) {
        const cat = categoryById.get(i.product_id) ?? "Outros";
        agg.set(cat, round2((agg.get(cat) ?? 0) + i.total));
      }
    }
    return [...agg.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [salesInPeriod, categoryById]);

  // Curva ABC: % acumulada da receita por produto
  const abc = useMemo(() => {
    const list = topProducts(salesInPeriod, 100);
    const totalRev = sum(list.map((t) => t.revenue));
    let acc = 0;
    return list.map((t, i) => {
      acc += t.revenue;
      const cumShare = totalRev > 0 ? (acc / totalRev) * 100 : 0;
      return { rank: i + 1, name: t.name, qty: t.qty, revenue: t.revenue, cumShare: round2(cumShare), klass: cumShare <= 80 ? "A" : cumShare <= 95 ? "B" : "C" };
    });
  }, [salesInPeriod]);

  const recebido = sum(trxsInPeriod.filter((t) => t.kind === "receita" && t.paid).map((t) => t.amount));
  const pago = sum(trxsInPeriod.filter((t) => t.kind === "despesa" && t.paid).map((t) => t.amount));

  const exportCsv = () => {
    const rows = [
      ["codigo", "cliente", "data", "itens", "total", "status"],
      ...salesInPeriod.map((s) => [s.code, s.client_name, s.created_at.slice(0, 10), String(s.items.length), s.total.toFixed(2).replace(".", ","), s.status]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexbiz-relatorio-vendas.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado em CSV!");
  };

  return (
    <div data-testid="page-relatorios">
      <PageHeader title="Relatórios & BI" description="Desempenjo de vendas, produtos e resultado do negócio.">
        <Select value={days} onValueChange={(v: string) => setDays(v)}>
          <SelectTrigger className="w-40" data-testid="select-periodo-relatorios">
            <SelectValue>{(v: string) => `Últimos ${v} dias`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv} data-testid="btn-exportar-csv">
          <Download className="size-4" /> Exportar CSV
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Faturamento (${days} dias)`} value={formatBRL(revenue)} icon={TrendingUp} index={0} testId="stat-rel-faturamento" />
        <StatCard label="Vendas concluídas" value={formatNumber(salesInPeriod.length)} icon={ShoppingCart} index={1} testId="stat-rel-vendas" />
        <StatCard label="Ticket médio" value={formatBRL(ticket)} icon={Ticket} index={2} testId="stat-rel-ticket" />
        <StatCard label="Margem bruta estimada" value={`${formatNumber(margin, 1)}%`} icon={Percent} hint={`custo: ${formatBRL(round2(cogs))}`} index={3} testId="stat-rel-margem" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5" data-testid="card-rel-vendas-mes">
          <h2 className="text-sm font-bold">Vendas por mês</h2>
          <p className="text-xs text-muted-foreground">Faturamento no período selecionado</p>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis
                  tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  width={44}
                />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                <Bar dataKey="total" name="Faturamento" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5" data-testid="card-rel-top-produtos">
          <h2 className="text-sm font-bold">Top 5 produtos</h2>
          <p className="text-xs text-muted-foreground">Maiores receitas no período</p>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                <Bar dataKey="revenue" name="Receita" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={16}>
                  {topData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % 2 === 0 ? i : i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2" data-testid="card-rel-categorias">
          <h2 className="text-sm font-bold">Receita por categoria</h2>
          <p className="text-xs text-muted-foreground">Participação das categorias do catálogo</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2} strokeWidth={0}>
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {categoryData.slice(0, 6).map((d, i) => (
                <li key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="truncate text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-mono font-semibold">{formatBRL(d.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3" data-testid="card-rel-abc">
          <h2 className="text-sm font-bold">Curva ABC de produtos</h2>
          <p className="text-xs text-muted-foreground">Classificação por receita acumulada (A ≤ 80% · B ≤ 95% · C resto)</p>
          <div className="mt-4 max-h-72 overflow-y-auto">
            <Table data-testid="table-abc">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Acum.</TableHead>
                  <TableHead>Classe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abc.slice(0, 10).map((row) => (
                  <TableRow key={row.rank} data-testid={`abc-row-${row.rank}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.rank}</TableCell>
                    <TableCell className="max-w-44 truncate font-medium">{row.name}</TableCell>
                    <TableCell className="text-right font-mono">{row.qty}</TableCell>
                    <TableCell className="text-right font-mono">{formatBRL(row.revenue)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatNumber(row.cumShare, 1)}%</TableCell>
                    <TableCell>
                      <StatusBadge tone={ABC_CLASS[row.klass].tone} testId={`abc-classe-${row.rank}`}>{row.klass}</StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5" data-testid="card-rel-resumo">
        <h2 className="text-sm font-bold">Resumo financeiro do período</h2>
        <p className="text-xs text-muted-foreground">Desde {formatDate(periodStart)}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 p-4" data-testid="resumo-recebido">
            <p className="text-xs text-muted-foreground">Recebido</p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(recebido)}</p>
          </div>
          <div className="rounded-lg border border-border/70 p-4" data-testid="resumo-pago">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="mt-1 font-mono text-lg font-bold">{formatBRL(pago)}</p>
          </div>
          <div className={cn("rounded-lg border p-4", recebido - pago >= 0 ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5" : "border-red-200 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/5")} data-testid="resumo-resultado">
            <p className="text-xs text-muted-foreground">Resultado</p>
            <p className={cn("mt-1 font-mono text-lg font-bold", recebido - pago >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {formatBRL(round2(recebido - pago))}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
