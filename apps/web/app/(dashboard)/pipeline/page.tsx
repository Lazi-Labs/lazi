'use client';

import { useState, useEffect } from 'react';
import { PipelineKanbanBoard } from '@/components/pipeline';
import { usePipelines } from '@/hooks/use-pipeline';
import { useOpportunities } from '@/hooks/use-opportunities';
import { useUIStore } from '@/stores/ui-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Filter, 
  SortAsc, 
  LayoutGrid, 
  List, 
  Upload, 
  Plus,
  Search,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewTab = 'opportunities' | 'pipelines' | 'bulk';

export default function PipelinePage() {
  const { data: pipelinesData, isLoading } = usePipelines();
  const { activePipelineId, setActivePipeline } = useUIStore();
  const [activeTab, setActiveTab] = useState<ViewTab>('opportunities');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  
  const pipelines = pipelinesData?.docs ?? [];
  const activePipeline = pipelines.find(p => p.id === activePipelineId);
  
  // Get opportunity count for the badge
  const { opportunities } = useOpportunities(activePipelineId || '');
  const opportunityCount = opportunities?.length || 0;
  
  // Set default pipeline
  useEffect(() => {
    if (!activePipelineId && pipelines.length > 0) {
      const defaultPipeline = pipelines.find((p) => p.is_default) || pipelines[0];
      setActivePipeline(defaultPipeline.id);
    }
  }, [pipelines, activePipelineId, setActivePipeline]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 -m-6">
      {/* Top Header - GHL Style */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold">Opportunities</h1>
            
            {/* Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('opportunities')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === 'opportunities' 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Opportunities
              </button>
              <button
                onClick={() => setActiveTab('pipelines')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === 'pipelines' 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pipelines
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === 'bulk' 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Bulk Actions
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-md">
              <Button 
                variant={viewMode === 'board' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8 rounded-r-none"
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8 rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add opportunity
            </Button>
          </div>
        </div>
      </div>

      {/* Secondary Header */}
      <div className="px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Pipeline Selector */}
          <Select
            value={activePipelineId || ''}
            onValueChange={setActivePipeline}
          >
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Opportunity count badge */}
          <span className="text-sm text-primary font-medium">
            {opportunityCount} opportunities
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Advanced Filters */}
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-1" />
            Advanced Filters
          </Button>
          
          {/* Sort */}
          <Button variant="outline" size="sm" className="h-9">
            <SortAsc className="h-4 w-4 mr-1" />
            Sort (1)
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search Opportunities" 
              className="pl-8 h-9 w-56"
            />
          </div>

          {/* Manage Fields */}
          <Button variant="outline" size="sm" className="h-9">
            <Settings className="h-4 w-4 mr-1" />
            Manage Fields
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6">
        {activeTab === 'opportunities' && activePipelineId ? (
          viewMode === 'board' ? (
            <PipelineKanbanBoard pipelineId={activePipelineId} />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              List view coming soon
            </div>
          )
        ) : activeTab === 'pipelines' ? (
          <div className="text-center text-muted-foreground py-12">
            Pipeline management coming soon
          </div>
        ) : activeTab === 'bulk' ? (
          <div className="text-center text-muted-foreground py-12">
            Bulk actions coming soon
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Select a pipeline to view opportunities
          </div>
        )}
      </div>
    </div>
  );
}
