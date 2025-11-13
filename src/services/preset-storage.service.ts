/**
 * Preset Storage Service
 * Manages saving, loading, and validation of device configuration presets
 */

import { MotorMode } from './ble-config.service';
import {
  DevicePreset,
  PresetConfig,
  PresetExport,
  PRESET_VALIDATION_BOUNDS,
} from '../types/preset.types';

const STORAGE_KEY = 'mlehaptics-device-presets';
const EXPORT_VERSION = '1.0.0';

/**
 * Default presets with safe, tested settings
 */
const DEFAULT_PRESETS: Omit<DevicePreset, 'id' | 'createdAt'>[] = [
  {
    name: 'Standard',
    config: {
      mode: MotorMode.MODE_1HZ_50,
      customFrequency: 100,
      customDutyCycle: 50,
      pwmIntensity: 55,
      ledEnable: true,
      ledColorMode: 0,
      ledPaletteIndex: 2, // Blue
      ledCustomRGB: [0, 0, 255],
      ledBrightness: 20,
      sessionDuration: 2700, // 45 min
    },
  },
  {
    name: 'Gentle',
    config: {
      mode: MotorMode.MODE_05HZ_25,
      customFrequency: 50,
      customDutyCycle: 25,
      pwmIntensity: 30,
      ledEnable: true,
      ledColorMode: 0,
      ledPaletteIndex: 1, // Green
      ledCustomRGB: [0, 255, 0],
      ledBrightness: 15,
      sessionDuration: 3600, // 60 min
    },
  },
  {
    name: 'Intense',
    config: {
      mode: MotorMode.MODE_1HZ_50,
      customFrequency: 200,
      customDutyCycle: 75,
      pwmIntensity: 80,
      ledEnable: true,
      ledColorMode: 0,
      ledPaletteIndex: 0, // Red
      ledCustomRGB: [255, 0, 0],
      ledBrightness: 25,
      sessionDuration: 1800, // 30 min
    },
  },
];

export class PresetStorageService {
  /**
   * Initialize storage with default presets if empty
   */
  initialize(): void {
    const existing = this.getAllPresets();
    if (existing.length === 0) {
      console.log('Initializing default presets...');
      DEFAULT_PRESETS.forEach((preset) => {
        this.savePreset(preset.name, preset.config, false);
      });
    }
  }

