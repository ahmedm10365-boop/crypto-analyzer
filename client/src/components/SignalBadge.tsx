import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SignalBadgeProps {
  signal: "شراء" | "بيع" | "محايد" | "شراء قوي" | "بيع قوي";
  size?: "sm" | "md" | "lg";
}

export default function SignalBadge({ signal, size = "md" }: SignalBadgeProps) {
  const isBuy = signal.includes("شراء");
  const isSell = signal.includes("بيع");

  const colors = isBuy
    ? "bg-green-500/10 text-green-500 border-green-500/20"
    : isSell
    ? "bg-red-500/10 text-red-500 border-red-500/20"
    : "bg-muted text-muted-foreground border-border";

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-1 gap-1",
    lg: "text-sm px-3 py-1.5 gap-1.5",
  };

  const iconSize = size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${colors} ${sizeClasses[size]}`}
    >
      {isBuy ? (
        <TrendingUp className={iconSize} />
      ) : isSell ? (
        <TrendingDown className={iconSize} />
      ) : (
        <Minus className={iconSize} />
      )}
      {signal}
    </span>
  );
}
