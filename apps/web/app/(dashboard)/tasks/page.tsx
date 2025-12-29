'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Task, PaginatedResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Calendar, User } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function TasksPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<PaginatedResponse<Task>>('/tasks?sort=dueDate&limit=100'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const tasks = data?.docs ?? [];
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const toggleComplete = (task: Task) => {
    updateMutation.mutate({
      id: task.id,
      data: {
        status: task.status === 'completed' ? 'pending' : 'completed',
        completedAt: task.status === 'completed' ? undefined : new Date().toISOString(),
      },
    });
  };

  const getDueDateColor = (dueDate: string | undefined) => {
    if (!dueDate) return 'text-muted-foreground';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your to-dos and follow-ups
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>To Do</span>
              <Badge variant="secondary">{pendingTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No pending tasks
              </p>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => toggleComplete(task)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary" className={cn('text-xs', priorityColors[task.priority])}>
                          {task.priority}
                        </Badge>
                        {task.dueDate && (
                          <span className={cn('text-xs flex items-center gap-1', getDueDateColor(task.dueDate))}>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Completed</span>
              <Badge variant="secondary">{completedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : completedTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No completed tasks
              </p>
            ) : (
              <div className="space-y-3">
                {completedTasks.slice(0, 10).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => toggleComplete(task)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-through">{task.title}</p>
                      {task.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {format(new Date(task.completedAt), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
