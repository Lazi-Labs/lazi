'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Automation, PaginatedResponse } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Play, Pause, Eye, Pencil, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { BuilderSection } from '@/components/builder';
import { PageHeader } from '@/components/shared';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-red-100 text-red-800',
};

const triggerLabels: Record<string, string> = {
  stage_change: 'Stage Change',
  message_received: 'Message Received',
  contact_created: 'Contact Created',
  contact_updated: 'Contact Updated',
  opportunity_created: 'Opportunity Created',
  opportunity_won: 'Opportunity Won',
  opportunity_lost: 'Opportunity Lost',
  task_due: 'Task Due',
  scheduled: 'Scheduled',
  webhook: 'Webhook',
  manual: 'Manual',
};

export default function AutomationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get<PaginatedResponse<Automation>>('/automations?limit=100'),
  });

  const automations = data?.docs ?? [];

  return (
    <div className="space-y-6">
      <BuilderSection>
        <PageHeader 
          title="Automations" 
          description="Create and manage workflow automations"
        >
          <Button asChild>
            <Link href="/automations/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Automation
            </Link>
          </Button>
        </PageHeader>
      </BuilderSection>

      {/* Stats Cards */}
      <BuilderSection>
        <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Automations</CardDescription>
            <CardTitle className="text-2xl">{automations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {automations.filter((a) => a.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Runs</CardDescription>
            <CardTitle className="text-2xl">
              {automations.reduce((sum, a) => sum + (a.runCount || 0), 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-2xl">
              {(() => {
                const totalRuns = automations.reduce((sum, a) => sum + (a.runCount || 0), 0);
                const successRuns = automations.reduce((sum, a) => sum + (a.successCount || 0), 0);
                return totalRuns > 0 ? `${((successRuns / totalRuns) * 100).toFixed(0)}%` : '-';
              })()}
            </CardTitle>
          </CardHeader>
        </Card>
        </div>
      </BuilderSection>

      {/* Automations Table */}
      <BuilderSection>
        <Card>
        <CardHeader>
          <CardTitle>All Automations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : automations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Zap className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No automations yet</p>
                      <Button asChild size="sm">
                        <Link href="/automations/new">Create your first automation</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                automations.map((automation) => {
                  const successRate = automation.runCount
                    ? ((automation.successCount || 0) / automation.runCount * 100).toFixed(0)
                    : '-';

                  return (
                    <TableRow key={automation.id}>
                      <TableCell>
                        <Link href={`/automations/${automation.id}`} className="font-medium hover:underline">
                          {automation.name}
                        </Link>
                        {automation.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {automation.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {triggerLabels[automation.trigger?.type] || automation.trigger?.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[automation.status]}>
                          {automation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{automation.runCount || 0}</TableCell>
                      <TableCell>{successRate}%</TableCell>
                      <TableCell className="text-muted-foreground">
                        {automation.lastRunAt
                          ? format(new Date(automation.lastRunAt), 'MMM d, h:mm a')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/automations/${automation.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/automations/${automation.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            {automation.status === 'active' ? (
                              <DropdownMenuItem>
                                <Pause className="mr-2 h-4 w-4" />
                                Pause
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem>
                                <Play className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
      </BuilderSection>
    </div>
  );
}
