'use client';

import { useWorkflowStore } from '../stores/workflowStore';
import { Download, Upload, Save, Loader2 } from 'lucide-react';

export function WorkflowToolbar() {
  const { workflow, isDirty, isSaving, saveWorkflow, exportWorkflow, importWorkflow } = useWorkflowStore();
  
  const handleExport = () => {
    const json = exportWorkflow();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow?.id || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const json = e.target?.result as string;
          importWorkflow(json);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  
  return (
    <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white">
          {workflow?.name || 'Workflow Visualizer'}
        </h1>
        {isDirty && (
          <span className="text-xs text-yellow-400">• Unsaved changes</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handleImport}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
        
        <button
          onClick={handleExport}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        
        <button
          onClick={saveWorkflow}
          disabled={!isDirty || isSaving}
          className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded flex items-center gap-2 transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}
