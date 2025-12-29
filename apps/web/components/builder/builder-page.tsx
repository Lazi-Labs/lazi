'use client';

import { BuilderComponent, useIsPreviewing } from '@builder.io/react';
import '@/lib/builder-registry';

interface BuilderPageProps {
  model: string;
  content?: any;
  data?: Record<string, any>;
}

export function BuilderPage({ model, content, data }: BuilderPageProps) {
  const isPreviewing = useIsPreviewing();

  if (!content && !isPreviewing) {
    return null;
  }

  return (
    <BuilderComponent
      model={model}
      content={content}
      data={data}
      options={{ includeRefs: true }}
    />
  );
}
