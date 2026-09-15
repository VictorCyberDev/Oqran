import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-hover disabled:bg-brand/40 disabled:cursor-not-allowed",
  secondary:
    "bg-bg-surface text-text-primary border border-border-default hover:bg-bg-surface-sunken",
  ghost: "bg-transparent text-text-primary hover:text-brand",
  danger: "bg-transparent text-danger hover:opacity-80",
};

export function Button({
  variant = "primary",
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-md font-semibold transition-colors cursor-pointer",
        fullWidth && "w-full",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
