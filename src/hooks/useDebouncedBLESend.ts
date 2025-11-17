import { useEffect, useRef } from 'react';
import { usePWASettings } from '../contexts/PWASettingsContext';

/**
 * Custom hook for debounced BLE sends during slider interaction.
 *
 * Sends the value to BLE after a pause during user interaction.
 * Delay is configurable via PWA settings (default: 500ms).
 * Prevents echo loops by only sending when user is actively interacting.
 *
 * @param value - Current value to send
 * @param sendFn - Async function to send value over BLE
 * @param delay - Optional override for debounce delay (uses settings default if not provided)
 * @returns Object with interaction handlers for slider events
 */
export const useDebouncedBLESend = <T>(
  value: T,
  sendFn: (val: T) => Promise<void>,
  delay?: number
) => {
  const { settings } = usePWASettings();
  const effectiveDelay = delay ?? settings.ui.debounceDelayMs;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSentRef = useRef<T>(value);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only debounce if currently interacting AND value has changed
    if (isInteractingRef.current && value !== lastSentRef.current) {
      timeoutRef.current = setTimeout(() => {
        sendFn(value).catch((error) => {
          console.error('Debounced BLE send failed:', error);
        });
        lastSentRef.current = value;
      }, effectiveDelay);
    }

    // Cleanup on unmount or value change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, sendFn, effectiveDelay]);

  return {
    /**
     * Call when user starts interacting with slider (onMouseDown, onTouchStart)
     */
    onInteractionStart: () => {
      isInteractingRef.current = true;
    },

    /**
     * Call when user finishes interacting with slider (onChangeCommitted)
     * Cancels any pending debounced send.
     */
    onInteractionEnd: () => {
      isInteractingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
  };
};
