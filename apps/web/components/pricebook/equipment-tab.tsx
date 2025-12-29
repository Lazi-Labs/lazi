'use client';

import { useState } from 'react';
import { CategoryTree } from './category-tree';
import { EquipmentList } from './equipment-list';
import { EquipmentEditor } from './equipment-editor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter } from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

export function EquipmentTab() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className="border rounded-lg h-[calc(100vh-280px)]">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="h-full border-r">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm">Categories</h3>
            </div>
            <div className="p-2 overflow-auto h-[calc(100%-49px)]">
              <CategoryTree
                type="equipment"
                selectedId={selectedCategory}
                onSelect={(cat) => setSelectedCategory(cat?.id || null)}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={showEditor ? 40 : 80}>
          <div className="h-full flex flex-col">
            <div className="p-3 border-b flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button onClick={() => {
                setSelectedEquipment(null);
                setShowEditor(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Equipment
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              <EquipmentList
                categoryId={selectedCategory}
                searchQuery={searchQuery}
                selectedId={selectedEquipment?.id}
                onSelect={(equipment) => {
                  setSelectedEquipment(equipment);
                  setShowEditor(true);
                }}
              />
            </div>
          </div>
        </ResizablePanel>

        {showEditor && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40} minSize={30}>
              <EquipmentEditor
                equipment={selectedEquipment}
                onClose={() => {
                  setShowEditor(false);
                  setSelectedEquipment(null);
                }}
                onSave={() => {
                  setShowEditor(false);
                  setSelectedEquipment(null);
                }}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
