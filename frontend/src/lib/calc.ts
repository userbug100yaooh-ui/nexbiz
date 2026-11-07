// Agregações compartilhadas por Dashboard, Financeiro e Relatórios — calculadas
// no cliente a partir das coleções (funciona igual com a API ou com o fallback demo).

import type { Sale, Transaction } from "@/lib/types";

export const CHART_COLORS = ["#2563EB", "#38BDF8", "#0B132B", "#16A34A", "#D97706", "#DC2626", "#94A3B8", "#7C3AED"];

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const round2 = (v: number): number => Math.round(v * 100) / 100;

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** "2025-11-07T12:00:00+00:00" | "2025-11-07" → "2025-11" */
export const monthKey = (iso: string): string => iso.slice(0, 7);

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTHS_PT[Number(m) - 1]}/${y.slice(2)}`;
}

/** Últimos `n` meses (incluindo o atual), em ordem cronológica, como "YYYY-MM". */
export function lastMonths(n: number, today = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export type StockStatus = "ok" | "baixo" | "zerado";

export function stockStatus(p: { stock: number; min_stock: number }): StockStatus {
  if (p.stock <= 0) return "zerado";
  if (p.stock <= p.min_stock) return "baixo";
  return "ok";
}

export const STOCK_LABELS: Record<StockStatus, string> = {
  ok: "Em estoque",
  baixo: "Estoque baixo",
  zerado: "Sem estoque",
};

export function monthlyRevenue(sales: Sale[], months: string[]): { month: string; label: string; total: number }[] {
  return months.map((m) => ({
    month: m,
    label: monthLabel(m),
    total: round2(sum(sales.filter((s) => s.status !== "cancelado" && monthKey(s.created_at) === m).map((s) => s.total))),
  }));
}

export function monthlyCashflow(
  transactions: Transaction[],
  months: string[],
): { month: string; label: string; receitas: number; despesas: number }[] {
  return months.map((m) => {
    const inMonth = transactions.filter((t) => monthKey(t.due_date) === m);
    return {
      month: m,
      label: monthLabel(m),
      receitas: round2(sum(inMonth.filter((t) => t.kind === "receita" && t.paid).map((t) => t.amount))),
      despesas: round2(sum(inMonth.filter((t) => t.kind === "despesa" && t.paid).map((t) => t.amount))),
    };
  });
}

export function topProducts(sales: Sale[], limit = 5): { name: string; qty: number; revenue: number }[] {
  const agg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const sale of sales) {
    if (sale.status === "cancelado") continue;
    for (const item of sale.items) {
      const cur = agg.get(item.product_id) ?? { name: item.name, qty: 0, revenue: 0 };
      cur.qty += item.qty;
      cur.revenue = round2(cur.revenue + item.total);
      agg.set(item.product_id, cur);
    }
  }
  return [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function expenseByCategory(transactions: Transaction[]): { name: string; value: number }[] {
  const agg = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "despesa") continue;
    agg.set(t.category, round2((agg.get(t.category) ?? 0) + t.amount));
  }
  return [...agg.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
