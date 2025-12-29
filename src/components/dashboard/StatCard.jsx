import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, color = "blue" }) {
  const colorClasses = {
    blue: "from-blue-500 to-indigo-600 shadow-blue-500/20",
    green: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
    amber: "from-amber-500 to-orange-600 shadow-amber-500/20",
    rose: "from-rose-500 to-pink-600 shadow-rose-500/20",
    violet: "from-violet-500 to-purple-600 shadow-violet-500/20",
  };

  return (
    <Card className="relative overflow-hidden bg-white border-0 shadow-lg shadow-slate-200/50">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "mt-3 inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
                trendUp ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
              )}>
                {trendUp ? "↑" : "↓"} {trend}
              </div>
            )}
          </div>
          <div className={cn(
            "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            colorClasses[color]
          )}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>
    </Card>
  );
}