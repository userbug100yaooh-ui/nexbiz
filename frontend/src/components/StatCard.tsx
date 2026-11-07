import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Variação % vs mês anterior; null = não comparável. */
  trend?: number | null;
  hint?: string;
  index?: number;
  testId?: string;
}

export function StatCard({ label, value, icon: Icon, trend, hint, index = 0, testId }: StatCardProps) {
  const up = (trend ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
    >
      <Card className="p-5 transition-shadow hover:shadow-md" data-testid={testId ?? `stat-${label}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {trend != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                up
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
              )}
            >
              {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(trend).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </span>
          )}
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        </div>
      </Card>
    </motion.div>
  );
}
