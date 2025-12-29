'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Opportunity, Contact } from '@/types';
import { Phone, MessageSquare, Mail, Calendar, MoreHorizontal, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OpportunityCardProps {
  opportunity: Opportunity;
  isDragging?: boolean;
  onClick?: () => void;
}

export function OpportunityCard({ opportunity, isDragging, onClick }: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const contact = opportunity.contact as Contact | undefined;
  const contactName = contact?.displayName || contact?.firstName || 'Unknown';

  const formatValue = (value: number | undefined) => {
    if (!value) return '$0.00';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer transition-all border-l-4 border-l-primary/50 hover:border-l-primary',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
        'hover:shadow-md bg-card'
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3">
        {/* Title with user icon */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="font-medium text-sm truncate">{opportunity.title}</p>
          </div>
          <div className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <User className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
        
        {/* Opportunity Value */}
        <div className="mt-2 text-xs text-muted-foreground">
          <span>Opportunity Value: </span>
          <span className="text-primary font-medium">{formatValue(opportunity.value)}</span>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 mt-3 pt-2 border-t">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
