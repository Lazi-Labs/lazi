/**
 * API Client with rate limiting handling
 */

export class RateLimitError extends Error {
  retryAfter: number;
  
  constructor(retryAfter: number) {
    super('Rate limited by ServiceTitan');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

let rateLimitedUntil = 0;

export async function apiRequest<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  // Check if we're currently rate limited
  const now = Date.now();
  if (now < rateLimitedUntil) {
    const waitTime = Math.ceil((rateLimitedUntil - now) / 1000);
    throw new RateLimitError(waitTime);
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440',
      ...options.headers,
    },
  });

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
    rateLimitedUntil = Date.now() + retryAfter * 1000;
    throw new RateLimitError(retryAfter);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if currently rate limited
 */
export function isRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}

/**
 * Get remaining rate limit wait time in seconds
 */
export function getRateLimitWaitTime(): number {
  const remaining = rateLimitedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Clear rate limit (for testing or manual override)
 */
export function clearRateLimit(): void {
  rateLimitedUntil = 0;
}
