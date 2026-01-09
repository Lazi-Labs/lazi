'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
}

export default function SectionCard({
  title,
  subtitle,
  children,
  className,
  headerActions,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl overflow-hidden',
        className
      )}
    >
      {(title || headerActions) && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="font-semibold text-slate-800">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
