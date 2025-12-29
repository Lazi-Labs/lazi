'use client';

import { BuilderComponent, useIsPreviewing } from '@builder.io/react';
import '@/lib/builder-registry';

interface BuilderSectionProps {
  model?: string;
  content?: any;
  data?: Record<string, any>;
  children?: React.ReactNode;
}

export function BuilderSection({ 
  model = 'section', 
  content, 
  data,
  children 
}: BuilderSectionProps) {
  const isPreviewing = useIsPreviewing();

  // If no Builder content, render children as fallback
  if (!content && !isPreviewing) {
    return <>{children}</>;
  }

  return (
    <BuilderComponent
      model={model}
      content={content}
      data={data}
    />
  );
}
