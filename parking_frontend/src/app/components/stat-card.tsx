import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className, iconClassName }: StatCardProps) {
  return (
    <Card className={cn("p-6 transition-all hover:shadow-md", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold">{value}</p>
          {trend && (
            <p className={cn("text-xs", trend.isPositive ? "text-success" : "text-destructive")}>
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("rounded-xl p-3", iconClassName)}>
          <Icon className="size-6" />
        </div>
      </div>
    </Card>
  );
}
