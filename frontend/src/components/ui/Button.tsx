"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] shadow-[0_0_0_1px_rgba(124,108,246,0.4),0_8px_24px_-8px_rgba(124,108,246,0.6)] disabled:hover:bg-[var(--accent)]",
  secondary:
    "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
  ghost: "bg-transparent text-[var(--muted-strong)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center font-medium transition-all duration-150 ease-out",
          "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
