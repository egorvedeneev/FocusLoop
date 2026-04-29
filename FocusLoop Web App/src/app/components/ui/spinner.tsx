import { Loader2 } from "lucide-react";
import { Card } from "./card";
import { cn } from "./utils";

type SpinnerProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
};

export function Spinner({ className, iconClassName, label }: SpinnerProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center gap-3 text-muted-foreground", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className={cn("size-8 shrink-0 animate-spin", iconClassName)} aria-hidden />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}

type PageSpinnerProps = {
  message?: string;
  className?: string;
};

export function PageSpinner({ message = "Loading…", className }: PageSpinnerProps) {
  return (
    <Card className={cn("flex min-h-[40vh] flex-col items-center justify-center py-16", className)}>
      <Spinner label={message} className="flex-col gap-4" />
    </Card>
  );
}
