import { useState, useEffect, useRef, useCallback } from 'react';

export interface SessionTimerConfig {
  /** Initial session time in seconds */
  initialTime: number;
  /** Session duration in seconds */
  duration: number;
  /** Callback to sync with device, returns actual device time */
  onSync?: () => Promise<number>;
  /** Sync interval in milliseconds (default: 30000 = 30 seconds) */
  syncInterval?: number;
  /** Whether to start the timer automatically */
  autoStart?: boolean;
}

export interface SessionTimerResult {
  /** Current elapsed time in seconds */
  sessionTime: number;
  /** Session duration in seconds */
  sessionDuration: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether the timer is running */
  isRunning: boolean;
  /** Manually sync with device */
  sync: () => Promise<void>;
  /** Start the timer */
  start: () => void;
  /** Stop the timer */
  stop: () => void;
  /** Reset to initial time */
  reset: () => void;
  /** Set session time directly */
  setTime: (time: number) => void;
}

/**
 * Custom hook for local session time tracking with periodic device sync.
 *
 * This hook reduces BLE traffic by:
 * 1. Counting time locally (updates UI every second)
 * 2. Syncing with the device periodically (default: every 30 seconds)
 *
 * @param config - Configuration for the session timer
 * @returns Session timer state and controls
 */
export function useSessionTimer(config: SessionTimerConfig): SessionTimerResult {
  const {
    initialTime,
    duration,
    onSync,
    syncInterval = 30000, // 30 seconds default
    autoStart = true,
  } = config;

  const [sessionTime, setSessionTime] = useState(initialTime);
  const [sessionDuration] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);

  const timerRef = useRef<number | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(Date.now());

  // Calculate progress percentage
  const progress = sessionDuration > 0
    ? Math.min((sessionTime / sessionDuration) * 100, 100)
    : 0;

  // Sync with device
  const sync = useCallback(async () => {
    if (!onSync) return;

    try {
      console.log('[SessionTimer] Syncing with device...');
      const deviceTime = await onSync();
      setSessionTime(deviceTime);
      lastSyncRef.current = Date.now();
      console.log(`[SessionTimer] Synced: device time = ${deviceTime}s`);
    } catch (error) {
      console.error('[SessionTimer] Sync failed:', error);
    }
  }, [onSync]);

  // Start timer
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  // Stop timer
  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Reset to initial time
  const reset = useCallback(() => {
    setSessionTime(initialTime);
    lastSyncRef.current = Date.now();
  }, [initialTime]);

  // Set time directly
  const setTime = useCallback((time: number) => {
    setSessionTime(time);
  }, []);

  // Local timer - increment every second
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  // Periodic sync timer
  useEffect(() => {
    if (!isRunning || !onSync) {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      return;
    }

    // Sync periodically
    syncTimerRef.current = setInterval(() => {
      sync();
    }, syncInterval);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [isRunning, onSync, syncInterval, sync]);

  // Initial sync on mount if autoStart is true
  useEffect(() => {
    if (autoStart && onSync) {
      sync();
    }
  }, [autoStart, onSync, sync]);

  return {
    sessionTime,
    sessionDuration,
    progress,
    isRunning,
    sync,
    start,
    stop,
    reset,
    setTime,
  };
}
