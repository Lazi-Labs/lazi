'use client';

import { useState, useMemo } from 'react';
import {
  usePendingSync,
  usePushToServiceTitan,
  useRetryPendingSync,
  PendingSyncItem,
} from '@/hooks/usePricebookOrganization';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Package,
  Wrench,
  Upload,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PendingSyncPanelProps {
  open: boolean;
  onClose: () => void;
  entityType?: 'material' | 'service' | 'all';
}

type TabValue = 'all' | 'service' | 'material' | 'errors';

export function PendingSyncPanel({
  open,
  onClose,
  entityType: initialEntityType = 'all',
}: PendingSyncPanelProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(
    initialEntityType === 'all' ? 'all' : initialEntityType
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = usePendingSync({
    entityType: activeTab === 'all' || activeTab === 'errors' ? 'all' : activeTab,
    status: activeTab === 'errors' ? 'error' : 'all',
    limit: 100,
  });

  const pushMutation = usePushToServiceTitan();
  const retryMutation = useRetryPendingSync();

  const items = data?.data || [];
  const counts = data?.counts;

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    if (activeTab === 'errors') return items.filter((i) => i.sync_status === 'error');
    return items.filter((i) => i.entity_type === activeTab);
  }, [items, activeTab]);

  const pendingItems = filteredItems.filter((i) => i.sync_status === 'pending');
  const errorItems = filteredItems.filter((i) => i.sync_status === 'error');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(pendingItems.map((i) => `${i.entity_type}-${i.st_id}`)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (item: PendingSyncItem, checked: boolean) => {
    const key = `${item.entity_type}-${item.st_id}`;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handlePushSelected = async () => {
    const selectedItems = pendingItems.filter((i) =>
      selectedIds.has(`${i.entity_type}-${i.st_id}`)
    );

    const materialIds = selectedItems
      .filter((i) => i.entity_type === 'material')
      .map((i) => i.st_id);
    const serviceIds = selectedItems
      .filter((i) => i.entity_type === 'service')
      .map((i) => i.st_id);

    try {
      let totalPushed = 0;
      let totalFailed = 0;

      if (materialIds.length > 0) {
        const result = await pushMutation.mutateAsync({
          entityType: 'material',
          stIds: materialIds,
        });
        totalPushed += result.pushed;
        totalFailed += result.failed;
      }

      if (serviceIds.length > 0) {
        const result = await pushMutation.mutateAsync({
          entityType: 'service',
          stIds: serviceIds,
        });
        totalPushed += result.pushed;
        totalFailed += result.failed;
      }

      if (totalFailed > 0) {
        toast.error(`Pushed ${totalPushed}, ${totalFailed} failed`);
      } else {
        toast.success(`Successfully pushed ${totalPushed} items to ServiceTitan`);
      }

      setSelectedIds(new Set());
      refetch();
    } catch (error) {
      toast.error('Failed to push items to ServiceTitan');
    }
  };

  const handlePushAll = async () => {
    try {
      const materialIds = pendingItems
        .filter((i) => i.entity_type === 'material')
        .map((i) => i.st_id);
      const serviceIds = pendingItems
        .filter((i) => i.entity_type === 'service')
        .map((i) => i.st_id);

      let totalPushed = 0;
      let totalFailed = 0;

      if (materialIds.length > 0) {
        const result = await pushMutation.mutateAsync({
          entityType: 'material',
          stIds: materialIds,
        });
        totalPushed += result.pushed;
        totalFailed += result.failed;
      }

      if (serviceIds.length > 0) {
        const result = await pushMutation.mutateAsync({
          entityType: 'service',
          stIds: serviceIds,
        });
        totalPushed += result.pushed;
        totalFailed += result.failed;
      }

      if (totalFailed > 0) {
        toast.error(`Pushed ${totalPushed}, ${totalFailed} failed`);
      } else {
        toast.success(`Successfully pushed ${totalPushed} items to ServiceTitan`);
      }

      refetch();
    } catch (error) {
      toast.error('Failed to push items to ServiceTitan');
    }
  };

  const handleRetryFailed = async () => {
    try {
      const materialErrorIds = errorItems
        .filter((i) => i.entity_type === 'material')
        .map((i) => i.st_id);
      const serviceErrorIds = errorItems
        .filter((i) => i.entity_type === 'service')
        .map((i) => i.st_id);

      let totalRetried = 0;
      let totalFailed = 0;

      if (materialErrorIds.length > 0) {
        const result = await retryMutation.mutateAsync({
          entityType: 'material',
          stIds: materialErrorIds,
        });
        totalRetried += result.retried || 0;
        totalFailed += result.failed || 0;
      }

      if (serviceErrorIds.length > 0) {
        const result = await retryMutation.mutateAsync({
          entityType: 'service',
          stIds: serviceErrorIds,
        });
        totalRetried += result.retried || 0;
        totalFailed += result.failed || 0;
      }

      if (totalFailed > 0) {
        toast.error(`Retried ${totalRetried}, ${totalFailed} failed`);
      } else {
        toast.success(`Retried ${totalRetried} items`);
      }
      refetch();
    } catch (error) {
      toast.error('Failed to retry items');
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getChangePills = (changes: Record<string, any>) => {
    const changedFields = Object.entries(changes)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key]) => key);

    return changedFields.slice(0, 3).map((field) => (
      <Badge key={field} variant="secondary" className="text-[10px] px-1 py-0">
        {field}
      </Badge>
    ));
  };

  const isPushing = pushMutation.isPending;
  const isRetrying = retryMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Pending Sync to ServiceTitan
            {data?.total !== undefined && (
              <Badge variant="secondary">{data.total}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as TabValue);
            setSelectedIds(new Set());
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-4 grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All
              {counts && (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {counts.totalPending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="service" className="text-xs">
              Services
              {counts && (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {counts.service.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="material" className="text-xs">
              Materials
              {counts && (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {counts.material.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="errors" className="text-xs">
              Errors
              {counts && counts.totalErrors > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px]">
                  {counts.totalErrors}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                <p>All synced! No pending changes.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={
                          pendingItems.length > 0 &&
                          pendingItems.every((i) =>
                            selectedIds.has(`${i.entity_type}-${i.st_id}`)
                          )
                        }
                        onCheckedChange={handleSelectAll}
                        disabled={pendingItems.length === 0}
                      />
                    </TableHead>
                    <TableHead className="w-8">Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Since</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const key = `${item.entity_type}-${item.st_id}`;
                    const isSelected = selectedIds.has(key);
                    const isError = item.sync_status === 'error';

                    return (
                      <TableRow
                        key={key}
                        className={cn(isError && 'bg-red-50 dark:bg-red-950/20')}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleSelectItem(item, checked as boolean)
                            }
                            disabled={isError}
                          />
                        </TableCell>
                        <TableCell>
                          {item.entity_type === 'material' ? (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.code}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {getChangePills(item.pending_changes || {})}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(item.pending_since)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isError ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="destructive" className="text-[10px]">
                                <AlertCircle className="h-3 w-3 mr-0.5" />
                                Error
                              </Badge>
                              {item.sync_error && (
                                <span
                                  className="text-[10px] text-red-600 max-w-[100px] truncate"
                                  title={item.sync_error}
                                >
                                  {item.sync_error}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-orange-50 text-orange-700 border-orange-200"
                            >
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t bg-muted/30 flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {selectedIds.size > 0 && `${selectedIds.size} selected`}
            </div>
            <div className="flex items-center gap-2">
              {errorItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryFailed}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Retry Failed ({errorItems.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePushSelected}
                disabled={selectedIds.size === 0 || isPushing}
              >
                {isPushing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Push Selected ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                onClick={handlePushAll}
                disabled={pendingItems.length === 0 || isPushing}
              >
                {isPushing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Push All Pending
              </Button>
            </div>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default PendingSyncPanel;
