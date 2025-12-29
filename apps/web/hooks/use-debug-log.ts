'use client';

type LogType = 'socket' | 'api' | 'action' | 'error' | 'info';

/**
 * Hook to log debug messages to the PricebookDebugPanel.
 *
 * Usage:
 * ```ts
 * const { log } = useDebugLog();
 *
 * // When making API calls:
 * log('api', 'categories', 'Fetching categories...');
 *
 * // When user takes action:
 * log('action', 'reorder', 'User dragged category', { from: 5, to: 2 });
 *
 * // On errors:
 * log('error', 'sync', 'Failed to sync', error);
 * ```
 */
export function useDebugLog() {
  const log = (
    type: LogType,
    category: string,
    message: string,
    data?: any
  ) => {
    // Send to debug panel if available
    if (typeof window !== 'undefined' && (window as any).__debugLog) {
      (window as any).__debugLog(type, category, message, data);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const styles: Record<LogType, string> = {
        socket: 'color: #22d3ee', // cyan
        api: 'color: #facc15',    // yellow
        action: 'color: #4ade80', // green
        error: 'color: #f87171',  // red
        info: 'color: #9ca3af',   // gray
      };

      console.log(
        `%c[${type.toUpperCase()}] [${category}] ${message}`,
        styles[type],
        data || ''
      );
    }
  };

  return { log };
}

/**
 * Standalone log function for use outside of React components.
 *
 * Usage:
 * ```ts
 * import { debugLog } from '@/hooks/use-debug-log';
 *
 * debugLog('api', 'fetch', 'Starting request...');
 * ```
 */
export function debugLog(
  type: LogType,
  category: string,
  message: string,
  data?: any
) {
  if (typeof window !== 'undefined' && (window as any).__debugLog) {
    (window as any).__debugLog(type, category, message, data);
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[${type.toUpperCase()}] [${category}] ${message}`, data || '');
  }
}
