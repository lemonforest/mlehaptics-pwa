/**
 * PWA Settings Context
 * Provides application settings to components with React Context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { pwaSettingsService } from '../services/pwa-settings.service';
import { PWASettings, PWASettingsUpdate, DEFAULT_PWA_SETTINGS } from '../types/pwa-settings.types';

interface PWASettingsContextValue {
  settings: PWASettings;
  updateSettings: (update: PWASettingsUpdate) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  isLoading: boolean;
}

const PWASettingsContext = createContext<PWASettingsContextValue | undefined>(undefined);

interface PWASettingsProviderProps {
  children: ReactNode;
}

export const PWASettingsProvider: React.FC<PWASettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<PWASettings>(DEFAULT_PWA_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load settings on mount
    const loadSettings = async () => {
      try {
        const loaded = await pwaSettingsService.getSettings();
        setSettings(loaded);
      } catch (error) {
        console.error('Failed to load PWA settings:', error);
        setSettings(DEFAULT_PWA_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Subscribe to settings changes
    const unsubscribe = pwaSettingsService.onChange((updatedSettings) => {
      setSettings(updatedSettings);
    });

    return unsubscribe;
  }, []);

  const updateSettings = async (update: PWASettingsUpdate) => {
    try {
      const updated = await pwaSettingsService.updateSettings(update);
      setSettings(updated);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  const resetToDefaults = async () => {
    try {
      const defaults = await pwaSettingsService.resetToDefaults();
      setSettings(defaults);
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  };

  const value: PWASettingsContextValue = {
    settings,
    updateSettings,
    resetToDefaults,
    isLoading,
  };

  return (
    <PWASettingsContext.Provider value={value}>
      {children}
    </PWASettingsContext.Provider>
  );
};

/**
 * Hook to access PWA settings
 */
export const usePWASettings = (): PWASettingsContextValue => {
  const context = useContext(PWASettingsContext);
  if (context === undefined) {
    throw new Error('usePWASettings must be used within a PWASettingsProvider');
  }
  return context;
};
