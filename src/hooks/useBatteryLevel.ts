import { useState, useEffect, useCallback } from 'react';

export interface BatteryLevelConfig {
  /** Initial battery level (0-100) */
  initialLevel: number;
  /** Callback to subscribe to battery level notifications from device */
  onSubscribe?: (callback: (level: number) => void) => (() => void);
  /** Whether to start subscription automatically */
  autoStart?: boolean;
}

export interface BatteryLevelResult {
  /** Current battery level (0-100) */
  batteryLevel: number;
  /** Whether battery is low (<20%) */
  isLow: boolean;
  /** Battery status color for UI */
  color: 'success' | 'warning' | 'error';
  /** Set battery level directly */
  setBatteryLevel: (level: number) => void;
}

/**
 * Custom hook for battery level tracking with BLE notifications.
 *
 * This hook uses the device's BLE notify characteristic to receive
 * real-time battery level updates instead of polling.
 *
 * @param config - Configuration for battery level tracking
 * @returns Battery level state and controls
 */
export function useBatteryLevel(config: BatteryLevelConfig): BatteryLevelResult {
  const {
    initialLevel,
    onSubscribe,
    autoStart = true,
  } = config;

  const [batteryLevel, setBatteryLevel] = useState(initialLevel);

  // Calculate battery status
  const isLow = batteryLevel < 20;
  const color: 'success' | 'warning' | 'error' =
    batteryLevel > 50 ? 'success' : batteryLevel > 25 ? 'warning' : 'error';

  // Handle battery level updates
  const handleBatteryUpdate = useCallback((level: number) => {
    console.log(`[BatteryLevel] Notification received: ${level}%`);
    setBatteryLevel(level);
  }, []);

  // Subscribe to battery level notifications
  useEffect(() => {
    if (!autoStart || !onSubscribe) {
      return;
    }

    console.log('[BatteryLevel] Subscribing to notifications...');
    const unsubscribe = onSubscribe(handleBatteryUpdate);

    return () => {
      console.log('[BatteryLevel] Unsubscribing from notifications...');
      unsubscribe();
    };
  }, [autoStart, onSubscribe, handleBatteryUpdate]);

  return {
    batteryLevel,
    isLow,
    color,
    setBatteryLevel,
  };
}
