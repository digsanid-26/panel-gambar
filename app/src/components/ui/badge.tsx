import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "accent" | "danger" | "outline";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        {
          "bg-surface-alt text-foreground": variant === "default",
          "bg-primary/15 text-primary-dark": variant === "primary",
          "bg-secondary/15 text-secondary-dark": variant === "secondary",
          "bg-accent/15 text-accent-dark": variant === "accent",
          "bg-danger/15 text-danger": variant === "danger",
          "border border-border text-muted": variant === "outline",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
