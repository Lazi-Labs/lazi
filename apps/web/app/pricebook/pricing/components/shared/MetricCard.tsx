'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  valueClassName?: string;
}

export default function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  valueClassName,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl p-4 relative',
        className
      )}
    >
      {Icon && (
        <div className="absolute top-4 right-4 text-slate-300">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className={cn(
          'text-2xl font-bold text-slate-800',
          valueClassName
        )}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
      )}
      {trend && (
        <div
          className={cn(
            'text-xs mt-1 flex items-center gap-1',
            trend.isPositive ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
