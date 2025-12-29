'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Database,
    RefreshCw,
    CheckCircle,
    XCircle,
    AlertCircle,
    Activity,
    Server,
    Zap,
    GitBranch,
    Clock,
    ArrowRight,
    Box,
    Layers,
    FileCode,
    Network,
    ExternalLink,
    Play,
    Pause,
    AlertTriangle,
    BarChart3,
    Table2,
    History,
    Bug,
    Wrench,
    Sparkles,
    Send,
    Loader2,
    Trash2,
    BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PricebookDebugPanel } from '@/components/developer/PricebookDebugPanel';

interface SchemaStats {
    schema: string;
    table_count: number;
    row_count: number;
}

interface TableInfo {
    schema: string;
    table_name: string;
    row_count: number;
}

interface SystemData {
    schemas: SchemaStats[];
    tables: TableInfo[];
    triggers: { schema: string; trigger_count: number }[];
    syncActivity: { schema: string; last_activity: string }[];
    timestamp: string;
}

interface ServiceHealth {
    status: 'healthy' | 'unhealthy' | 'unreachable' | 'unknown';
    error?: string;
    details?: any;
}

interface HealthData {
    status: string;
    services: Record<string, ServiceHealth>;
    timestamp: string;
}

interface WorkflowData {
    running: number;
    completed: number;
    failed: number;
    recent: Array<{
        id: string;
        type: string;
        status: string;
        startTime: string;
    }>;
    definitions: Array<{
        name: string;
        is_active: boolean;
        last_run_at: string;
        run_count: number;
    }>;
    error?: string;
}

interface SyncStatus {
    lastSync: Array<{
        entity: string;
        last_sync: string;
        total_records: number;
    }>;
    pendingOutbound: Array<{
        destination: string;
        pending_count: number;
    }>;
    recentHistory: Array<{
        entity_type: string;
        operation: string;
        status: string;
        records_processed: number;
        started_at: string;
    }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const schemaConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: string; description: string }> = {
    raw: {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500',
        icon: '📥',
        description: 'ServiceTitan API data (immutable)'
    },
    master: {
        color: 'text-blue-300',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-400',
        icon: '📊',
        description: 'Denormalized business data (read-only)'
    },
    crm: {
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500',
        icon: '👤',
        description: 'User-editable CRM data'
    },
    audit: {
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500',
        icon: '📋',
        description: 'Change tracking & history'
    },
    auth: {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500',
        icon: '🔐',
        description: 'User authentication'
    },
    workflow: {
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500',
        icon: '⚙️',
        description: 'Automation definitions'
    },
    sync: {
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500',
        icon: '📤',
        description: 'Outbound sync queue'
    },
    integrations: {
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500',
        icon: '🔑',
        description: 'OAuth tokens & webhooks'
    },
    public: {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500',
        icon: '🧹',
        description: 'PostgreSQL extensions only'
    },
};

// Build progress checklist
const buildProgress = [
    { phase: 'Phase 0-3', name: 'Database Foundation', status: 'complete', items: [
        { name: 'PostgreSQL multi-schema setup', done: true },
        { name: 'Raw schema (24 tables)', done: true },
        { name: 'Master schema (12 tables)', done: true },
        { name: 'CRM schema (13 tables)', done: true },
        { name: 'Trigger chain (raw → master → crm)', done: true },
        { name: 'Audit logging', done: true },
    ]},
    { phase: 'Phase 4-6', name: 'Backend Services', status: 'complete', items: [
        { name: 'ST Automation API', done: true },
        { name: 'ServiceTitan sync fetchers', done: true },
        { name: 'Temporal workflow engine', done: true },
        { name: 'Redis caching', done: true },
        { name: 'Prometheus metrics', done: true },
    ]},
    { phase: 'Phase 7', name: 'CRM & Auth', status: 'in-progress', items: [
        { name: 'CRM API endpoints', done: true },
        { name: 'Auth schema', done: true },
        { name: 'Auth API (login/logout)', done: false },
        { name: 'Frontend auth integration', done: false },
        { name: 'Remove Payload CMS dependency', done: false },
    ]},
    { phase: 'Phase 8', name: 'Integrations', status: 'pending', items: [
        { name: 'QuickBooks OAuth', done: false },
        { name: 'Outbound sync to QuickBooks', done: false },
        { name: 'Stripe payments', done: false },
        { name: 'SMS/Email notifications', done: false },
    ]},
    { phase: 'Phase 9', name: 'Advanced Features', status: 'pending', items: [
        { name: 'Dispatch board UI', done: false },
        { name: 'Technician mobile app', done: false },
        { name: 'Customer portal', done: false },
        { name: 'Reporting dashboard', done: false },
    ]},
];

