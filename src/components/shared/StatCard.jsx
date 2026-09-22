import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className,
  iconClassName,
}) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <Card className={cn(
      "p-6 bg-white border-slate-200 hover:shadow-md transition-shadow",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
          {trendValue && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositive && "text-emerald-600",
              isNegative && "text-red-600",
              !trend && "text-slate-500"
            )}>
              {isPositive && <TrendingUp className="h-3 w-3" />}
              {isNegative && <TrendingDown className="h-3 w-3" />}
              {trendValue}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            iconClassName || "bg-blue-50"
          )}>
            <Icon className={cn(
              "h-6 w-6",
              iconClassName ? "text-current" : "text-blue-600"
            )} />
          </div>
        )}
      </div>
    </Card>
  );
}