import { useState, useEffect, useRef, useCallback } from 'react';

export interface BatteryLevelConfig {
  /** Initial battery level (0-100) */
  initialLevel: number;
  /** Callback to read battery level from device */
  onRead?: () => Promise<number>;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollInterval?: number;
  /** Whether to start polling automatically */
  autoStart?: boolean;
}

export interface BatteryLevelResult {
  /** Current battery level (0-100) */
  batteryLevel: number;
  /** Whether battery is low (<20%) */
  isLow: boolean;
  /** Battery status color for UI */
  color: 'success' | 'warning' | 'error';
  /** Manually read battery from device */
  readBattery: () => Promise<void>;
  /** Set battery level directly */
  setBatteryLevel: (level: number) => void;
}

/**
 * Custom hook for battery level tracking with periodic polling.
 *
 * This hook reduces BLE traffic by:
 * 1. Polling the device at a configurable interval (default: every 30 seconds)
 * 2. Avoiding continuous BLE notifications for battery level
 *
 * @param config - Configuration for battery level tracking
 * @returns Battery level state and controls
 */
export function useBatteryLevel(config: BatteryLevelConfig): BatteryLevelResult {
  const {
    initialLevel,
    onRead,
    pollInterval = 30000, // 30 seconds default
    autoStart = true,
  } = config;

  const [batteryLevel, setBatteryLevel] = useState(initialLevel);
  const pollTimerRef = useRef<number | null>(null);
  const lastReadRef = useRef<number>(Date.now());

  // Calculate battery status
  const isLow = batteryLevel < 20;
  const color: 'success' | 'warning' | 'error' =
    batteryLevel > 50 ? 'success' : batteryLevel > 25 ? 'warning' : 'error';

  // Read battery level from device
  const readBattery = useCallback(async () => {
    if (!onRead) return;

    try {
      console.log('[BatteryLevel] Reading from device...');
      const level = await onRead();
      setBatteryLevel(level);
      lastReadRef.current = Date.now();
      console.log(`[BatteryLevel] Read: ${level}%`);
    } catch (error) {
      console.error('[BatteryLevel] Read failed:', error);
    }
  }, [onRead]);

  // Periodic polling
  useEffect(() => {
    if (!autoStart || !onRead) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Initial read
    readBattery();

    // Poll periodically
    pollTimerRef.current = setInterval(() => {
      readBattery();
    }, pollInterval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [autoStart, onRead, pollInterval, readBattery]);

  return {
    batteryLevel,
    isLow,
    color,
    readBattery,
    setBatteryLevel,
  };
}
