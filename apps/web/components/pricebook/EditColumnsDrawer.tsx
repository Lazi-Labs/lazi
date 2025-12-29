'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ColumnConfig,
  DEFAULT_COLUMNS,
  ADDITIONAL_COLUMNS,
  getDefaultVisibleColumns,
} from '@/types/pricebook';

interface EditColumnsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

export function EditColumnsDrawer({
  open,
  onOpenChange,
  visibleColumns,
  onColumnsChange,
}: EditColumnsDrawerProps) {
  // Local state for pending changes
  const [pendingColumns, setPendingColumns] = useState<string[]>(visibleColumns);

  // Reset pending state when drawer opens
  useEffect(() => {
    if (open) {
      setPendingColumns(visibleColumns);
    }
  }, [open, visibleColumns]);

  const handleColumnToggle = (columnId: string, checked: boolean) => {
    if (checked) {
      setPendingColumns([...pendingColumns, columnId]);
    } else {
      setPendingColumns(pendingColumns.filter((id) => id !== columnId));
    }
  };

  const handleResetDefaults = () => {
    setPendingColumns(getDefaultVisibleColumns());
  };

  const handleApply = () => {
    onColumnsChange(pendingColumns);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPendingColumns(visibleColumns);
    onOpenChange(false);
  };

  const hasChanges = JSON.stringify(pendingColumns.sort()) !== JSON.stringify(visibleColumns.sort());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit Columns</SheetTitle>
          <SheetDescription>
            Select the columns you want to see in your list of Services.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Default Columns */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Default
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {DEFAULT_COLUMNS.map((column) => (
                  <ColumnCheckbox
                    key={column.id}
                    column={column}
                    checked={pendingColumns.includes(column.id)}
                    onCheckedChange={(checked) =>
                      handleColumnToggle(column.id, checked)
                    }
                  />
                ))}
              </div>
            </div>

            {/* Additional Columns */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Additional
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {ADDITIONAL_COLUMNS.map((column) => (
                  <ColumnCheckbox
                    key={column.id}
                    column={column}
                    checked={pendingColumns.includes(column.id)}
                    onCheckedChange={(checked) =>
                      handleColumnToggle(column.id, checked)
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="flex-row justify-between border-t pt-4 mt-4">
          <Button
            variant="link"
            className="text-destructive px-0"
            onClick={handleResetDefaults}
          >
            Reset Defaults
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!hasChanges}>
              Apply
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Individual column checkbox component
interface ColumnCheckboxProps {
  column: ColumnConfig;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ColumnCheckbox({ column, checked, onCheckedChange }: ColumnCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={column.id}
        checked={checked}
        disabled={column.disabled}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
      />
      <Label
        htmlFor={column.id}
        className={`text-sm font-normal cursor-pointer ${
          column.disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {column.label}
      </Label>
    </div>
  );
}
