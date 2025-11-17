import { useEffect, useRef } from 'react';

/**
 * Custom hook for debounced BLE sends during slider interaction.
 *
 * Sends the value to BLE after a pause (default 500ms) during user interaction.
 * Prevents echo loops by only sending when user is actively interacting.
 *
 * @param value - Current value to send
 * @param sendFn - Async function to send value over BLE
 * @param delay - Debounce delay in milliseconds (default: 500ms)
 * @returns Object with interaction handlers for slider events
 */
export const useDebouncedBLESend = <T>(
  value: T,
  sendFn: (val: T) => Promise<void>,
  delay: number = 500
) => {
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
      }, delay);
    }

    // Cleanup on unmount or value change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, sendFn, delay]);

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
