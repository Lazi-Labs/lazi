'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useContacts } from '@/hooks/use-contacts';
import { useOpportunities } from '@/hooks/use-opportunities';
import { useConversations } from '@/hooks/use-conversations';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, MessageSquare, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BuilderSection } from '@/components/builder';
import { PageHeader } from '@/components/shared';

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
  isLoading,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {(description || trend) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend && (
                  <span className={trendUp ? 'text-green-600' : 'text-red-600'}>
                    {trendUp ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                    {trend}
                  </span>
                )}
                {description}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { contacts, isLoading: contactsLoading } = useContacts({ limit: 1000 });
  const { opportunities, isLoading: opportunitiesLoading } = useOpportunities();
  const { conversations, isLoading: conversationsLoading } = useConversations();

  const totalContacts = contacts.length;
  const totalOpportunities = opportunities.length;
  const openOpportunities = opportunities.filter((o) => o.status === 'Open').length;
  const totalValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
  const unreadConversations = conversations.filter((c) => (c.unreadCount || 0) > 0).length;

  return (
    <div className="space-y-6">
      <BuilderSection>
        <PageHeader 
          title="Dashboard" 
          description="Welcome back! Here's an overview of your CRM."
        />
      </BuilderSection>

      <BuilderSection>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contacts"
          value={totalContacts}
          description="in your database"
          icon={Users}
          isLoading={contactsLoading}
        />
        <StatCard
          title="Open Opportunities"
          value={openOpportunities}
          description={`of ${totalOpportunities} total`}
          icon={TrendingUp}
          isLoading={opportunitiesLoading}
        />
        <StatCard
          title="Pipeline Value"
          value={`$${totalValue.toLocaleString()}`}
          description="total opportunity value"
          icon={DollarSign}
          isLoading={opportunitiesLoading}
        />
        <StatCard
          title="Unread Messages"
          value={unreadConversations}
          description="conversations need attention"
          icon={MessageSquare}
          isLoading={conversationsLoading}
        />
        </div>
      </BuilderSection>

      <BuilderSection>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates across your CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {opportunitiesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))
              ) : opportunities.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              ) : (
                opportunities.slice(0, 5).map((opp) => (
                  <div key={opp.id} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{opp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {opp.value ? `$${opp.value.toLocaleString()}` : 'No value'} • {opp.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              Conversion metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Leads</span>
                <span className="font-medium">
                  {contacts.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prospects</span>
                <span className="font-medium">
                  0
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customers</span>
                <span className="font-medium">
                  0
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Won Deals</span>
                <span className="font-medium">
                  {opportunities.filter((o) => o.status === 'Won').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lost Deals</span>
                <span className="font-medium">
                  {opportunities.filter((o) => o.status === 'Lost').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </BuilderSection>
    </div>
  );
}
