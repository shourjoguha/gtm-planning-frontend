import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Surface — the project's unified panel primitive. Replaces shadcn Card chrome
 * with a quieter editorial look: hairline border, no shadow, generous interior
 * padding, optional eyebrow + title.
 */
type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "subtle" | "inset";
};

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, variant = "default", ...rest }, ref) => {
    const variantClass =
      variant === "subtle"
        ? "bg-muted/40 border-transparent"
        : variant === "inset"
        ? "bg-background border-border/60"
        : "bg-card border-border/60";
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border",
          variantClass,
          className,
        )}
        {...rest}
      />
    );
  },
);
Surface.displayName = "Surface";

export const SurfaceHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-start justify-between gap-4 px-5 pt-5 pb-3", className)}
      {...rest}
    />
  ),
);
SurfaceHeader.displayName = "SurfaceHeader";

export const SurfaceEyebrow = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...rest }, ref) => (
    <p
      ref={ref}
      className={cn("text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80", className)}
      {...rest}
    />
  ),
);
SurfaceEyebrow.displayName = "SurfaceEyebrow";

export const SurfaceTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...rest }, ref) => (
    <h3
      ref={ref}
      className={cn("font-display text-xl tracking-tight", className)}
      {...rest}
    />
  ),
);
SurfaceTitle.displayName = "SurfaceTitle";

export const SurfaceBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn("px-5 pb-5", className)} {...rest} />
  ),
);
SurfaceBody.displayName = "SurfaceBody";

/**
 * Stat — KPI tile. Big tabular number, eyebrow label, optional secondary
 * line. Used in the Configure hero strip and the Results summary row.
 */
type StatProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: React.ReactNode;
  className?: string;
};

export function Stat({ label, value, hint, trend, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
        {label}
      </p>
      <div className="font-display text-3xl sm:text-[2.25rem] leading-none tabular-nums tracking-tight">
        {value}
      </div>
      {(hint || trend) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          {trend}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}