  /**
   * Get all saved presets
   */
  getAllPresets(): DevicePreset[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as DevicePreset[];
    } catch (error) {
      console.error('Failed to load presets:', error);
      return [];
    }
  }

  /**
   * Generate auto-incremented preset name with collision detection
   */
  generatePresetName(): string {
    const presets = this.getAllPresets();
    const existingNames = new Set(presets.map((p) => p.name));

    let counter = 1;
    let name = `Preset ${counter}`;

    while (existingNames.has(name)) {
      counter++;
      name = `Preset ${counter}`;
    }

    return name;
  }

  /**
   * Check if preset name already exists
   */
  presetExists(name: string): boolean {
    const presets = this.getAllPresets();
    return presets.some((p) => p.name === name);
  }

  /**
   * Save a new preset or update existing
   */
  savePreset(name: string, config: PresetConfig, validateBounds = true): DevicePreset {
    // Validate config if requested
    if (validateBounds) {
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid preset config: ${validation.errors.join(', ')}`);
      }
    }

    const presets = this.getAllPresets();
    const existingIndex = presets.findIndex((p) => p.name === name);

    const preset: DevicePreset = {
      id: existingIndex >= 0 ? presets[existingIndex].id : this.generateId(),
      name,
      createdAt: existingIndex >= 0 ? presets[existingIndex].createdAt : Date.now(),
      config,
    };

    if (existingIndex >= 0) {
      // Update existing preset
      presets[existingIndex] = preset;
    } else {
      // Add new preset
      presets.push(preset);
    }

    this.saveToStorage(presets);
    return preset;
  }

  /**
   * Delete a preset by ID
   */
  deletePreset(id: string): boolean {
    const presets = this.getAllPresets();
    const filtered = presets.filter((p) => p.id !== id);

    if (filtered.length === presets.length) {
      return false; // Preset not found
    }

    this.saveToStorage(filtered);
    return true;
  }

  /**
   * Get a preset by ID
   */
  getPreset(id: string): DevicePreset | null {
    const presets = this.getAllPresets();
    return presets.find((p) => p.id === id) || null;
  }

  /**
   * Validate preset configuration against device bounds
   */
  validateConfig(config: PresetConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate motor mode
    if (
      config.mode < PRESET_VALIDATION_BOUNDS.motorMode.min ||
      config.mode > PRESET_VALIDATION_BOUNDS.motorMode.max
    ) {
      errors.push(`Motor mode must be between ${PRESET_VALIDATION_BOUNDS.motorMode.min} and ${PRESET_VALIDATION_BOUNDS.motorMode.max}`);
    }

    // Validate custom frequency
    if (
      config.customFrequency < PRESET_VALIDATION_BOUNDS.customFrequency.min ||
      config.customFrequency > PRESET_VALIDATION_BOUNDS.customFrequency.max
    ) {
      errors.push(`Custom frequency must be between ${PRESET_VALIDATION_BOUNDS.customFrequency.min} and ${PRESET_VALIDATION_BOUNDS.customFrequency.max}`);
    }

    // Validate custom duty cycle
    if (
      config.customDutyCycle < PRESET_VALIDATION_BOUNDS.customDutyCycle.min ||
      config.customDutyCycle > PRESET_VALIDATION_BOUNDS.customDutyCycle.max
    ) {
      errors.push(`Custom duty cycle must be between ${PRESET_VALIDATION_BOUNDS.customDutyCycle.min}% and ${PRESET_VALIDATION_BOUNDS.customDutyCycle.max}%`);
    }

    // Validate PWM intensity
    if (
      config.pwmIntensity < PRESET_VALIDATION_BOUNDS.pwmIntensity.min ||
      config.pwmIntensity > PRESET_VALIDATION_BOUNDS.pwmIntensity.max
    ) {
      errors.push(`PWM intensity must be between ${PRESET_VALIDATION_BOUNDS.pwmIntensity.min}% and ${PRESET_VALIDATION_BOUNDS.pwmIntensity.max}%`);
    }

    // Validate LED color mode
    if (
      config.ledColorMode < PRESET_VALIDATION_BOUNDS.ledColorMode.min ||
      config.ledColorMode > PRESET_VALIDATION_BOUNDS.ledColorMode.max
    ) {
      errors.push(`LED color mode must be ${PRESET_VALIDATION_BOUNDS.ledColorMode.min} or ${PRESET_VALIDATION_BOUNDS.ledColorMode.max}`);
    }

    // Validate LED palette index
    if (
      config.ledPaletteIndex < PRESET_VALIDATION_BOUNDS.ledPaletteIndex.min ||
      config.ledPaletteIndex > PRESET_VALIDATION_BOUNDS.ledPaletteIndex.max
    ) {
      errors.push(`LED palette index must be between ${PRESET_VALIDATION_BOUNDS.ledPaletteIndex.min} and ${PRESET_VALIDATION_BOUNDS.ledPaletteIndex.max}`);
    }

    // Validate LED custom RGB
    for (let i = 0; i < 3; i++) {
      if (
        config.ledCustomRGB[i] < PRESET_VALIDATION_BOUNDS.ledCustomRGB.min ||
        config.ledCustomRGB[i] > PRESET_VALIDATION_BOUNDS.ledCustomRGB.max
      ) {
        errors.push(`LED RGB values must be between ${PRESET_VALIDATION_BOUNDS.ledCustomRGB.min} and ${PRESET_VALIDATION_BOUNDS.ledCustomRGB.max}`);
        break;
      }
    }

    // Validate LED brightness
    if (
      config.ledBrightness < PRESET_VALIDATION_BOUNDS.ledBrightness.min ||
      config.ledBrightness > PRESET_VALIDATION_BOUNDS.ledBrightness.max
    ) {
      errors.push(`LED brightness must be between ${PRESET_VALIDATION_BOUNDS.ledBrightness.min}% and ${PRESET_VALIDATION_BOUNDS.ledBrightness.max}%`);
    }

    // Validate session duration
    if (
      config.sessionDuration < PRESET_VALIDATION_BOUNDS.sessionDuration.min ||
      config.sessionDuration > PRESET_VALIDATION_BOUNDS.sessionDuration.max
    ) {
      errors.push(`Session duration must be between ${PRESET_VALIDATION_BOUNDS.sessionDuration.min}s and ${PRESET_VALIDATION_BOUNDS.sessionDuration.max}s`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export all presets to JSON
   */
  exportPresets(): PresetExport {
    return {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      presets: this.getAllPresets(),
    };
  }

  /**
   * Import presets from JSON with validation
   */
  importPresets(data: PresetExport, mode: 'merge' | 'replace' = 'merge'): {
    success: boolean;
    imported: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let imported = 0;

    // Validate export format
    if (!data.version || !data.presets || !Array.isArray(data.presets)) {
      return {
        success: false,
        imported: 0,
        errors: ['Invalid export format'],
      };
    }

    // Get existing presets
    let existingPresets = mode === 'replace' ? [] : this.getAllPresets();
    const existingNames = new Set(existingPresets.map((p) => p.name));

    // Import each preset
    for (const preset of data.presets) {
      try {
        // Validate preset structure
        if (!preset.name || !preset.config) {
          errors.push(`Skipped preset with missing name or config`);
          continue;
        }

        // Validate config bounds
        const validation = this.validateConfig(preset.config);
        if (!validation.valid) {
          errors.push(`Skipped "${preset.name}": ${validation.errors.join(', ')}`);
          continue;
        }

        // Handle name collision
        let finalName = preset.name;
        if (existingNames.has(preset.name)) {
          // Auto-increment name to avoid collision
          let counter = 2;
          finalName = `${preset.name} (${counter})`;
          while (existingNames.has(finalName)) {
            counter++;
            finalName = `${preset.name} (${counter})`;
          }
        }

        // Create preset with new ID and name
        const newPreset: DevicePreset = {
          id: this.generateId(),
          name: finalName,
          createdAt: Date.now(),
          config: preset.config,
        };

        existingPresets.push(newPreset);
        existingNames.add(finalName);
        imported++;
      } catch (error) {
        errors.push(`Failed to import "${preset.name}": ${error}`);
      }
    }

    // Save updated presets
    if (imported > 0) {
      this.saveToStorage(existingPresets);
    }

    return {
      success: imported > 0,
      imported,
      errors,
    };
  }

  /**
   * Save presets array to localStorage
   */
  private saveToStorage(presets: DevicePreset[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save presets:', error);
      throw new Error('Failed to save presets to storage');
    }
  }

  /**
   * Generate a unique ID for presets
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance
export const presetStorageService = new PresetStorageService();
