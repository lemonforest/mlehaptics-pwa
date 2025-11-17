/**
 * PWA Settings Types
 * Type definitions for application-level settings (separate from device presets)
 */

/**
 * PWA Settings - Application behavior configuration
 * Stored as singleton in IndexedDB with id='config'
 */
export interface PWASettings {
  id: 'config'; // Always 'config' (singleton)
  version: string; // Settings schema version
  ui: {
    debounceDelayMs: number; // Slider pause-to-send delay (100-1000ms)
    theme: 'light' | 'dark' | 'auto'; // UI theme preference
    compactMode: boolean; // Compact UI layout
    showAdvancedControls: boolean; // Show advanced/debug controls
  };
  ble: {
    autoReconnect: boolean; // Automatically reconnect on disconnect
    reconnectDelayMs: number; // Delay before reconnect attempt (1000-10000ms)
    notificationDebounceMs: number; // Debounce for BLE notifications (50-500ms)
  };
  updatedAt: number; // Last update timestamp
}

/**
 * Validation bounds for PWA settings
 */
export const PWA_SETTINGS_BOUNDS = {
  debounceDelayMs: { min: 100, max: 1000, default: 500 },
  reconnectDelayMs: { min: 1000, max: 10000, default: 3000 },
  notificationDebounceMs: { min: 50, max: 500, default: 100 },
} as const;

/**
 * Default PWA settings
 */
export const DEFAULT_PWA_SETTINGS: PWASettings = {
  id: 'config',
  version: '1.0.0',
  ui: {
    debounceDelayMs: PWA_SETTINGS_BOUNDS.debounceDelayMs.default,
    theme: 'auto',
    compactMode: false,
    showAdvancedControls: false,
  },
  ble: {
    autoReconnect: true,
    reconnectDelayMs: PWA_SETTINGS_BOUNDS.reconnectDelayMs.default,
    notificationDebounceMs: PWA_SETTINGS_BOUNDS.notificationDebounceMs.default,
  },
  updatedAt: Date.now(),
};

/**
 * Export format for PWA settings
 */
export interface PWASettingsExport {
  type: 'pwa-settings';
  version: string;
  exportedAt: number;
  settings: Omit<PWASettings, 'id' | 'updatedAt'>;
}

/**
 * Partial update type for PWA settings
 */
export type PWASettingsUpdate = {
  ui?: Partial<PWASettings['ui']>;
  ble?: Partial<PWASettings['ble']>;
};
