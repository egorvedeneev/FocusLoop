import { ReactNode } from "react";

type ChipVariant = "default" | "primary" | "success" | "warning" | "danger" | "outline";

type ChipProps = {
  children: ReactNode;
  variant?: ChipVariant;
  icon?: ReactNode;
  className?: string;
};

export function Chip({ children, variant = "default", icon, className = "" }: ChipProps) {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    primary: "bg-accent text-accent-foreground",
    success: "bg-[#e6f4ea] text-[#137333]",
    warning: "bg-[#fef7e0] text-[#7c4700]",
    danger: "bg-[#fce8e6] text-[#c5221f]",
    outline: "bg-transparent border border-border text-foreground",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${variants[variant]} ${className}`}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </span>
  );
}
