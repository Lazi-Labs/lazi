/**
 * Network Request Interceptor for Debug Panel
 *
 * This module intercepts fetch calls and logs them to the debug panel.
 * Only active in development mode and only intercepts pricebook API calls.
 *
 * Usage:
 * Import and call enableDebugInterceptor() in a useEffect in your layout or debug panel.
 */

let interceptorEnabled = false;
let originalFetch: typeof fetch | null = null;

/**
 * Enable the fetch interceptor for pricebook API debugging.
 * Returns a cleanup function to restore the original fetch.
 */
export function enableDebugInterceptor(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (process.env.NODE_ENV !== 'development') return () => {};
  if (interceptorEnabled) return () => {};

  originalFetch = window.fetch;
  interceptorEnabled = true;

  window.fetch = async (...args) => {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const method = init?.method || 'GET';

    // Only log pricebook API calls
    const shouldLog = url.includes('/api/pricebook') || url.includes('/api/admin/sync');

    if (shouldLog) {
      logToDebugPanel('api', method, `${method} ${url}`);
    }

    const startTime = Date.now();

    try {
      const response = await originalFetch!(...args);
      const duration = Date.now() - startTime;

      if (shouldLog) {
        const statusType = response.ok ? 'api' : 'error';
        logToDebugPanel(statusType, 'response', `${response.status} ${url} (${duration}ms)`);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (shouldLog) {
        logToDebugPanel('error', 'network', `Failed: ${url} (${duration}ms)`, error);
      }

      throw error;
    }
  };

  logToDebugPanel('info', 'interceptor', 'Network interceptor enabled');

  return () => {
    if (originalFetch) {
      window.fetch = originalFetch;
      originalFetch = null;
      interceptorEnabled = false;
      logToDebugPanel('info', 'interceptor', 'Network interceptor disabled');
    }
  };
}

/**
 * Check if the interceptor is currently enabled.
 */
export function isInterceptorEnabled(): boolean {
  return interceptorEnabled;
}

/**
 * Helper to log to the debug panel.
 */
function logToDebugPanel(
  type: 'socket' | 'api' | 'action' | 'error' | 'info',
  category: string,
  message: string,
  data?: any
) {
  if (typeof window !== 'undefined' && (window as any).__debugLog) {
    (window as any).__debugLog(type, category, message, data);
  }
}
