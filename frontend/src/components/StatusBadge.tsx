import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StockStatus } from "@/lib/calc";

const TONES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  neutral: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
} as const;

export type Tone = keyof typeof TONES;

export function StatusBadge({ tone, children, testId }: { tone: Tone; children: ReactNode; testId?: string }) {
  return (
    <Badge variant="outline" className={cn("border", TONES[tone])} data-testid={testId}>
      {children}
    </Badge>
  );
}

export function saleStatusMeta(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "pago":
      return { label: "Paga", tone: "success" };
    case "pendente":
      return { label: "Pendente", tone: "warning" };
    case "cancelado":
      return { label: "Cancelada", tone: "danger" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export const STOCK_META: Record<StockStatus, { label: string; tone: Tone }> = {
  ok: { label: "Em estoque", tone: "success" },
  baixo: { label: "Estoque baixo", tone: "warning" },
  zerado: { label: "Sem estoque", tone: "danger" },
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor",
};
