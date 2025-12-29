'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Radio
} from 'lucide-react';
import { enableDebugInterceptor, isInterceptorEnabled } from '@/lib/debug-interceptor';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'socket' | 'api' | 'action' | 'error' | 'info';
  category: string;
  message: string;
  data?: any;
}

interface PendingStats {
  count: number;
  categories: number;
  subcategories: number;
}

interface SyncHistory {
  id: number;
  direction: string;
  entity_type: string;
  operation: string;
  status: string;
  duration_ms: number;
  created_at: string;
}

interface DbStats {
  totalCategories?: number;
  totalSubcategories?: number;
  services?: number;
  materials?: number;
  pendingCount?: number;
  data?: {
    byType?: Array<{
      category_type: string;
      total: number;
      active: number;
      inactive: number;
      visible: number;
      hidden: number;
      total_items: number;
      total_subcategories: number;
      last_synced: string;
    }>;
    subcategories?: {
      total: number;
      active: number;
    };
  };
}

export function PricebookDebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [interceptorActive, setInterceptorActive] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  // Network interceptor toggle
  const toggleInterceptor = useCallback(() => {
    if (interceptorActive) {
      // Disable
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setInterceptorActive(false);
    } else {
      // Enable
      cleanupRef.current = enableDebugInterceptor();
      setInterceptorActive(true);
    }
  }, [interceptorActive]);

  // Cleanup interceptor on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Add log entry helper
  const addLog = useCallback((type: LogEntry['type'], category: string, message: string, data?: any) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      message,
      data
    };
    setLogs(prev => [entry, ...prev].slice(0, 200)); // Keep last 200
  }, []);

  // Expose addLog globally for other components to use
  useEffect(() => {
    (window as any).__debugLog = addLog;
    addLog('info', 'system', 'Debug panel initialized');
    return () => {
      delete (window as any).__debugLog;
    };
  }, [addLog]);

  // Auto-scroll to top (newest entries)
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    const socketEvents = [
      'pricebook:categories:synced',
      'pricebook:categories:updated',
      'pricebook:categories:pushed',
      'pricebook:subcategories:updated',
      'sync:started',
      'sync:completed',
      'sync:failed',
      'connect',
      'disconnect',
      'error'
    ];

    const handlers: Record<string, (data: any) => void> = {};

    socketEvents.forEach(event => {
      handlers[event] = (data: any) => {
        addLog('socket', event, `Received ${event}`, data);
      };
      socket.on(event, handlers[event]);
    });

    addLog('info', 'socket', `Listening to ${socketEvents.length} socket events`);

    return () => {
      socketEvents.forEach(event => socket.off(event, handlers[event]));
    };
  }, [socket, addLog]);

  // Fetch pending changes count
  const { data: pendingStats, refetch: refetchPending } = useQuery<PendingStats>({
    queryKey: ['debug-pending'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/pricebook/categories/pending`, {
        headers: { 'x-tenant-id': TENANT_ID }
      });
      if (!res.ok) return { count: 0, categories: 0, subcategories: 0 };
      return res.json();
    },
    refetchInterval: 5000,
  });

  // Fetch recent sync history
  const { data: syncHistory, refetch: refetchHistory } = useQuery<{ data: SyncHistory[] }>({
    queryKey: ['debug-sync-history'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/admin/sync/history?limit=10`, {
        headers: { 'x-tenant-id': TENANT_ID }
      });
      if (!res.ok) return { data: [] };
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch database stats
  const { data: dbStats, refetch: refetchStats } = useQuery<DbStats>({
    queryKey: ['debug-db-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/pricebook/categories/stats/summary`, {
        headers: { 'x-tenant-id': TENANT_ID }
      });
      if (!res.ok) return {};
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Pull mutation
  const pullMutation = useMutation({
    mutationFn: async (incremental: boolean) => {
      addLog('action', 'pull', `Starting ${incremental ? 'incremental' : 'full'} pull...`);
      const res = await fetch(`${API_URL}/api/pricebook/categories/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID
        },
        body: JSON.stringify({ incremental })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limited - wait a moment and try again');
        }
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }
      return data;
    },
    onSuccess: (data) => {
      addLog('api', 'pull', `Pull complete: ${data.fetched || 0} fetched`, data);
      refetchPending();
      refetchStats();
    },
    onError: (err: Error) => {
      addLog('error', 'pull', `Pull failed: ${err.message}`);
    }
  });

  // Push mutation
  const pushMutation = useMutation({
    mutationFn: async () => {
      addLog('action', 'push', 'Starting push to ServiceTitan...');
      const res = await fetch(`${API_URL}/api/pricebook/categories/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID
        }
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limited - wait a moment and try again');
        }
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }
      return data;
    },
    onSuccess: (data) => {
      addLog('api', 'push', `Push complete: ${data.updated || 0} updated`, data);
      refetchPending();
    },
    onError: (err: Error) => {
      addLog('error', 'push', `Push failed: ${err.message}`);
    }
  });

  // Filter logs
  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(l => l.type === filter);

  // Type colors
  const typeColors: Record<string, string> = {
    socket: 'text-cyan-400',
    api: 'text-yellow-400',
    action: 'text-green-400',
    error: 'text-red-400',
    info: 'text-gray-400'
  };

  const typeIcons: Record<string, any> = {
    socket: Zap,
    api: Activity,
    action: Play,
    error: XCircle,
    info: Clock
  };

  // Calculate stats from dbStats
  const getTotalCategories = () => {
    if (dbStats?.totalCategories !== undefined) return dbStats.totalCategories;
    if (dbStats?.data?.byType) {
      return dbStats.data.byType.reduce((sum, t) => sum + Number(t.total || 0), 0);
    }
    return '-';
  };

  const getTotalSubcategories = () => {
    if (dbStats?.totalSubcategories !== undefined) return dbStats.totalSubcategories;
    if (dbStats?.data?.subcategories?.total !== undefined) return dbStats.data.subcategories.total;
    return '-';
  };

  const getServices = () => {
    if (dbStats?.services !== undefined) return dbStats.services;
    if (dbStats?.data?.byType) {
      const serviceRow = dbStats.data.byType.find(t => t.category_type === 'Service');
      return serviceRow?.total || 0;
    }
    return '-';
  };

  const getMaterials = () => {
    if (dbStats?.materials !== undefined) return dbStats.materials;
    if (dbStats?.data?.byType) {
      const materialRow = dbStats.data.byType.find(t => t.category_type === 'Material');
      return materialRow?.total || 0;
    }
    return '-';
  };

  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-green-400" />
          <h2 className="font-semibold">Pricebook Sync Debug Panel</h2>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <Wifi className="w-4 h-4" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <WifiOff className="w-4 h-4" /> Disconnected
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Left Column: Status Cards */}
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Socket.io</span>
                <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? '● Connected' : '○ Disconnected'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Tenant ID</span>
                <span className="text-sm text-gray-400 font-mono">{TENANT_ID}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">API URL</span>
                <span className="text-sm text-gray-400 font-mono text-xs truncate max-w-[150px]" title={API_URL}>{API_URL}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-1">
                  <Radio className="w-3 h-3" /> Intercept
                </span>
                <button
                  onClick={toggleInterceptor}
                  className={`text-sm px-2 py-0.5 rounded ${
                    interceptorActive
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {interceptorActive ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Pending Changes */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Pending Changes</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  {pendingStats?.count ?? '-'}
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {pendingStats?.categories ?? '-'}
                </div>
                <div className="text-xs text-gray-500">Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {pendingStats?.subcategories ?? '-'}
                </div>
                <div className="text-xs text-gray-500">Subcats</div>
              </div>
            </div>
          </div>

          {/* Database Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Database</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Categories</span>
                <span className="font-mono">{getTotalCategories()}</span>
              </div>
              <div className="flex justify-between">
                <span>Subcategories</span>
                <span className="font-mono">{getTotalSubcategories()}</span>
              </div>
              <div className="flex justify-between">
                <span>Services</span>
                <span className="font-mono">{getServices()}</span>
              </div>
              <div className="flex justify-between">
                <span>Materials</span>
                <span className="font-mono">{getMaterials()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => pullMutation.mutate(true)}
                disabled={pullMutation.isPending}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm transition"
              >
                <Download className="w-4 h-4" />
                {pullMutation.isPending ? 'Pulling...' : 'Pull Delta'}
              </button>
              <button
                onClick={() => pullMutation.mutate(false)}
                disabled={pullMutation.isPending}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                {pullMutation.isPending ? 'Pulling...' : 'Pull All'}
              </button>
              <button
                onClick={() => pushMutation.mutate()}
                disabled={pushMutation.isPending || !pendingStats?.count}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm transition col-span-2"
              >
                <Upload className="w-4 h-4" />
                {pushMutation.isPending ? 'Pushing...' : `Push to ST (${pendingStats?.count || 0})`}
              </button>
              <button
                onClick={() => {
                  refetchPending();
                  refetchHistory();
                  refetchStats();
                  addLog('action', 'refresh', 'Refreshed all data');
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition col-span-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column: Event Log */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
          {/* Log Header */}
          <div className="px-4 py-2 bg-gray-700/50 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Event Log</span>
              <span className="text-xs text-gray-500">({filteredLogs.length} events)</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-gray-700 text-sm rounded px-2 py-1 border-none outline-none"
              >
                <option value="all">All</option>
                <option value="socket">Socket</option>
                <option value="api">API</option>
                <option value="action">Actions</option>
                <option value="error">Errors</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded bg-gray-700"
                />
                Auto-scroll
              </label>
              <button
                onClick={() => setLogs([])}
                className="text-gray-400 hover:text-white p-1"
                title="Clear logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Log Entries */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
            <div ref={logsEndRef} />
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No events yet. Try pulling or pushing data.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const Icon = typeIcons[log.type] || Activity;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-1 px-2 hover:bg-gray-700/50 rounded group"
                  >
                    <span className="text-gray-600 shrink-0">
                      {log.timestamp.toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}.{String(log.timestamp.getMilliseconds()).padStart(3, '0')}
                    </span>
                    <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${typeColors[log.type]}`} />
                    <span className={`shrink-0 ${typeColors[log.type]}`}>
                      [{log.category}]
                    </span>
                    <span className="text-gray-300 break-all">
                      {log.message}
                    </span>
                    {log.data && (
                      <button
                        onClick={() => console.log(log.data)}
                        className="text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 shrink-0"
                        title="Log to console"
                      >
                        [data]
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Sync History */}
      {syncHistory?.data && syncHistory.data.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-700">
              <h3 className="text-sm font-medium">Recent Sync History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Time</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Direction</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Entity</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Operation</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Status</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {syncHistory.data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-700/50">
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 ${
                          item.direction === 'inbound' ? 'text-blue-400' : 'text-green-400'
                        }`}>
                          {item.direction === 'inbound' ? <Download className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                          {item.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2">{item.entity_type}</td>
                      <td className="px-3 py-2">{item.operation}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 ${
                          item.status === 'success' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400 font-mono">
                        {item.duration_ms}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
