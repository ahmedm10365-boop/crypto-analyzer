import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  change?: number;
  icon?: React.ReactNode;
  prefix?: string;
}

export default function KPICard({ label, value, change, icon, prefix }: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon && <div className="text-muted-foreground/60">{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-lg font-semibold tabular-nums animate-number">
          {prefix}{value}
        </span>
        {change !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : isNegative ? (
              <ArrowDownRight className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
