import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  testId,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center"
      data-testid={testId}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
