'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface GroupNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: string }) => void;
  initialName?: string;
  title?: string;
}

export function GroupNameModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialName = '', 
  title = 'Create Group' 
}: GroupNameModalProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState('#3B82F6');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const colors = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];
  
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialName]);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({ name: name.trim(), color });
      setName('');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border rounded-lg shadow-lg w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-lg mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-2 mb-3">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              ref={inputRef}
              id="group-name"
              placeholder="Group name..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Label>Color:</Label>
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-6 h-6 rounded-full transition-all",
                  color === c && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>
              {initialName ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
