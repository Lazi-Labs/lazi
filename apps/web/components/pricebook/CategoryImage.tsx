'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface CategoryImageProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
}

export function CategoryImage({ src, alt, size = 40, className = '' }: CategoryImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || error) {
    return (
      <div 
        className={`bg-muted rounded flex items-center justify-center text-muted-foreground ${className}`}
        style={{ width: size, height: size }}
      >
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded ${className}`} style={{ width: size, height: size }}>
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`w-full h-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
