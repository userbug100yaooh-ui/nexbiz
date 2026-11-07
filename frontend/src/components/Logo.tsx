import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Marca NEXBIZ — monograma azul + wordmark. `onDark` para superfícies navy. */
export function Logo({ onDark = false, className, to }: { onDark?: boolean; className?: string; to?: string }) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-extrabold text-white shadow-sm">
        N
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("text-base font-extrabold tracking-tight", onDark ? "text-white" : "text-foreground")}>NEXBIZ</span>
        <span className={cn("mt-0.5 text-[10px] font-semibold tracking-[0.18em]", onDark ? "text-slate-400" : "text-muted-foreground")}>
          GESTÃO EMPRESARIAL
        </span>
      </span>
    </span>
  );
  return to ? (
    <Link to={to} className="inline-flex" data-testid="link-logo">
      {content}
    </Link>
  ) : (
    content
  );
}
