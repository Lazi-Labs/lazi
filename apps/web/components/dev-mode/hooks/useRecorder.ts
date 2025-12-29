// =============================================================================
// LAZI AI - DevMode 2.0 Recorder Hook
// =============================================================================
// Hook for recording user interactions, console errors, and network requests
// =============================================================================

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useDevMode } from '../DevModeProvider';
import { InteractionEvent, ConsoleError, NetworkRequest, Screenshot } from '../types/devmode.types';
import { generateSelector } from '../utils/elementUtils';

export function useRecorder() {
  const { state, dispatch } = useDevMode();
  const { isRecording, recordingData } = state;

  // Store original functions
  const originalConsoleError = useRef<typeof console.error>();
  const originalConsoleWarn = useRef<typeof console.warn>();
  const originalFetch = useRef<typeof fetch>();

  // Start recording
  const startRecording = useCallback(() => {
    dispatch({ type: 'START_RECORDING' });
  }, [dispatch]);

  // Stop recording
  const stopRecording = useCallback(() => {
    dispatch({ type: 'STOP_RECORDING' });
  }, [dispatch]);

  // Add interaction event
  const addInteraction = useCallback(
    (event: Omit<InteractionEvent, 'timestamp'>) => {
      dispatch({
        type: 'ADD_RECORDING_INTERACTION',
        payload: { ...event, timestamp: new Date() },
      });
    },
    [dispatch]
  );

  // Add console error
  const addError = useCallback(
    (error: Omit<ConsoleError, 'timestamp'>) => {
      dispatch({
        type: 'ADD_RECORDING_ERROR',
        payload: { ...error, timestamp: new Date() },
      });
    },
    [dispatch]
  );

  // Add network request
  const addNetworkRequest = useCallback(
    (request: Omit<NetworkRequest, 'timestamp'>) => {
      dispatch({
        type: 'ADD_RECORDING_REQUEST',
        payload: { ...request, timestamp: new Date() },
      });
    },
    [dispatch]
  );

  // Add screenshot
  const addScreenshot = useCallback(
    async (label?: string) => {
      try {
        // Try to capture screenshot using html2canvas if available
        if (typeof window !== 'undefined') {
          // For now, just create a placeholder - html2canvas would be used in production
          const screenshot: Screenshot = {
            dataUrl: 'screenshot-placeholder',
            timestamp: new Date(),
            label,
          };
          dispatch({ type: 'ADD_RECORDING_SCREENSHOT', payload: screenshot });
        }
      } catch (error) {
        console.error('Failed to capture screenshot:', error);
      }
    },
    [dispatch]
  );

  // Set up event listeners when recording
  useEffect(() => {
    if (!isRecording) return;

    // Capture click events
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      addInteraction({
        type: 'click',
        target: generateSelector(target),
        coordinates: { x: e.clientX, y: e.clientY },
        value: target.textContent?.slice(0, 50),
      });
    };

    // Capture input events
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      addInteraction({
        type: 'input',
        target: generateSelector(target),
        value:
          target.type === 'password'
            ? '***'
            : target.value?.slice(0, 100),
      });
    };

    // Capture scroll events (debounced)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        addInteraction({
          type: 'scroll',
          target: 'window',
          coordinates: { x: window.scrollX, y: window.scrollY },
        });
      }, 200);
    };

    // Capture key events
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture special keys
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
        const target = e.target as HTMLElement;
        addInteraction({
          type: 'keydown',
          target: generateSelector(target),
          value: e.key,
        });
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', handleInput, true);
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('input', handleInput, true);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(scrollTimeout);
    };
  }, [isRecording, addInteraction]);

  // Override console.error and console.warn when recording
  useEffect(() => {
    if (!isRecording) {
      // Restore original functions if we have them
      if (originalConsoleError.current) {
        console.error = originalConsoleError.current;
      }
      if (originalConsoleWarn.current) {
        console.warn = originalConsoleWarn.current;
      }
      return;
    }

    // Store originals
    originalConsoleError.current = console.error;
    originalConsoleWarn.current = console.warn;

    // Override console.error
    console.error = (...args: any[]) => {
      const message = args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        )
        .join(' ');

      addError({
        type: 'error',
        message,
        stack: new Error().stack,
      });

      // Call original
      originalConsoleError.current?.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args: any[]) => {
      const message = args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        )
        .join(' ');

      addError({
        type: 'warning',
        message,
      });

      // Call original
      originalConsoleWarn.current?.apply(console, args);
    };

    return () => {
      // Restore originals on cleanup
      if (originalConsoleError.current) {
        console.error = originalConsoleError.current;
      }
      if (originalConsoleWarn.current) {
        console.warn = originalConsoleWarn.current;
      }
    };
  }, [isRecording, addError]);

  // Override fetch when recording
  useEffect(() => {
    if (!isRecording) {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }
      return;
    }

    originalFetch.current = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      try {
        const response = await originalFetch.current!(input, init);
        const duration = Date.now() - startTime;

        // Clone response to read body
        const clone = response.clone();
        let responseBody;
        try {
          responseBody = await clone.json();
        } catch {
          try {
            responseBody = await clone.text();
          } catch {
            responseBody = null;
          }
        }

        addNetworkRequest({
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          requestBody: init?.body ? JSON.parse(String(init.body)) : null,
          responseBody,
          duration,
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        addNetworkRequest({
          url,
          method,
          status: 0,
          statusText: 'Failed',
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    };

    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }
    };
  }, [isRecording, addNetworkRequest]);

  return {
    isRecording,
    recordingData,
    startRecording,
    stopRecording,
    addScreenshot,
    duration: recordingData
      ? Math.round(
          (new Date().getTime() - recordingData.startTime.getTime()) / 1000
        )
      : 0,
  };
}
