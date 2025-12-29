'use client';

import { Card } from '@/components/ui/card';
import { DollarSign, Users, Target, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = {
  dollar: DollarSign,
  users: Users,
  target: Target,
  check: CheckCircle,
};

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: keyof typeof icons;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon = 'dollar',
  trend = 'neutral',
  trendValue,
}: StatCardProps) {
  const Icon = icons[icon];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {TrendIcon && trendValue && (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          )}>
            <TrendIcon className="h-4 w-4" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </Card>
  );
}

export function StatsCards({ pipelineId }: { pipelineId?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Pipeline"
        value="$445,000"
        icon="dollar"
        trend="up"
        trendValue="+12%"
      />
      <StatCard
        title="Won This Month"
        value="$128,500"
        icon="target"
        trend="up"
        trendValue="+8%"
      />
      <StatCard
        title="Active Contacts"
        value="1,234"
        icon="users"
        trend="up"
        trendValue="+24"
      />
      <StatCard
        title="Tasks Completed"
        value="89"
        icon="check"
        description="This week"
      />
    </div>
  );
}
