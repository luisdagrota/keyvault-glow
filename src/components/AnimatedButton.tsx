import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface AnimatedButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "green" | "hero";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function AnimatedButton({
  icon: Icon,
  label,
  onClick,
  href,
  variant = "primary",
  size = "default",
  className,
}: AnimatedButtonProps) {
  const sizeClasses = {
    sm: "w-10 h-10 hover:w-32",
    default: "w-14 h-14 hover:w-44",
    lg: "w-16 h-16 hover:w-52",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-7 w-7",
  };

  const textSizes = {
    sm: "text-xs",
    default: "text-sm",
    lg: "text-base",
  };

  const variantClasses = {
    primary: "btn-expand",
    green: "btn-expand btn-expand-green",
    hero: "btn-expand btn-expand-hero",
  };

  const baseClasses = cn(
    "relative flex items-center justify-center rounded-full cursor-pointer",
    "bg-card shadow-lg border border-border",
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  const content = (
    <>
      <Icon className={cn("btn-icon text-muted-foreground", iconSizes[size])} />
      <span className={cn("btn-title", textSizes[size])}>{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        aria-label={label}
      >
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={baseClasses} aria-label={label}>
      {content}
    </button>
  );
}
