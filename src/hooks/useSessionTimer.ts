import { useState, useEffect, useRef, useCallback } from 'react';

export interface SessionTimerConfig {
  /** Initial session time in seconds */
  initialTime: number;
  /** Session duration in seconds */
  duration: number;
  /** Callback to subscribe to session time notifications from device */
  onSubscribe?: (callback: (time: number) => void) => (() => void);
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
  /** Start the timer */
  start: () => void;
  /** Stop the timer */
  stop: () => void;
  /** Set session time directly */
  setTime: (time: number) => void;
}

/**
 * Custom hook for session time tracking with BLE notifications.
 *
 * This hook uses a hybrid approach:
 * 1. Counts time locally (updates UI every second for smooth progress)
 * 2. Syncs with device notifications (every 60 seconds) to stay accurate
 *
 * @param config - Configuration for the session timer
 * @returns Session timer state and controls
 */
export function useSessionTimer(config: SessionTimerConfig): SessionTimerResult {
  const {
    initialTime,
    duration,
    onSubscribe,
    autoStart = true,
  } = config;

  const [sessionTime, setSessionTime] = useState(initialTime);
  const [sessionDuration, setSessionDuration] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);

  const timerRef = useRef<number | null>(null);

  // Calculate progress percentage
  const progress = sessionDuration > 0
    ? Math.min((sessionTime / sessionDuration) * 100, 100)
    : 0;

  // Update session duration when prop changes
  useEffect(() => {
    setSessionDuration(duration);
  }, [duration]);

  // Handle device time updates - sync local time to device time
  const handleTimeUpdate = useCallback((time: number) => {
    console.log(`[SessionTimer] Device notification: ${time}s (syncing local time)`);
    setSessionTime(time);
  }, []);

  // Start timer
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  // Stop timer
  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Set time directly
  const setTime = useCallback((time: number) => {
    setSessionTime(time);
  }, []);

  // Local timer - increment every second for smooth UI
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

  // Subscribe to device notifications for periodic sync
  useEffect(() => {
    if (!onSubscribe) {
      return;
    }

    console.log('[SessionTimer] Subscribing to device notifications (syncs every 60s)...');
    const unsubscribe = onSubscribe(handleTimeUpdate);

    return () => {
      console.log('[SessionTimer] Unsubscribing from notifications...');
      unsubscribe();
    };
  }, [onSubscribe, handleTimeUpdate]);

  return {
    sessionTime,
    sessionDuration,
    progress,
    isRunning,
    start,
    stop,
    setTime,
  };
}