// Helper Components
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
        healthy: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
        unhealthy: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
        unreachable: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
        unknown: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: AlertCircle },
        degraded: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
    };
    const c = config[status] || config.unknown;
    const Icon = c.icon;
    
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${c.bg} ${c.text}`}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
}

function ServiceCard({ name, status, url, icon: Icon }: { name: string; status: ServiceHealth; url?: string; icon: any }) {
    const isHealthy = status?.status === 'healthy';
    
    return (
        <div className={`bg-gray-800 rounded-lg p-4 border-l-4 ${isHealthy ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isHealthy ? 'text-green-400' : 'text-red-400'}`} />
                    <span className="font-medium">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={status?.status || 'unknown'} />
                    {url && (
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function TimeAgo({ date }: { date: string | null }) {
    if (!date) return <span className="text-gray-500">Never</span>;
    
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return <span className="text-green-400">{seconds}s ago</span>;
    if (seconds < 3600) return <span className="text-green-400">{Math.floor(seconds / 60)}m ago</span>;
    if (seconds < 86400) return <span className="text-yellow-400">{Math.floor(seconds / 3600)}h ago</span>;
    return <span className="text-red-400">{Math.floor(seconds / 86400)}d ago</span>;
}

function DashboardTab() {
    const [data, setData] = useState<SystemData | null>(null);
    const [health, setHealth] = useState<HealthData | null>(null);
    const [workflows, setWorkflows] = useState<WorkflowData | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [serviceUrls, setServiceUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [statsRes, healthRes, workflowsRes, syncRes, urlsRes] = await Promise.all([
                fetch(`${API_URL}/system/schema-stats`).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`${API_URL}/system/health`).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`${API_URL}/system/workflows`).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`${API_URL}/system/sync-status`).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`${API_URL}/system/service-urls`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
            ]);

            setData(statsRes);
            setHealth(healthRes);
            setWorkflows(workflowsRes);
            setSyncStatus(syncRes);
            setServiceUrls(urlsRes);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        
        if (autoRefresh) {
            const interval = setInterval(fetchData, 30000);
            return () => clearInterval(interval);
        }
    }, [fetchData, autoRefresh]);

    const totalRows = data?.schemas.reduce((sum, s) => sum + Number(s.row_count || 0), 0) || 0;
    const totalTables = data?.schemas.reduce((sum, s) => sum + Number(s.table_count || 0), 0) || 0;

    const completedItems = buildProgress.flatMap(p => p.items).filter(i => i.done).length;
    const totalItems = buildProgress.flatMap(p => p.items).length;
    const progressPercent = Math.round((completedItems / totalItems) * 100);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400">Real-time monitoring & build progress</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                            autoRefresh ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                        }`}
                    >
                        {autoRefresh ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        Auto-refresh
                    </button>
                    <span className="text-sm text-gray-500">
                        Updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Layers className="w-5 h-5 text-blue-400" />
                        <span className="text-gray-400">Schemas</span>
                    </div>
                    <div className="text-3xl font-bold">9</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Box className="w-5 h-5 text-green-400" />
                        <span className="text-gray-400">Tables</span>
                    </div>
                    <div className="text-3xl font-bold">{totalTables}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <span className="text-gray-400">Total Rows</span>
                    </div>
                    <div className="text-3xl font-bold">{totalRows.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <GitBranch className="w-5 h-5 text-yellow-400" />
                        <span className="text-gray-400">Build Progress</span>
                    </div>
                    <div className="text-3xl font-bold">{progressPercent}%</div>
                </div>
            </div>

            {/* Service Health */}
            {health && (
                <div className="bg-gray-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-400" />
                        Service Health
                        <StatusBadge status={health.status} />
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <ServiceCard 
                            name="PostgreSQL" 
                            status={health.services?.database || { status: 'unknown' }} 
                            url={serviceUrls.supabase}
                            icon={Database}
                        />
                        <ServiceCard 
                            name="Redis" 
                            status={health.services?.redis || { status: 'unknown' }} 
                            icon={Zap}
                        />
                        <ServiceCard 
                            name="Temporal" 
                            status={health.services?.temporal || { status: 'unknown' }} 
                            url={serviceUrls.temporal}
                            icon={GitBranch}
                        />
                        <ServiceCard 
                            name="Prometheus" 
                            status={health.services?.prometheus || { status: 'unknown' }} 
                            url={serviceUrls.prometheus}
                            icon={Activity}
                        />
                        <ServiceCard 
                            name="Grafana" 
                            status={health.services?.grafana || { status: 'unknown' }} 
                            url={serviceUrls.grafana}
                            icon={BarChart3}
                        />
                        <ServiceCard 
                            name="Metabase" 
                            status={health.services?.metabase || { status: 'unknown' }} 
                            url={serviceUrls.metabase}
                            icon={Table2}
                        />
                    </div>
                </div>
            )}

            {/* Data Flow Visualization */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Data Flow Chain
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    {/* ServiceTitan */}
                    <div className="bg-indigo-900/30 border border-indigo-500 rounded-xl p-4 text-center min-w-[140px]">
                        <div className="text-2xl mb-1">🏢</div>
                        <div className="text-indigo-300 font-semibold text-sm">ServiceTitan</div>
                        <div className="text-gray-500 text-xs">External API</div>
                    </div>

                    <ArrowRight className="w-6 h-6 text-blue-400" />

                    {/* RAW */}
                    <div className={`rounded-xl p-4 text-center min-w-[140px] border-2 ${schemaConfig.raw.bgColor} ${schemaConfig.raw.borderColor}`}>
                        <div className="text-2xl mb-1">{schemaConfig.raw.icon}</div>
                        <div className={`font-semibold text-sm ${schemaConfig.raw.color}`}>raw.*</div>
                        <div className="text-gray-500 text-xs">
                            {data?.schemas.find(s => s.schema === 'raw')?.row_count?.toLocaleString() || '0'} rows
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight className="w-6 h-6 text-blue-400" />
                        <span className="text-xs text-gray-500">trigger</span>
                    </div>

                    {/* MASTER */}
                    <div className={`rounded-xl p-4 text-center min-w-[140px] border-2 ${schemaConfig.master.bgColor} ${schemaConfig.master.borderColor}`}>
                        <div className="text-2xl mb-1">{schemaConfig.master.icon}</div>
                        <div className={`font-semibold text-sm ${schemaConfig.master.color}`}>master.*</div>
                        <div className="text-gray-500 text-xs">
                            {data?.schemas.find(s => s.schema === 'master')?.row_count?.toLocaleString() || '0'} rows
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight className="w-6 h-6 text-green-400" />
                        <span className="text-xs text-gray-500">trigger</span>
                    </div>

                    {/* CRM */}
                    <div className={`rounded-xl p-4 text-center min-w-[140px] border-2 ${schemaConfig.crm.bgColor} ${schemaConfig.crm.borderColor}`}>
                        <div className="text-2xl mb-1">{schemaConfig.crm.icon}</div>
                        <div className={`font-semibold text-sm ${schemaConfig.crm.color}`}>crm.*</div>
                        <div className="text-gray-500 text-xs">
                            {data?.schemas.find(s => s.schema === 'crm')?.row_count?.toLocaleString() || '0'} rows
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight className="w-6 h-6 text-purple-400" />
                        <span className="text-xs text-gray-500">trigger</span>
                    </div>

                    {/* AUDIT */}
                    <div className={`rounded-xl p-4 text-center min-w-[140px] border-2 ${schemaConfig.audit.bgColor} ${schemaConfig.audit.borderColor}`}>
                        <div className="text-2xl mb-1">{schemaConfig.audit.icon}</div>
                        <div className={`font-semibold text-sm ${schemaConfig.audit.color}`}>audit.*</div>
                        <div className="text-gray-500 text-xs">
                            {data?.schemas.find(s => s.schema === 'audit')?.row_count?.toLocaleString() || '0'} logs
                        </div>
                    </div>
                </div>

            </div>

            {/* Schema Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.schemas.map((schema) => {
                    const config = schemaConfig[schema.schema] || schemaConfig.public;
                    const tables = data.tables.filter(t => t.schema === schema.schema);
                    const isExpanded = expandedSchema === schema.schema;

                    return (
                        <div
                            key={schema.schema}
                            className={`bg-gray-800 rounded-xl p-5 border-l-4 ${config.borderColor} cursor-pointer transition-all hover:bg-gray-750`}
                            onClick={() => setExpandedSchema(isExpanded ? null : schema.schema)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{config.icon}</span>
                                    <h3 className={`text-lg font-bold ${config.color}`}>
                                        {schema.schema.toUpperCase()}
                                    </h3>
                                </div>
                                <span className={`${config.bgColor} ${config.color} px-2 py-1 rounded text-xs`}>
                                    {schema.table_count} tables
                                </span>
                            </div>

                            <p className="text-gray-400 text-sm mb-3">{config.description}</p>

                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Rows:</span>
                                <span className="text-white font-medium">
                                    {Number(schema.row_count || 0).toLocaleString()}
                                </span>
                            </div>

                            {isExpanded && tables.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <div className="text-xs text-gray-500 mb-2">Tables:</div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {tables.map((table) => (
                                            <div key={table.table_name} className="flex justify-between text-xs">
                                                <span className="text-gray-400">{table.table_name}</span>
                                                <span className="text-gray-500">{Number(table.row_count).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Sync Status & Workflows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sync Status */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-cyan-400" />
                        Last Sync
                    </h2>
                    <div className="space-y-3">
                        {syncStatus?.lastSync?.map((sync) => (
                            <div key={sync.entity} className="flex items-center justify-between">
                                <span className="text-gray-300 capitalize">{sync.entity}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-500 text-sm">{Number(sync.total_records).toLocaleString()} records</span>
                                    <TimeAgo date={sync.last_sync} />
                                </div>
                            </div>
                        )) || (
                            <div className="text-gray-500 text-sm">No sync data available</div>
                        )}
                    </div>
                </div>

                {/* Workflows */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-pink-400" />
                        Workflows
                        {serviceUrls.temporal && (
                            <a 
                                href={serviceUrls.temporal}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                Open Temporal <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </h2>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-400">{workflows?.running || 0}</div>
                            <div className="text-xs text-gray-400">Running</div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-400">{workflows?.completed || 0}</div>
                            <div className="text-xs text-gray-400">Completed</div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-400">{workflows?.failed || 0}</div>
                            <div className="text-xs text-gray-400">Failed</div>
                        </div>
                    </div>
                    {workflows?.definitions && workflows.definitions.length > 0 && (
                        <div className="space-y-2">
                            {workflows.definitions.slice(0, 5).map((def) => (
                                <div key={def.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        {def.is_active ? (
                                            <CheckCircle className="w-3 h-3 text-green-400" />
                                        ) : (
                                            <XCircle className="w-3 h-3 text-gray-500" />
                                        )}
                                        <span className="text-gray-300">{def.name}</span>
                                    </div>
                                    <TimeAgo date={def.last_run_at} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Tools */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-violet-400" />
                    Quick Tools
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        { name: 'Grafana', url: serviceUrls.grafana || 'http://localhost:3031', icon: BarChart3, color: 'text-orange-400', desc: 'Dashboards' },
                        { name: 'Prometheus', url: serviceUrls.prometheus || 'http://localhost:9090', icon: Activity, color: 'text-red-400', desc: 'Metrics' },
                        { name: 'Temporal', url: serviceUrls.temporal || 'http://localhost:8088', icon: GitBranch, color: 'text-purple-400', desc: 'Workflows' },
                        { name: 'Metabase', url: serviceUrls.metabase || 'http://localhost:3030', icon: Table2, color: 'text-blue-400', desc: 'Analytics' },
                        { name: 'Supabase', url: serviceUrls.supabase || 'http://localhost:54323', icon: Database, color: 'text-green-400', desc: 'Database' },
                    ].map((tool) => (
                        <a
                            key={tool.name}
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <tool.icon className={`w-6 h-6 ${tool.color}`} />
                                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                            <div className="font-medium">{tool.name}</div>
                            <div className="text-xs text-gray-500">{tool.desc}</div>
                        </a>
                    ))}
                </div>
            </div>

            {/* Quick Database Links */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-green-400" />
                    Quick Database Links
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <a
                        href="http://localhost:54323/project/default/editor/master.customers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-3 bg-gray-700/50 hover:bg-gray-700 transition-colors group"
                    >
                        <div className="space-y-1 mt-3">
                            <div className="flex items-center gap-2">
                                <Table2 className="w-4 h-4 text-cyan-400" />
                                <span className="font-medium text-cyan-400">Customers</span>
                                <ExternalLink className="w-3 h-3 ml-auto text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                            <div className="text-xs text-gray-500">master.customers table</div>
                        </div>
                    </a>
                </div>
            </div>

            {/* Build Progress */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-green-400" />
                    Build Progress
                    <span className="ml-auto text-sm font-normal text-gray-400">
                        {completedItems}/{totalItems} tasks ({progressPercent}%)
                    </span>
                </h2>

                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-3 mb-6">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {buildProgress.map((phase) => {
                        const phaseComplete = phase.items.filter(i => i.done).length;
                        const phaseTotal = phase.items.length;

                        return (
                            <div key={phase.phase} className="bg-gray-700/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-xs text-gray-500">{phase.phase}</span>
                                        <h4 className="font-semibold">{phase.name}</h4>
                                    </div>
                                    {phase.status === 'complete' && (
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                    )}
                                    {phase.status === 'in-progress' && (
                                        <Clock className="w-5 h-5 text-yellow-400" />
                                    )}
                                    {phase.status === 'pending' && (
                                        <AlertCircle className="w-5 h-5 text-gray-500" />
                                    )}
                                </div>

                                <div className="text-xs text-gray-400 mb-2">
                                    {phaseComplete}/{phaseTotal} complete
                                </div>

                                <div className="space-y-1">
                                    {phase.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            {item.done ? (
                                                <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                            ) : (
                                                <div className="w-3 h-3 rounded-full border border-gray-500 flex-shrink-0" />
                                            )}
                                            <span className={item.done ? 'text-gray-400' : 'text-gray-300'}>
                                                {item.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function SchemaVisualizationTab() {
    const schemas = [
        { name: 'raw', icon: '📥', color: 'blue', desc: 'ServiceTitan API data (immutable)', tables: ['st_customers', 'st_jobs', 'st_invoices', 'st_estimates', 'st_locations', 'st_technicians', 'st_appointments', 'st_payments', 'st_contacts', 'st_business_units', 'st_campaigns', 'st_job_types', 'st_tag_types', 'st_employees', 'st_memberships', 'st_equipment', 'st_materials', 'st_services', 'st_projects', 'st_timesheets', 'st_payroll', 'st_purchase_orders', 'st_vendors', 'st_inventory'] },
        { name: 'master', icon: '📊', color: 'cyan', desc: 'Denormalized business data', tables: ['customers', 'jobs', 'invoices', 'estimates', 'locations', 'technicians', 'business_units', 'campaigns', 'job_types'] },
        { name: 'crm', icon: '👤', color: 'green', desc: 'User-editable CRM data', tables: ['contacts', 'contact_overrides', 'opportunities', 'pipelines', 'pipeline_stages', 'activities', 'notes', 'tags', 'contact_tags', 'custom_fields', 'contact_custom_fields', 'lists', 'list_members'] },
        { name: 'audit', icon: '📋', color: 'purple', desc: 'Change tracking & history', tables: ['change_log', 'sync_log'] },
        { name: 'auth', icon: '🔐', color: 'yellow', desc: 'User authentication', tables: ['users', 'sessions', 'roles', 'permissions', 'user_roles'] },
        { name: 'workflow', icon: '⚙️', color: 'pink', desc: 'Automation definitions', tables: ['definitions', 'triggers', 'actions', 'executions', 'execution_logs'] },
        { name: 'sync', icon: '📤', color: 'orange', desc: 'Outbound sync queue', tables: ['outbound_queue', 'history', 'mappings', 'credentials'] },
        { name: 'integrations', icon: '🔑', color: 'violet', desc: 'OAuth tokens & webhooks', tables: ['oauth_tokens', 'webhooks', 'webhook_logs', 'api_keys'] },
    ];

    const dataFlows = [
        { from: 'ServiceTitan API', to: 'raw', label: 'Fetch & Store', color: 'blue' },
        { from: 'raw', to: 'master', label: 'Trigger: Denormalize', color: 'cyan' },
        { from: 'master', to: 'crm', label: 'Trigger: Auto-create', color: 'green' },
        { from: 'crm', to: 'audit', label: 'Trigger: Log changes', color: 'purple' },
        { from: 'crm', to: 'sync', label: 'Queue outbound', color: 'orange' },
    ];

    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500/20 border-blue-500 text-blue-400',
        cyan: 'bg-cyan-500/20 border-cyan-500 text-cyan-400',
        green: 'bg-green-500/20 border-green-500 text-green-400',
        purple: 'bg-purple-500/20 border-purple-500 text-purple-400',
        yellow: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
        pink: 'bg-pink-500/20 border-pink-500 text-pink-400',
        orange: 'bg-orange-500/20 border-orange-500 text-orange-400',
        violet: 'bg-violet-500/20 border-violet-500 text-violet-400',
    };

    return (
        <div className="space-y-6">
            {/* Data Flow Diagram */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6 text-center">Data Flow Architecture</h2>
                
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {/* ServiceTitan */}
                    <div className="bg-indigo-900/30 border-2 border-indigo-500 rounded-xl p-4 text-center min-w-[120px]">
                        <div className="text-2xl mb-1">🏢</div>
                        <div className="text-indigo-300 font-semibold text-sm">ServiceTitan</div>
                        <div className="text-gray-500 text-xs">External API</div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight className="w-6 h-6 text-blue-400" />
                        <span className="text-xs text-blue-400">fetch</span>
                    </div>

                    {/* RAW */}
                    <div className={`rounded-xl p-4 text-center min-w-[120px] border-2 ${colorMap.blue}`}>
                        <div className="text-2xl mb-1">📥</div>
                        <div className="font-semibold text-sm">raw.*</div>
                        <div className="text-gray-500 text-xs">24 tables</div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight className="w-6 h-6 text-cyan-400" />
                        <span className="text-xs text-cyan-400">trigger</span>
                    </div>

                    {/* MASTER */}
                    <div className={`rounded-xl p-4 text-center min-w-[120px] border-2 ${colorMap.cyan}`}>
                        <div className="text-2xl mb-1">📊</div>
                        <div className="font-semibold text-sm">master.*</div>
                        <div className="text-gray-500 text-xs">9 tables</div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight className="w-6 h-6 text-green-400" />
                        <span className="text-xs text-green-400">trigger</span>
                    </div>

                    {/* CRM */}
                    <div className={`rounded-xl p-4 text-center min-w-[120px] border-2 ${colorMap.green}`}>
                        <div className="text-2xl mb-1">👤</div>
                        <div className="font-semibold text-sm">crm.*</div>
                        <div className="text-gray-500 text-xs">13 tables</div>
                    </div>

                    <div className="flex flex-col items-center">
                        <ArrowRight className="w-6 h-6 text-purple-400" />
                        <span className="text-xs text-purple-400">trigger</span>
                    </div>

                    {/* AUDIT */}
                    <div className={`rounded-xl p-4 text-center min-w-[120px] border-2 ${colorMap.purple}`}>
                        <div className="text-2xl mb-1">📋</div>
                        <div className="font-semibold text-sm">audit.*</div>
                        <div className="text-gray-500 text-xs">2 tables</div>
                    </div>
                </div>

                {/* Secondary flows */}
                <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-2 border ${colorMap.green}`}>👤 crm</div>
                        <ArrowRight className="w-4 h-4 text-orange-400" />
                        <div className={`rounded-lg p-2 border ${colorMap.orange}`}>📤 sync</div>
                        <span className="text-xs text-gray-500 ml-2">→ QuickBooks, etc.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-2 border ${colorMap.yellow}`}>🔐 auth</div>
                        <span className="text-xs text-gray-500 ml-2">User sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-2 border ${colorMap.pink}`}>⚙️ workflow</div>
                        <span className="text-xs text-gray-500 ml-2">Automations</span>
                    </div>
                </div>
            </div>

            {/* Schema Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {schemas.map((schema) => (
                    <div 
                        key={schema.name}
                        className={`rounded-xl p-5 border-2 ${colorMap[schema.color]} hover:scale-[1.02] transition-transform cursor-pointer`}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{schema.icon}</span>
                            <h3 className="text-lg font-bold uppercase">{schema.name}</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{schema.desc}</p>
                        <div className="text-xs text-gray-500 mb-2">{schema.tables.length} tables:</div>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                            {schema.tables.map((table) => (
                                <span key={table} className="bg-gray-700/50 px-2 py-0.5 rounded text-xs text-gray-300">
                                    {table}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Trigger Chain */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Trigger Chain</h2>
                <div className="space-y-3">
                    {[
                        { trigger: 'sync_customer_to_master()', from: 'raw.st_customers', to: 'master.customers', desc: 'Merges contacts + primary location' },
                        { trigger: 'sync_job_to_master()', from: 'raw.st_jobs', to: 'master.jobs', desc: 'Merges appointments + technician assignments' },
                        { trigger: 'sync_invoice_to_master()', from: 'raw.st_invoices', to: 'master.invoices', desc: 'Merges payment summary' },
                        { trigger: 'sync_estimate_to_master()', from: 'raw.st_estimates', to: 'master.estimates', desc: 'Merges customer name + sold_by' },
                        { trigger: 'auto_create_contact()', from: 'master.customers', to: 'crm.contacts', desc: 'Creates CRM contact from customer' },
                        { trigger: 'log_changes()', from: 'crm.*', to: 'audit.change_log', desc: 'Tracks all CRM modifications' },
                    ].map((t, i) => (
                        <div key={i} className="flex items-center gap-4 bg-gray-700/30 rounded-lg p-3">
                            <code className="text-cyan-400 text-sm font-mono">{t.trigger}</code>
                            <span className="text-gray-500">:</span>
                            <span className="text-blue-400 text-sm">{t.from}</span>
                            <ArrowRight className="w-4 h-4 text-gray-500" />
                            <span className="text-green-400 text-sm">{t.to}</span>
                            <span className="text-gray-500 text-sm ml-auto">{t.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Storage key for persisting roadmap state
const ROADMAP_STORAGE_KEY = 'perfect-catch-roadmap-state';

interface ModuleState {
    done: boolean;
    notes: string;
}

interface RoadmapState {
    modules: Record<string, ModuleState>;
    lastUpdated: string;
}

function SystemRoadmapTab() {
    const SUPABASE_STUDIO_URL = 'http://localhost:54323/project/default/editor';
    const GRAFANA_URL = 'http://localhost:3031';
    
    const [roadmapState, setRoadmapState] = useState<RoadmapState>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(ROADMAP_STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        }
        return { modules: {}, lastUpdated: new Date().toISOString() };
    });
    
    const [selectedModule, setSelectedModule] = useState<{ phase: string; name: string } | null>(null);
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [editingNotes, setEditingNotes] = useState('');
    const [showGrafana, setShowGrafana] = useState(false);
    const [grafanaPanel, setGrafanaPanel] = useState('system-overview');

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(roadmapState));
        }
    }, [roadmapState]);

    const toggleModuleStatus = (moduleKey: string) => {
        setRoadmapState(prev => ({
            ...prev,
            modules: {
                ...prev.modules,
                [moduleKey]: {
                    done: !prev.modules[moduleKey]?.done,
                    notes: prev.modules[moduleKey]?.notes || ''
                }
            },
            lastUpdated: new Date().toISOString()
        }));
    };

    const updateModuleNotes = (moduleKey: string, notes: string) => {
        setRoadmapState(prev => ({
            ...prev,
            modules: {
                ...prev.modules,
                [moduleKey]: {
                    done: prev.modules[moduleKey]?.done || false,
                    notes
                }
            },
            lastUpdated: new Date().toISOString()
        }));
    };

    const getModuleKey = (phase: string, moduleName: string) => `${phase}-${moduleName}`;
    
    const isModuleDone = (phase: string, moduleName: string, defaultDone: boolean) => {
        const key = getModuleKey(phase, moduleName);
        return roadmapState.modules[key]?.done ?? defaultDone;
    };

    const getModuleNotes = (phase: string, moduleName: string) => {
        const key = getModuleKey(phase, moduleName);
        return roadmapState.modules[key]?.notes || '';
    };

    const initialPhases = [
        {
            phase: 'Phase 1',
            name: 'Core Foundation',
            weeks: '1-4',
            modules: [
                { name: 'Customer Management', priority: 'HIGH', complexity: 'Low', time: '1 week', defaultDone: true, desc: 'Customer CRUD, search, contacts' },
                { name: 'Location Management', priority: 'HIGH', complexity: 'Low', time: '0.5 week', defaultDone: true, desc: 'Service locations, equipment tracking' },
                { name: 'Job Management', priority: 'HIGH', complexity: 'Medium', time: '1.5 weeks', defaultDone: true, desc: 'Jobs, assignments, status workflow' },
                { name: 'Basic Scheduling', priority: 'HIGH', complexity: 'Medium', time: '1 week', defaultDone: true, desc: 'Appointments, time windows' },
            ]
        },
        {
            phase: 'Phase 2',
            name: 'Financial',
            weeks: '5-8',
            modules: [
                { name: 'Pricebook', priority: 'HIGH', complexity: 'Medium', time: '1 week', defaultDone: true, desc: 'Services, materials, pricing tiers' },
                { name: 'Estimate Builder', priority: 'HIGH', complexity: 'High', time: '2 weeks', defaultDone: true, desc: 'Line items, options, signatures' },
                { name: 'Invoice Management', priority: 'HIGH', complexity: 'Medium', time: '1 week', defaultDone: true, desc: 'Invoices, line items, AR' },
                { name: 'Payment Processing', priority: 'HIGH', complexity: 'Medium', time: '1 week', defaultDone: true, desc: 'Payments, refunds, credits' },
            ]
        },
        {
            phase: 'Phase 3',
            name: 'Dispatch',
            weeks: '9-10',
            modules: [
                { name: 'Dispatch Board', priority: 'HIGH', complexity: 'High', time: '1.5 weeks', defaultDone: false, desc: 'Drag-drop board, technician columns' },
                { name: 'Map Integration', priority: 'MEDIUM', complexity: 'Medium', time: '0.5 week', defaultDone: false, desc: 'Google Maps, route optimization' },
            ]
        },
        {
            phase: 'Phase 4',
            name: 'Mobile',
            weeks: '11-13',
            modules: [
                { name: 'Technician App', priority: 'HIGH', complexity: 'High', time: '3 weeks', defaultDone: false, desc: 'React Native app for field techs' },
            ]
        },
        {
            phase: 'Phase 5',
            name: 'Integrations',
            weeks: '14-16',
            modules: [
                { name: 'QuickBooks Sync', priority: 'HIGH', complexity: 'Medium', time: '1 week', defaultDone: false, desc: 'Bi-directional QB Online sync' },
                { name: 'Payment Gateways', priority: 'HIGH', complexity: 'Low', time: '0.5 week', defaultDone: false, desc: 'Stripe, Square integration' },
                { name: 'SMS/Email', priority: 'MEDIUM', complexity: 'Low', time: '0.5 week', defaultDone: false, desc: 'Twilio, SendGrid messaging' },
                { name: 'Review Requests', priority: 'MEDIUM', complexity: 'Low', time: '0.5 week', defaultDone: false, desc: 'Google/Yelp review automation' },
            ]
        },
        {
            phase: 'Phase 6',
            name: 'Advanced',
            weeks: '17-20',
            modules: [
                { name: 'CRM/Sales Pipeline', priority: 'MEDIUM', complexity: 'Medium', time: '1 week', defaultDone: false, desc: 'Leads, opportunities, pipeline stages' },
                { name: 'Memberships', priority: 'MEDIUM', complexity: 'Medium', time: '1 week', defaultDone: false, desc: 'Plans, benefits, recurring billing' },
                { name: 'Inventory', priority: 'LOW', complexity: 'High', time: '2 weeks', defaultDone: false, desc: 'Stock levels, POs, truck inventory' },
                { name: 'Reporting', priority: 'MEDIUM', complexity: 'Medium', time: '1 week', defaultDone: false, desc: 'Custom reports, dashboards' },
            ]
        },
    ];

    const dbSchemas = [
        { name: 'raw', desc: 'ServiceTitan API Data', tables: ['st_customers', 'st_jobs', 'st_invoices', 'st_estimates', 'st_locations', 'st_technicians'], color: 'blue', exists: true },
        { name: 'master', desc: 'Denormalized Business Data', tables: ['customers', 'jobs', 'invoices', 'estimates', 'locations', 'technicians'], color: 'cyan', exists: true },
        { name: 'crm', desc: 'CRM & Sales', tables: ['contacts', 'pipelines', 'opportunities', 'activities', 'pipeline_stages'], color: 'green', exists: true },
        { name: 'audit', desc: 'Change Tracking', tables: ['change_log', 'sync_log'], color: 'purple', exists: true },
        { name: 'auth', desc: 'Authentication', tables: ['users', 'roles', 'permissions', 'user_sessions'], color: 'yellow', exists: true },
        { name: 'workflow', desc: 'Automation', tables: ['definitions', 'triggers', 'executions'], color: 'pink', exists: true },
        { name: 'sync', desc: 'Outbound Sync', tables: ['outbound_queue', 'history', 'mappings'], color: 'orange', exists: true },
        { name: 'integrations', desc: 'External Systems', tables: ['oauth_tokens', 'webhooks', 'api_keys'], color: 'red', exists: true },
        { name: 'config', desc: 'System Settings', tables: ['company_settings', 'business_units', 'feature_flags'], color: 'teal', exists: true },
        { name: 'pricebook', desc: 'Pricing & Catalog', tables: ['categories', 'services', 'materials', 'equipment'], color: 'lime', exists: false },
        { name: 'inventory', desc: 'Stock Management', tables: ['warehouses', 'stock_levels', 'purchase_orders'], color: 'amber', exists: false },
        { name: 'hr', desc: 'Employee Management', tables: ['employees', 'schedules', 'time_entries', 'commissions'], color: 'indigo', exists: false },
        { name: 'dispatch', desc: 'Scheduling & Routes', tables: ['zones', 'capacity_blocks', 'route_stops'], color: 'rose', exists: false },
    ];

    const grafanaPanels = [
        { id: 'system-overview', name: 'System Overview', dashboardId: 1 },
        { id: 'database-metrics', name: 'Database Metrics', dashboardId: 2 },
        { id: 'sync-status', name: 'Sync Status', dashboardId: 3 },
        { id: 'api-performance', name: 'API Performance', dashboardId: 4 },
    ];

    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500/20 border-blue-500 text-blue-400',
        cyan: 'bg-cyan-500/20 border-cyan-500 text-cyan-400',
        green: 'bg-green-500/20 border-green-500 text-green-400',
        purple: 'bg-purple-500/20 border-purple-500 text-purple-400',
        yellow: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
        pink: 'bg-pink-500/20 border-pink-500 text-pink-400',
        orange: 'bg-orange-500/20 border-orange-500 text-orange-400',
        red: 'bg-red-500/20 border-red-500 text-red-400',
        teal: 'bg-teal-500/20 border-teal-500 text-teal-400',
        lime: 'bg-lime-500/20 border-lime-500 text-lime-400',
        amber: 'bg-amber-500/20 border-amber-500 text-amber-400',
        indigo: 'bg-indigo-500/20 border-indigo-500 text-indigo-400',
        rose: 'bg-rose-500/20 border-rose-500 text-rose-400',
        gray: 'bg-gray-500/20 border-gray-500 text-gray-400',
        violet: 'bg-violet-500/20 border-violet-500 text-violet-400',
    };

    const totalModules = initialPhases.flatMap(p => p.modules).length;
    const completedModules = initialPhases.reduce((count, phase) => {
        return count + phase.modules.filter(m => isModuleDone(phase.phase, m.name, m.defaultDone)).length;
    }, 0);
    const progressPercent = Math.round((completedModules / totalModules) * 100);

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Overall Progress</div>
                    <div className="text-3xl font-bold text-blue-400">{progressPercent}%</div>
                    <div className="text-xs text-gray-500 mt-1">{completedModules}/{totalModules} modules</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Database Schemas</div>
                    <div className="text-3xl font-bold text-green-400">13</div>
                    <div className="text-xs text-gray-500 mt-1">Organized by domain</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Est. Timeline</div>
                    <div className="text-3xl font-bold text-purple-400">8 wks</div>
                    <div className="text-xs text-gray-500 mt-1">With AI tools (10x)</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Current Phase</div>
                    <div className="text-3xl font-bold text-yellow-400">3</div>
                    <div className="text-xs text-gray-500 mt-1">Dispatch & Scheduling</div>
                </div>
            </div>

            {/* System Architecture */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">System Architecture</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Clients */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">CLIENTS</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { name: 'Web App', desc: 'Office Staff', tech: 'Next.js' },
                                { name: 'Tech App', desc: 'Mobile', tech: 'React Native' },
                                { name: 'Customer Portal', desc: 'Self-service', tech: 'Next.js' },
                                { name: 'Admin Console', desc: 'Super Admin', tech: 'React' },
                            ].map((client) => (
                                <div key={client.name} className="bg-gray-800 rounded p-2 text-center">
                                    <div className="text-sm font-medium">{client.name}</div>
                                    <div className="text-xs text-gray-500">{client.desc}</div>
                                    <div className="text-xs text-blue-400">{client.tech}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Services */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">SERVICE LAYER</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Customer', 'Job', 'Dispatch', 'Estimate', 'Invoice', 'Payment', 'Inventory', 'Employee', 'Messaging', 'Reporting'].map((svc) => (
                                <span key={svc} className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                                    {svc}
                                </span>
                            ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="text-xs text-gray-500 mb-2">WORKFLOW LAYER</div>
                            <div className="flex gap-2">
                                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs">Temporal</span>
                                <span className="text-xs text-gray-500">Sync • Notifications • Automation</span>
                            </div>
                        </div>
                    </div>

                    {/* Data Layer */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">DATA LAYER</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-blue-400" />
                                <span className="text-sm">PostgreSQL</span>
                                <span className="text-xs text-gray-500 ml-auto">Primary DB</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-red-400" />
                                <span className="text-sm">Redis</span>
                                <span className="text-xs text-gray-500 ml-auto">Cache</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm">S3/Minio</span>
                                <span className="text-xs text-gray-500 ml-auto">Files</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="text-xs text-gray-500 mb-2">INTEGRATIONS</div>
                            <div className="flex flex-wrap gap-1">
                                {['QuickBooks', 'Stripe', 'Twilio', 'Google', 'Zapier'].map((int) => (
                                    <span key={int} className="bg-gray-600 px-2 py-0.5 rounded text-xs">{int}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Schema Organization - Interactive */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Database Schema Organization</h2>
                    <a 
                        href={SUPABASE_STUDIO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                        <Database className="w-4 h-4" />
                        Open Supabase Studio
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {dbSchemas.map((schema) => (
                        <div 
                            key={schema.name} 
                            className={`rounded-lg p-3 border cursor-pointer transition-all hover:scale-[1.02] ${colorMap[schema.color]} ${selectedSchema === schema.name ? 'ring-2 ring-white' : ''}`}
                            onClick={() => setSelectedSchema(selectedSchema === schema.name ? null : schema.name)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold uppercase text-sm">{schema.name}</span>
                                <div className="flex items-center gap-2">
                                    {schema.exists ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-gray-500" />
                                    )}
                                    <span className="text-xs opacity-70">{schema.tables.length}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 mb-2">{schema.desc}</div>
                            {selectedSchema === schema.name ? (
                                <div className="space-y-1 mt-3 pt-3 border-t border-gray-600">
                                    {schema.tables.map((table) => (
                                        <a
                                            key={table}
                                            href={`${SUPABASE_STUDIO_URL}/${schema.name}.${table}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs hover:text-white transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Table2 className="w-3 h-3" />
                                            {table}
                                            <ExternalLink className="w-2 h-2 ml-auto opacity-50" />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-1">
                                    {schema.tables.slice(0, 3).map((t) => (
                                        <span key={t} className="bg-gray-700/50 px-1.5 py-0.5 rounded text-xs">{t}</span>
                                    ))}
                                    {schema.tables.length > 3 && (
                                        <span className="text-xs text-gray-500">+{schema.tables.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Development Phases - Interactive */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Development Roadmap</h2>
                    <span className="text-xs text-gray-500">Click modules to toggle status & add notes</span>
                </div>
                <div className="space-y-4">
                    {initialPhases.map((phase) => {
                        const phaseComplete = phase.modules.filter(m => isModuleDone(phase.phase, m.name, m.defaultDone)).length;
                        const phaseTotal = phase.modules.length;
                        const phasePercent = Math.round((phaseComplete / phaseTotal) * 100);
                        const phaseStatus = phasePercent === 100 ? 'complete' : phasePercent > 0 ? 'in-progress' : 'pending';
                        
                        return (
                            <div key={phase.phase} className="bg-gray-700/30 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500">{phase.phase}</span>
                                        <span className="font-semibold">{phase.name}</span>
                                        <span className="text-xs text-gray-500">Weeks {phase.weeks}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">{phaseComplete}/{phaseTotal}</span>
                                        {phaseStatus === 'complete' && <CheckCircle className="w-5 h-5 text-green-400" />}
                                        {phaseStatus === 'in-progress' && <Clock className="w-5 h-5 text-yellow-400" />}
                                        {phaseStatus === 'pending' && <AlertCircle className="w-5 h-5 text-gray-500" />}
                                    </div>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
                                    <div 
                                        className={`h-1.5 rounded-full transition-all ${phaseStatus === 'complete' ? 'bg-green-500' : phaseStatus === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-600'}`}
                                        style={{ width: `${phasePercent}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {phase.modules.map((mod) => {
                                        const moduleKey = getModuleKey(phase.phase, mod.name);
                                        const isDone = isModuleDone(phase.phase, mod.name, mod.defaultDone);
                                        const notes = getModuleNotes(phase.phase, mod.name);
                                        const isSelected = selectedModule?.phase === phase.phase && selectedModule?.name === mod.name;
                                        
                                        return (
                                            <div 
                                                key={mod.name} 
                                                className={`rounded-lg p-3 cursor-pointer transition-all ${isSelected ? 'bg-gray-600 ring-1 ring-blue-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedModule(null);
                                                    } else {
                                                        setSelectedModule({ phase: phase.phase, name: mod.name });
                                                        setEditingNotes(notes);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleModuleStatus(moduleKey);
                                                        }}
                                                        className="flex-shrink-0"
                                                    >
                                                        {isDone ? (
                                                            <CheckCircle className="w-5 h-5 text-green-400 hover:text-green-300" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-gray-500 hover:border-green-400" />
                                                        )}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
                                                            {mod.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{mod.desc}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                                            mod.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : 
                                                            mod.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'
                                                        }`}>{mod.priority}</span>
                                                        <span className="text-xs text-gray-500">{mod.time}</span>
                                                    </div>
                                                </div>
                                                {notes && !isSelected && (
                                                    <div className="mt-2 text-xs text-gray-400 bg-gray-800/50 rounded p-2 truncate">
                                                        📝 {notes}
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className="mt-3 pt-3 border-t border-gray-600" onClick={(e) => e.stopPropagation()}>
                                                        <label className="text-xs text-gray-400 mb-1 block">Notes:</label>
                                                        <textarea
                                                            value={editingNotes}
                                                            onChange={(e) => setEditingNotes(e.target.value)}
                                                            onBlur={() => updateModuleNotes(moduleKey, editingNotes)}
                                                            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white resize-none"
                                                            rows={3}
                                                            placeholder="Add implementation notes..."
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grafana Dashboard */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-orange-400" />
                        Live Monitoring
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            {grafanaPanels.map((panel) => (
                                <button
                                    key={panel.id}
                                    onClick={() => setGrafanaPanel(panel.id)}
                                    className={`px-3 py-1 text-xs rounded ${grafanaPanel === panel.id ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                >
                                    {panel.name}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowGrafana(!showGrafana)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${showGrafana ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                        >
                            {showGrafana ? 'Hide' : 'Show'} Dashboard
                        </button>
                        <a 
                            href={GRAFANA_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
                        >
                            Open Grafana <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
                {showGrafana && (
                    <div className="rounded-lg overflow-hidden border border-gray-700">
                        <iframe
                            src={`${GRAFANA_URL}/d-solo/1/system-overview?orgId=1&refresh=5s&theme=dark&panelId=1`}
                            width="100%"
                            height="400"
                            frameBorder="0"
                            className="bg-gray-900"
                            title="Grafana Dashboard"
                        />
                    </div>
                )}
                {!showGrafana && (
                    <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Click "Show Dashboard" to embed live Grafana metrics</p>
                        <p className="text-xs mt-1">Requires Grafana to be running at {GRAFANA_URL}</p>
                    </div>
                )}
            </div>

            {/* Tech Stack */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Tech Stack</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                        { layer: 'Frontend (Web)', tech: 'Next.js 14, React, Tailwind', purpose: 'Office management app' },
                        { layer: 'Frontend (Mobile)', tech: 'React Native / Expo', purpose: 'Technician app' },
                        { layer: 'API Gateway', tech: 'Express', purpose: 'Routing, auth' },
                        { layer: 'GraphQL', tech: 'Hasura', purpose: 'Auto-generated queries' },
                        { layer: 'Workflow', tech: 'Temporal', purpose: 'Background jobs' },
                        { layer: 'Database', tech: 'PostgreSQL', purpose: 'Primary data store' },
                        { layer: 'Cache', tech: 'Redis', purpose: 'Caching, sessions' },
                        { layer: 'Monitoring', tech: 'Prometheus, Grafana', purpose: 'Metrics' },
                        { layer: 'BI', tech: 'Metabase', purpose: 'Analytics' },
                    ].map((item) => (
                        <div key={item.layer} className="flex items-center gap-3 text-sm bg-gray-700/30 rounded p-2">
                            <span className="text-gray-400 w-28 flex-shrink-0">{item.layer}</span>
                            <span className="text-blue-400 font-mono text-xs">{item.tech}</span>
                            <span className="text-gray-500 text-xs ml-auto">{item.purpose}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Timeline Summary */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold mb-1">Project Timeline</h2>
                        <p className="text-gray-400 text-sm">Full Field Service Management Platform</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-blue-400">~8 weeks</div>
                        <div className="text-sm text-gray-400">with AI tools (10x speedup)</div>
                        <div className="text-xs text-gray-500">Traditional: ~20 weeks</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Error Handling Tab Component
interface PricebookError {
    id: string;
    type: 'pull' | 'push';
    timestamp: string;
    error: string;
    context: {
        stId?: string;
        itemType?: string;
        operation?: string;
        endpoint?: string;
    };
    status: 'pending' | 'fixing' | 'fixed' | 'failed';
    autoFixAttempts: number;
    resolution?: string;
}

function ErrorHandlingTab() {
    const [errors, setErrors] = useState<PricebookError[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoFixEnabled, setAutoFixEnabled] = useState(false);
    const [fixingId, setFixingId] = useState<string | null>(null);
    const [claudeResponse, setClaudeResponse] = useState<string | null>(null);

    const fetchErrors = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/pricebook/categories/errors`);
            if (res.ok) {
                const data = await res.json();
                setErrors(data.errors || []);
            }
        } catch (err) {
            console.error('Failed to fetch errors:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchErrors();
        const interval = setInterval(fetchErrors, 10000);
        return () => clearInterval(interval);
    }, [fetchErrors]);

    const handleAutoFix = async (error: PricebookError) => {
        setFixingId(error.id);
        setClaudeResponse(null);
        
        try {
            const res = await fetch(`${API_URL}/pricebook/categories/errors/${error.id}/auto-fix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error }),
            });
            
            if (res.ok) {
                const data = await res.json();
                setClaudeResponse(data.analysis || 'Fix applied successfully');
                fetchErrors();
            } else {
                const errData = await res.json();
                setClaudeResponse(`Fix failed: ${errData.error}`);
            }
        } catch (err) {
            setClaudeResponse(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setFixingId(null);
        }
    };

    const clearError = async (errorId: string) => {
        try {
            await fetch(`${API_URL}/pricebook/categories/errors/${errorId}`, {
                method: 'DELETE',
            });
            fetchErrors();
        } catch (err) {
            console.error('Failed to clear error:', err);
        }
    };

    const clearAllErrors = async () => {
        try {
            await fetch(`${API_URL}/pricebook/categories/errors`, {
                method: 'DELETE',
            });
            fetchErrors();
        } catch (err) {
            console.error('Failed to clear errors:', err);
        }
    };

    const pullErrors = errors.filter(e => e.type === 'pull');
    const pushErrors = errors.filter(e => e.type === 'push');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Bug className="w-5 h-5 text-red-400" />
                        Pricebook Error Handling
                    </h2>
                    <p className="text-gray-400 text-sm">Monitor and auto-fix pricebook sync errors</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setAutoFixEnabled(!autoFixEnabled)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                            autoFixEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-400'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Auto-Fix {autoFixEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={clearAllErrors}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear All
                    </button>
                    <button
                        onClick={fetchErrors}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
                    <div className="text-2xl font-bold text-red-400">{errors.length}</div>
                    <div className="text-gray-400 text-sm">Total Errors</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-orange-500">
                    <div className="text-2xl font-bold text-orange-400">{pullErrors.length}</div>
                    <div className="text-gray-400 text-sm">Pull Errors</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="text-2xl font-bold text-yellow-400">{pushErrors.length}</div>
                    <div className="text-gray-400 text-sm">Push Errors</div>
                </div>
            </div>

            {/* Claude Response Panel */}
            {claudeResponse && (
                <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-purple-400">Claude Analysis</span>
                    </div>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap">{claudeResponse}</pre>
                </div>
            )}

            {/* Pull Errors Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-orange-400 rotate-180" />
                    Pull Errors (ServiceTitan → Local)
                </h3>
                {pullErrors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No pull errors</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pullErrors.map((error) => (
                            <div key={error.id} className="bg-gray-700/50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                                error.status === 'fixed' ? 'bg-green-500/20 text-green-400' :
                                                error.status === 'fixing' ? 'bg-yellow-500/20 text-yellow-400' :
                                                error.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {error.status}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(error.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-red-400 font-mono text-sm mb-2">{error.error}</p>
                                        <div className="text-xs text-gray-500">
                                            {error.context.stId && <span>ST ID: {error.context.stId} | </span>}
                                            {error.context.itemType && <span>Type: {error.context.itemType} | </span>}
                                            {error.context.operation && <span>Op: {error.context.operation}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleAutoFix(error)}
                                            disabled={fixingId === error.id}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm disabled:opacity-50"
                                        >
                                            {fixingId === error.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Wrench className="w-4 h-4" />
                                            )}
                                            Auto-Fix
                                        </button>
                                        <button
                                            onClick={() => clearError(error.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Push Errors Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-yellow-400" />
                    Push Errors (Local → ServiceTitan)
                </h3>
                {pushErrors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No push errors</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pushErrors.map((error) => (
                            <div key={error.id} className="bg-gray-700/50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                                error.status === 'fixed' ? 'bg-green-500/20 text-green-400' :
                                                error.status === 'fixing' ? 'bg-yellow-500/20 text-yellow-400' :
                                                error.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {error.status}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(error.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-red-400 font-mono text-sm mb-2">{error.error}</p>
                                        <div className="text-xs text-gray-500">
                                            {error.context.stId && <span>ST ID: {error.context.stId} | </span>}
                                            {error.context.itemType && <span>Type: {error.context.itemType} | </span>}
                                            {error.context.endpoint && <span>Endpoint: {error.context.endpoint}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleAutoFix(error)}
                                            disabled={fixingId === error.id}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm disabled:opacity-50"
                                        >
                                            {fixingId === error.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Wrench className="w-4 h-4" />
                                            )}
                                            Auto-Fix
                                        </button>
                                        <button
                                            onClick={() => clearError(error.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Auto-Fix Info */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold">Claude Code Auto-Fix</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                    When enabled, errors are automatically analyzed by Claude and fixes are attempted.
                    The AI will analyze the error context, identify the root cause, and apply appropriate fixes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-purple-400 font-medium mb-1">Error Analysis</div>
                        <div className="text-gray-500">Parses error messages and stack traces</div>
                    </div>
                    <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-purple-400 font-medium mb-1">Root Cause Detection</div>
                        <div className="text-gray-500">Identifies API issues, data problems, or code bugs</div>
                    </div>
                    <div className="bg-gray-800/50 rounded p-3">
                        <div className="text-purple-400 font-medium mb-1">Automated Fixes</div>
                        <div className="text-gray-500">Retries with corrections or suggests code changes</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DeveloperDashboard() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'schema' | 'roadmap' | 'errors' | 'pricebook' | 'workflows'>('dashboard');

    const tabs = [
        { id: 'dashboard' as const, label: 'Dashboard', icon: FileCode },
        { id: 'pricebook' as const, label: 'Pricebook Sync', icon: BookOpen },
        { id: 'workflows' as const, label: 'Workflow Visualizer', icon: GitBranch },
        { id: 'schema' as const, label: 'Schema Visualization', icon: Network },
        { id: 'roadmap' as const, label: 'System Roadmap', icon: Layers },
        { id: 'errors' as const, label: 'Error Handling', icon: Bug },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Database className="w-8 h-8 text-blue-400" />
                    Developer Dashboard
                </h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors',
                            activeTab === tab.id
                                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'pricebook' && <PricebookDebugPanel />}
            {activeTab === 'workflows' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-8 border border-cyan-500/30">
                        <div className="flex items-center gap-4 mb-4">
                            <GitBranch className="w-12 h-12 text-cyan-400" />
                            <div>
                                <h2 className="text-2xl font-bold">Workflow Visualizer</h2>
                                <p className="text-gray-400">Visual workflow and data flow visualization system</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-cyan-400 font-medium mb-1">📊 Visual Data Flow</div>
                                <div className="text-gray-400 text-sm">See how data flows through ServiceTitan → raw → master → crm → audit</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-cyan-400 font-medium mb-1">⚡ Real-time Stats</div>
                                <div className="text-gray-400 text-sm">Live row counts and sync status updated every 30 seconds</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-cyan-400 font-medium mb-1">🎨 Drag & Drop</div>
                                <div className="text-gray-400 text-sm">Visual editing with React Flow canvas</div>
                            </div>
                        </div>
                        <Link
                            href="/workflows"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors font-medium"
                        >
                            <GitBranch className="w-5 h-5" />
                            Open Workflow Visualizer
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium">Visual Canvas</div>
                                    <div className="text-sm text-gray-400">Drag-and-drop nodes, connect with edges</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium">Live Data</div>
                                    <div className="text-sm text-gray-400">Real-time row counts on database nodes</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium">Node Types</div>
                                    <div className="text-sm text-gray-400">API Source, Database, Trigger, Frontend, Transform</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium">Import/Export</div>
                                    <div className="text-sm text-gray-400">Save workflows as JSON, AI-editable</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Link href="/workflows" className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                                <span>Workflow Canvas</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </Link>
                            <a href="/api/v2/workflows/stats/schemas" target="_blank" className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                                <span>API: Schema Stats</span>
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'schema' && <SchemaVisualizationTab />}
            {activeTab === 'roadmap' && <SystemRoadmapTab />}
            {activeTab === 'errors' && <ErrorHandlingTab />}

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
                Perfect Catch - Field Service Management Platform
            </div>
        </div>
    );
}
