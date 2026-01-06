"use client";

import KanbanBoard from "@/components/pipeline/kanban-board";

export default function OfficePage() {
  return (
    <div className="space-y-4">
      <KanbanBoard 
        showFilters={true}
        showTabs={true}
        showAddBoard={true}
      />
    </div>
  );
}
