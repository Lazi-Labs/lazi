'use client';

import React, { useState, useRef, useEffect } from 'react';

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-lg mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Group name..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white mb-3"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-zinc-400">Color:</span>
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={!name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium">
              {initialName ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
