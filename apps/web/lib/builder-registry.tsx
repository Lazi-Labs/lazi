'use client';

import { Builder } from '@builder.io/react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ===========================================
// UI COMPONENTS
// ===========================================

Builder.registerComponent(Button, {
  name: 'Button',
  inputs: [
    { name: 'children', type: 'text', defaultValue: 'Click me' },
    {
      name: 'variant',
      type: 'enum',
      enum: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      defaultValue: 'default',
    },
    {
      name: 'size',
      type: 'enum',
      enum: ['default', 'sm', 'lg', 'icon'],
      defaultValue: 'default',
    },
    { name: 'className', type: 'text', defaultValue: '' },
  ],
});

Builder.registerComponent(Input, {
  name: 'Input',
  inputs: [
    { name: 'placeholder', type: 'text', defaultValue: 'Enter text...' },
    { name: 'type', type: 'enum', enum: ['text', 'email', 'password', 'search', 'tel', 'number'], defaultValue: 'text' },
    { name: 'className', type: 'text', defaultValue: '' },
  ],
});

Builder.registerComponent(Badge, {
  name: 'Badge',
  inputs: [
    { name: 'children', type: 'text', defaultValue: 'Badge' },
    { name: 'variant', type: 'enum', enum: ['default', 'secondary', 'destructive', 'outline'], defaultValue: 'default' },
  ],
});

Builder.registerComponent(Card, {
  name: 'Card',
  canHaveChildren: true,
  inputs: [
    { name: 'className', type: 'text', defaultValue: '' },
  ],
});

// ===========================================
// CRM COMPONENTS - Stat Card
// ===========================================

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: 'dollar' | 'users' | 'target' | 'check';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function StatCard({ title, value, description, icon = 'dollar', trend = 'neutral', trendValue }: StatCardProps) {
  const icons: Record<string, string> = {
    dollar: '💰',
    users: '👥',
    target: '🎯',
    check: '✅',
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="text-2xl">{icons[icon]}</div>
        {trend !== 'neutral' && trendValue && (
          <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </Card>
  );
}

Builder.registerComponent(StatCard, {
  name: 'Stat Card',
  inputs: [
    { name: 'title', type: 'text', defaultValue: 'Total Revenue' },
    { name: 'value', type: 'text', defaultValue: '$0' },
    { name: 'description', type: 'text', defaultValue: '' },
    { name: 'icon', type: 'enum', enum: ['dollar', 'users', 'target', 'check'], defaultValue: 'dollar' },
    { name: 'trend', type: 'enum', enum: ['up', 'down', 'neutral'], defaultValue: 'neutral' },
    { name: 'trendValue', type: 'text', defaultValue: '' },
  ],
});

// ===========================================
// PAGE HEADER
// ===========================================

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

Builder.registerComponent(PageHeader, {
  name: 'Page Header',
  inputs: [
    { name: 'title', type: 'text', defaultValue: 'Page Title' },
    { name: 'description', type: 'text', defaultValue: '' },
  ],
  canHaveChildren: true,
});

// ===========================================
// LAYOUT COMPONENTS
// ===========================================

Builder.registerComponent(
  ({ children, className, columns = 1, gap = 4 }: { 
    children: React.ReactNode; 
    className?: string;
    columns?: number;
    gap?: number;
  }) => (
    <div 
      className={`grid ${className || ''}`}
      style={{ 
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap * 4}px` 
      }}
    >
      {children}
    </div>
  ),
  {
    name: 'Grid Layout',
    canHaveChildren: true,
    inputs: [
      { name: 'columns', type: 'number', defaultValue: 3 },
      { name: 'gap', type: 'number', defaultValue: 4 },
      { name: 'className', type: 'text', defaultValue: '' },
    ],
  }
);

Builder.registerComponent(
  ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={`p-6 ${className || ''}`}>{children}</section>
  ),
  {
    name: 'Section',
    canHaveChildren: true,
    inputs: [
      { name: 'className', type: 'text', defaultValue: '' },
    ],
  }
);

Builder.registerComponent(
  ({ children, direction = 'row', gap = 4, align = 'start', justify = 'start', className }: {
    children: React.ReactNode;
    direction?: 'row' | 'column';
    gap?: number;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
    className?: string;
  }) => (
    <div 
      className={`flex ${className || ''}`}
      style={{
        flexDirection: direction,
        gap: `${gap * 4}px`,
        alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align,
        justifyContent: justify === 'start' ? 'flex-start' : justify === 'end' ? 'flex-end' : justify === 'between' ? 'space-between' : justify === 'around' ? 'space-around' : justify,
      }}
    >
      {children}
    </div>
  ),
  {
    name: 'Flex Container',
    canHaveChildren: true,
    inputs: [
      { name: 'direction', type: 'enum', enum: ['row', 'column'], defaultValue: 'row' },
      { name: 'gap', type: 'number', defaultValue: 4 },
      { name: 'align', type: 'enum', enum: ['start', 'center', 'end', 'stretch'], defaultValue: 'start' },
      { name: 'justify', type: 'enum', enum: ['start', 'center', 'end', 'between', 'around'], defaultValue: 'start' },
      { name: 'className', type: 'text', defaultValue: '' },
    ],
  }
);

// ===========================================
// CRM COMPONENTS - Contact Table, Kanban, etc.
// ===========================================

import { KanbanBoard } from '@/components/pipeline';
import { ContactTable } from '@/components/contacts';
import { ConversationList } from '@/components/inbox';

Builder.registerComponent(KanbanBoard, {
  name: 'Kanban Board',
  inputs: [
    { name: 'pipelineId', type: 'string', defaultValue: '' },
  ],
});

Builder.registerComponent(ContactTable, {
  name: 'Contact Table',
  inputs: [],
});

Builder.registerComponent(ConversationList, {
  name: 'Conversation List',
  inputs: [
    { name: 'activeId', type: 'string', defaultValue: '' },
  ],
});

export { StatCard, PageHeader };
