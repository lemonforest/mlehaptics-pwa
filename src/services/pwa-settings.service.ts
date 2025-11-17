/**
 * PWA Settings Service
 * Manages application-level settings (separate from device presets)
 * Uses IndexedDB for storage with fallback to localStorage
 */

import { indexedDBService, STORE_NAMES } from './indexeddb.service';
import {
  PWASettings,
  PWASettingsUpdate,
  PWASettingsExport,
  DEFAULT_PWA_SETTINGS,
  PWA_SETTINGS_BOUNDS,
} from '../types/pwa-settings.types';

const SETTINGS_ID = 'config';
const SETTINGS_VERSION = '1.0.0';
const FALLBACK_STORAGE_KEY = 'mlehaptics-pwa-settings';

type ChangeListener = (settings: PWASettings) => void;

export class PWASettingsService {
  private cachedSettings: PWASettings | null = null;
  private changeListeners: Set<ChangeListener> = new Set();
  private useFallback = false;

  /**
   * Initialize settings - load from storage or create defaults
   */
  async init(): Promise<PWASettings> {
    try {
      // Try IndexedDB first
      await indexedDBService.init();
      let settings = await indexedDBService.get<PWASettings>(
        STORE_NAMES.PWA_SETTINGS,
        SETTINGS_ID
      );

      if (!settings) {
        console.log('No PWA settings found, creating defaults...');
        settings = { ...DEFAULT_PWA_SETTINGS };
        await indexedDBService.put(STORE_NAMES.PWA_SETTINGS, settings);
      }

      this.cachedSettings = settings;
      return settings;
    } catch (error) {
      console.warn('IndexedDB failed, falling back to localStorage:', error);
      this.useFallback = true;
      return this.loadFromFallback();
    }
  }

  /**
   * Get current settings (from cache or storage)
   */
  async getSettings(): Promise<PWASettings> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }
    return this.init();
  }

  /**
   * Get cached settings synchronously (may be null if not initialized)
   */
  getCachedSettings(): PWASettings | null {
    return this.cachedSettings;
  }

  /**
   * Update settings with partial update
   */
  async updateSettings(update: PWASettingsUpdate): Promise<PWASettings> {
    const current = await this.getSettings();

    const updated: PWASettings = {
      ...current,
      ui: { ...current.ui, ...update.ui },
      ble: { ...current.ble, ...update.ble },
      updatedAt: Date.now(),
    };

    // Validate bounds
    const validation = this.validateSettings(updated);
    if (!validation.valid) {
      throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
    }

    // Save to storage
    await this.saveSettings(updated);

    // Update cache
    this.cachedSettings = updated;

    // Notify listeners
    this.notifyListeners(updated);

    return updated;
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults(): Promise<PWASettings> {
    const defaults = { ...DEFAULT_PWA_SETTINGS, updatedAt: Date.now() };
    await this.saveSettings(defaults);
    this.cachedSettings = defaults;
    this.notifyListeners(defaults);
    return defaults;
  }

  /**
   * Validate settings against bounds
   */
  validateSettings(settings: PWASettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate debounce delay
    if (
      settings.ui.debounceDelayMs < PWA_SETTINGS_BOUNDS.debounceDelayMs.min ||
      settings.ui.debounceDelayMs > PWA_SETTINGS_BOUNDS.debounceDelayMs.max
    ) {
      errors.push(
        `Debounce delay must be between ${PWA_SETTINGS_BOUNDS.debounceDelayMs.min}ms and ${PWA_SETTINGS_BOUNDS.debounceDelayMs.max}ms`
      );
    }

    // Validate reconnect delay
    if (
      settings.ble.reconnectDelayMs < PWA_SETTINGS_BOUNDS.reconnectDelayMs.min ||
      settings.ble.reconnectDelayMs > PWA_SETTINGS_BOUNDS.reconnectDelayMs.max
    ) {
      errors.push(
        `Reconnect delay must be between ${PWA_SETTINGS_BOUNDS.reconnectDelayMs.min}ms and ${PWA_SETTINGS_BOUNDS.reconnectDelayMs.max}ms`
      );
    }

    // Validate notification debounce
    if (
      settings.ble.notificationDebounceMs < PWA_SETTINGS_BOUNDS.notificationDebounceMs.min ||
      settings.ble.notificationDebounceMs > PWA_SETTINGS_BOUNDS.notificationDebounceMs.max
    ) {
      errors.push(
        `Notification debounce must be between ${PWA_SETTINGS_BOUNDS.notificationDebounceMs.min}ms and ${PWA_SETTINGS_BOUNDS.notificationDebounceMs.max}ms`
      );
    }

    // Validate theme
    if (!['light', 'dark', 'auto'].includes(settings.ui.theme)) {
      errors.push('Theme must be "light", "dark", or "auto"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export settings to JSON
   */
  async exportSettings(): Promise<PWASettingsExport> {
    const settings = await this.getSettings();
    return {
      type: 'pwa-settings',
      version: SETTINGS_VERSION,
      exportedAt: Date.now(),
      settings: {
        version: settings.version,
        ui: settings.ui,
        ble: settings.ble,
      },
    };
  }

  /**
   * Import settings from JSON with validation
   */
  async importSettings(data: PWASettingsExport): Promise<{
    success: boolean;
    errors: string[];
  }> {
    // Validate export format
    if (data.type !== 'pwa-settings' || !data.settings) {
      return {
        success: false,
        errors: ['Invalid settings export format'],
      };
    }

    try {
      // Reconstruct full settings object
      const imported: PWASettings = {
        id: SETTINGS_ID,
        version: data.settings.version,
        ui: data.settings.ui,
        ble: data.settings.ble,
        updatedAt: Date.now(),
      };

      // Validate
      const validation = this.validateSettings(imported);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Save
      await this.saveSettings(imported);
      this.cachedSettings = imported;
      this.notifyListeners(imported);

      return { success: true, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to import settings: ${error}`],
      };
    }
  }

  /**
   * Subscribe to settings changes
   */
  onChange(listener: ChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /**
   * Notify all listeners of settings change
   */
  private notifyListeners(settings: PWASettings): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(settings);
      } catch (error) {
        console.error('Settings change listener error:', error);
      }
    });
  }

  /**
   * Save settings to storage
   */
  private async saveSettings(settings: PWASettings): Promise<void> {
    if (this.useFallback) {
      this.saveToFallback(settings);
    } else {
      try {
        await indexedDBService.put(STORE_NAMES.PWA_SETTINGS, settings);
      } catch (error) {
        console.warn('Failed to save to IndexedDB, falling back to localStorage:', error);
        this.useFallback = true;
        this.saveToFallback(settings);
      }
    }
  }

  /**
   * Load settings from localStorage fallback
   */
  private loadFromFallback(): PWASettings {
    try {
      const data = localStorage.getItem(FALLBACK_STORAGE_KEY);
      if (data) {
        const settings = JSON.parse(data) as PWASettings;
        this.cachedSettings = settings;
        return settings;
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }

    // Return defaults if load fails
    const defaults = { ...DEFAULT_PWA_SETTINGS };
    this.saveToFallback(defaults);
    this.cachedSettings = defaults;
    return defaults;
  }

  /**
   * Save settings to localStorage fallback
   */
  private saveToFallback(settings: PWASettings): void {
    try {
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
}

// Singleton instance
export const pwaSettingsService = new PWASettingsService();
