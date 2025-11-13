/**
 * Device Preset Types
 * Type definitions for saving and loading device configurations
 */

import { MotorMode } from '../services/ble-config.service';

/**
 * Device configuration that can be saved as a preset
 * Excludes read-only values (sessionTime, batteryLevel)
 */
export interface PresetConfig {
  // Motor Control
  mode: MotorMode;
  customFrequency: number; // Hz × 100 (25-200 = 0.25-2.0 Hz)
  customDutyCycle: number; // 10-90%
  pwmIntensity: number; // 30-80%

  // LED Control
  ledEnable: boolean;
  ledColorMode: number; // 0=palette, 1=custom RGB
  ledPaletteIndex: number; // 0-15
  ledCustomRGB: [number, number, number]; // RGB 0-255
  ledBrightness: number; // 10-30%

  // Session
  sessionDuration: number; // 1200-5400 sec (20-90 min)
}

/**
 * Device preset with metadata
 */
export interface DevicePreset {
  id: string; // UUID
  name: string; // User-provided name
  createdAt: number; // Unix timestamp
  config: PresetConfig;
}

/**
 * Validation bounds for device settings
 */
export const PRESET_VALIDATION_BOUNDS = {
  customFrequency: { min: 25, max: 200 },
  customDutyCycle: { min: 10, max: 90 },
  pwmIntensity: { min: 30, max: 80 },
  ledColorMode: { min: 0, max: 1 },
  ledPaletteIndex: { min: 0, max: 15 },
  ledCustomRGB: { min: 0, max: 255 },
  ledBrightness: { min: 10, max: 30 },
  sessionDuration: { min: 1200, max: 5400 },
  motorMode: { min: 0, max: 4 }, // MotorMode enum values
} as const;

/**
 * Export format for presets (includes version for future compatibility)
 */
export interface PresetExport {
  version: string;
  exportedAt: number;
  presets: DevicePreset[];
}
