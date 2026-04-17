"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          {
            "bg-primary text-background font-bold hover:bg-primary-dark focus:ring-primary shadow-lg shadow-primary/20":
              variant === "primary",
            "bg-secondary text-background font-bold hover:bg-secondary-dark focus:ring-secondary shadow-lg shadow-secondary/20":
              variant === "secondary",
            "bg-accent text-white hover:bg-accent-dark focus:ring-accent":
              variant === "accent",
            "border-2 border-border-light text-foreground hover:bg-surface-alt hover:border-primary/40 focus:ring-primary/30":
              variant === "outline",
            "text-foreground hover:bg-surface-alt focus:ring-border":
              variant === "ghost",
            "bg-danger text-white hover:bg-red-600 focus:ring-danger":
              variant === "danger",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-5 py-2.5 text-sm": size === "md",
            "px-7 py-3 text-base": size === "lg",
            "p-2.5": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export { Button };
