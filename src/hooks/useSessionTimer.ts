import { useState, useEffect, useCallback } from 'react';

export interface SessionTimerConfig {
  /** Initial session time in seconds */
  initialTime: number;
  /** Session duration in seconds */
  duration: number;
  /** Callback to subscribe to session time notifications from device */
  onSubscribe?: (callback: (time: number) => void) => (() => void);
  /** Whether to start the subscription automatically */
  autoStart?: boolean;
}

export interface SessionTimerResult {
  /** Current elapsed time in seconds */
  sessionTime: number;
  /** Session duration in seconds */
  sessionDuration: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Set session time directly */
  setTime: (time: number) => void;
}

/**
 * Custom hook for session time tracking with BLE notifications.
 *
 * This hook uses the device's BLE notify characteristic to receive
 * real-time session time updates instead of polling.
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

  // Calculate progress percentage
  const progress = sessionDuration > 0
    ? Math.min((sessionTime / sessionDuration) * 100, 100)
    : 0;

  // Update session duration when prop changes
  useEffect(() => {
    setSessionDuration(duration);
  }, [duration]);

  // Handle session time updates
  const handleTimeUpdate = useCallback((time: number) => {
    console.log(`[SessionTimer] Notification received: ${time}s`);
    setSessionTime(time);
  }, []);

  // Set time directly
  const setTime = useCallback((time: number) => {
    setSessionTime(time);
  }, []);

  // Subscribe to session time notifications
  useEffect(() => {
    if (!autoStart || !onSubscribe) {
      return;
    }

    console.log('[SessionTimer] Subscribing to notifications...');
    const unsubscribe = onSubscribe(handleTimeUpdate);

    return () => {
      console.log('[SessionTimer] Unsubscribing from notifications...');
      unsubscribe();
    };
  }, [autoStart, onSubscribe, handleTimeUpdate]);

  return {
    sessionTime,
    sessionDuration,
    progress,
    setTime,
  };
}
