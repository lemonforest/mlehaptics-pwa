/**
 * BLE Configuration Service for MLEHaptics
 * Implements AD032: BLE Configuration Service Architecture
 */

// Service UUID (13th byte = 02 for Configuration Service)
export const CONFIG_SERVICE_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

// Characteristic UUIDs (14th byte increments)
export const CHARACTERISTICS = {
  // MOTOR CONTROL GROUP
  MODE: '6e400102-b5a3-f393-e0a9-e50e24dcca9e',
  CUSTOM_FREQUENCY: '6e400202-b5a3-f393-e0a9-e50e24dcca9e',
  CUSTOM_DUTY_CYCLE: '6e400302-b5a3-f393-e0a9-e50e24dcca9e',
  PWM_INTENSITY: '6e400402-b5a3-f393-e0a9-e50e24dcca9e',

  // LED CONTROL GROUP
  LED_ENABLE: '6e400502-b5a3-f393-e0a9-e50e24dcca9e',
  LED_COLOR_MODE: '6e400602-b5a3-f393-e0a9-e50e24dcca9e',
  LED_PALETTE_INDEX: '6e400702-b5a3-f393-e0a9-e50e24dcca9e',
  LED_CUSTOM_RGB: '6e400802-b5a3-f393-e0a9-e50e24dcca9e',
  LED_BRIGHTNESS: '6e400902-b5a3-f393-e0a9-e50e24dcca9e',

  // STATUS/MONITORING GROUP
  SESSION_DURATION: '6e400a02-b5a3-f393-e0a9-e50e24dcca9e',
  SESSION_TIME: '6e400b02-b5a3-f393-e0a9-e50e24dcca9e',
  BATTERY_LEVEL: '6e400c02-b5a3-f393-e0a9-e50e24dcca9e',
} as const;

// Motor modes (AD032)
export enum MotorMode {
  MODE_1HZ_50 = 0,
  MODE_1HZ_25 = 1,
  MODE_05HZ_50 = 2,
  MODE_05HZ_25 = 3,
  MODE_CUSTOM = 4,
}

export const MOTOR_MODE_LABELS = {
  [MotorMode.MODE_1HZ_50]: '1.0 Hz @ 50%',
  [MotorMode.MODE_1HZ_25]: '1.0 Hz @ 25%',
  [MotorMode.MODE_05HZ_50]: '0.5 Hz @ 50%',
  [MotorMode.MODE_05HZ_25]: '0.5 Hz @ 25%',
  [MotorMode.MODE_CUSTOM]: 'Custom',
};

// LED Color Palette (16 colors from firmware)
export const COLOR_PALETTE = [
  { name: 'Red', rgb: [255, 0, 0] },
  { name: 'Green', rgb: [0, 255, 0] },
  { name: 'Blue', rgb: [0, 0, 255] },
  { name: 'Yellow', rgb: [255, 255, 0] },
  { name: 'Cyan', rgb: [0, 255, 255] },
  { name: 'Magenta', rgb: [255, 0, 255] },
  { name: 'White', rgb: [255, 255, 255] },
  { name: 'Orange', rgb: [255, 165, 0] },
  { name: 'Purple', rgb: [128, 0, 128] },
  { name: 'Pink', rgb: [255, 192, 203] },
  { name: 'Lime', rgb: [0, 255, 0] },
  { name: 'Indigo', rgb: [75, 0, 130] },
  { name: 'Teal', rgb: [0, 128, 128] },
  { name: 'Gold', rgb: [255, 215, 0] },
  { name: 'Silver', rgb: [192, 192, 192] },
  { name: 'Coral', rgb: [255, 127, 80] },
];

export interface DeviceConfig {
  // Motor Control
  mode: MotorMode;
  customFrequency: number; // Hz × 100 (25-200 = 0.25-2.0 Hz)
  customDutyCycle: number; // 0-50%
  pwmIntensity: number; // 30-80%

  // LED Control
  ledEnable: boolean;
  ledColorMode: number; // 0=palette, 1=custom RGB
  ledPaletteIndex: number; // 0-15
  ledCustomRGB: [number, number, number]; // RGB 0-255
  ledBrightness: number; // 10-30%

  // Status/Monitoring
  sessionDuration: number; // 1200-5400 sec (20-90 min)
  sessionTime: number; // Elapsed seconds (read-only)
  batteryLevel: number; // 0-100% (read-only)
}

export interface ScanOptions {
  namePrefix?: string; // Filter devices by name prefix (e.g., "EMDR", "MLEHaptics")
  acceptAllDevices?: boolean; // Show all BLE devices (for testing/debugging)
  disableAutoNotifications?: boolean; // Disable automatic notifications for battery/session time (use polling instead)
}

export class BLEConfigService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private characteristics: Map<string, BluetoothRemoteGATTCharacteristic> = new Map();

  private listeners: Map<string, Set<(value: any) => void>> = new Map();
  private cachedConfig: DeviceConfig | null = null;
  private autoNotificationsEnabled: boolean = true;
  private configChangeListeners: Set<(config: DeviceConfig) => void> = new Set();

  // Track event listeners for proper cleanup
  private characteristicEventListeners: Map<string, (event: Event) => void> = new Map();
  private characteristicsWithNotifications: Set<string> = new Set();
  private disconnectHandler: (() => void) | null = null;

  private buildRequestOptions(options: ScanOptions): RequestDeviceOptions {
    // If acceptAllDevices is true, show all BLE devices (testing mode)
    if (options.acceptAllDevices) {
      return {
        acceptAllDevices: true,
        optionalServices: [CONFIG_SERVICE_UUID],
      };
    }

    // Build filters array
    const filters: BluetoothLEScanFilter[] = [];

    // Filter by name prefix if provided
    if (options.namePrefix) {
      // Only filter by name prefix - don't require service in advertisement
      // (many devices don't advertise all services to save space)
      filters.push({
        namePrefix: options.namePrefix,
      });
    } else {
      // Default: filter by service UUID only
      filters.push({
        services: [CONFIG_SERVICE_UUID],
      });
    }

    return {
      filters,
      optionalServices: [CONFIG_SERVICE_UUID],
    };
  }

  async connect(options: ScanOptions = {}): Promise<void> {
    try {
      // Store notification preference
      this.autoNotificationsEnabled = !options.disableAutoNotifications;

      // Build request device options based on scan options
      const requestOptions: RequestDeviceOptions = this.buildRequestOptions(options);

      // Request device with Configuration Service
      this.device = await navigator.bluetooth.requestDevice(requestOptions);

      if (!this.device.gatt) {
        throw new Error('GATT not supported');
      }

      // Setup disconnect event listener before connecting
      // This handles both user-initiated and unexpected disconnects
      this.disconnectHandler = () => {
        console.log('Device disconnected (gattserverdisconnected event)');
        this.handleDisconnect();
      };
      this.device.addEventListener('gattserverdisconnected', this.disconnectHandler);

      // Connect to GATT server
      this.server = await this.device.gatt.connect();

      // Get Configuration Service
      this.service = await this.server.getPrimaryService(CONFIG_SERVICE_UUID);

      // Get all characteristics
      await this.discoverCharacteristics();

      // Setup notifications for read-only characteristics (only if enabled)
      if (this.autoNotificationsEnabled) {
        await this.setupNotifications();
      } else {
        console.log('Auto-notifications disabled. Using polling mode for battery/session time.');
      }

      // Read and cache initial configuration to ensure UI sync
      console.log('Reading initial device configuration...');
      this.cachedConfig = await this.readConfig();
      console.log('Initial configuration loaded:', this.cachedConfig);
    } catch (error) {
      console.error('BLE connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (!this.device?.gatt?.connected) {
        console.log('Device already disconnected');
        this.handleDisconnect();
        return;
      }

      console.log('Starting disconnect sequence...');

      // Step 1: Stop all notifications and remove characteristic event listeners
      // This is critical for Android to properly release BLE resources
      console.log('Cleaning up notifications and event listeners...');
      await this.stopNotifications();

      // Step 2: Perform a final characteristic read to ensure BLE connection is active
      // This is a workaround for Android Chrome where gatt.disconnect() doesn't always
      // send the disconnect packet if the connection is "idle"
      try {
        console.log('Performing final read to activate BLE connection...');
        await this.readUint8('MODE');
        console.log('Final read completed');
      } catch (readError) {
        console.warn('Final read failed (connection may already be unstable):', readError);
      }

      // Step 3: Small delay to let the read complete and BLE stack stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 4: Remove the gattserverdisconnected event listener
      // We'll clean up manually instead of letting the event trigger
      if (this.device && this.disconnectHandler) {
        this.device.removeEventListener('gattserverdisconnected', this.disconnectHandler);
      }

      // Step 5: Disconnect GATT server
      // After the characteristic read, the BLE stack should now send the disconnect packet
      console.log('Sending disconnect to GATT server...');
      this.device.gatt.disconnect();

      // Step 6: Wait to ensure disconnect packet is sent by BLE stack
      // Android needs this delay to actually transmit the disconnect
      console.log('Waiting for disconnect packet to be sent...');
      await new Promise(resolve => setTimeout(resolve, 150));

      // Step 7: Clean up all references
      this.handleDisconnect();

      console.log('Disconnect complete');
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Still clean up references even if there was an error
      this.handleDisconnect();
    }
  }

  private handleDisconnect(): void {
    // Clean up all internal state
    // This is called both by disconnect() and by the gattserverdisconnected event
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristics.clear();
    this.listeners.clear();
    this.cachedConfig = null;
    this.characteristicsWithNotifications.clear();
    this.characteristicEventListeners.clear();
    this.disconnectHandler = null;
    this.configChangeListeners.clear();
  }

  isConnected(): boolean {
    return this.device?.gatt?.connected ?? false;
  }

  getDeviceName(): string {
    return this.device?.name ?? 'Unknown Device';
  }

  private async discoverCharacteristics(): Promise<void> {
    if (!this.service) throw new Error('Service not initialized');

    for (const [key, uuid] of Object.entries(CHARACTERISTICS)) {
      try {
        const char = await this.service.getCharacteristic(uuid);
        this.characteristics.set(key, char);
      } catch (error) {
        console.warn(`Characteristic ${key} not found:`, error);
      }
    }
  }

  private async setupNotifications(): Promise<void> {
    // Setup notifications for status characteristics and MODE (if supported by firmware)
    const notifyChars = ['SESSION_TIME', 'BATTERY_LEVEL', 'MODE'];

    for (const charKey of notifyChars) {
      const char = this.characteristics.get(charKey);
      if (char) {
        try {
          await char.startNotifications();
          this.characteristicsWithNotifications.add(charKey);

          // Create and store event listener for cleanup
          const listener = (event: Event) => {
            this.handleCharacteristicChange(charKey, event.target as BluetoothRemoteGATTCharacteristic);
          };
          this.characteristicEventListeners.set(charKey, listener);
          char.addEventListener('characteristicvaluechanged', listener);
          console.log(`Notifications enabled for ${charKey}`);
        } catch (error) {
          console.warn(`Failed to setup notifications for ${charKey}:`, error);
        }
      }
    }
  }

  private async stopNotifications(): Promise<void> {
    // Stop all notifications and remove event listeners
    for (const charKey of this.characteristicsWithNotifications) {
      const char = this.characteristics.get(charKey);
      const listener = this.characteristicEventListeners.get(charKey);

      if (char && listener) {
        try {
          // Remove event listener first
          char.removeEventListener('characteristicvaluechanged', listener);

          // Stop notifications if still connected
          if (this.device?.gatt?.connected) {
            await char.stopNotifications();
          }
        } catch (error) {
          console.warn(`Failed to cleanup notifications for ${charKey}:`, error);
        }
      }
    }

    // Clear tracking sets/maps
    this.characteristicsWithNotifications.clear();
    this.characteristicEventListeners.clear();
  }

  private handleCharacteristicChange(key: string, char: BluetoothRemoteGATTCharacteristic): void {
    const listeners = this.listeners.get(key);
    if (!listeners || !char.value) return;

    let value: any;
    switch (key) {
      case 'SESSION_TIME':
      case 'SESSION_DURATION':
        value = char.value.getUint32(0, true);
        break;
      case 'BATTERY_LEVEL':
      case 'MODE':
      case 'CUSTOM_DUTY_CYCLE':
      case 'PWM_INTENSITY':
      case 'LED_ENABLE':
      case 'LED_COLOR_MODE':
      case 'LED_PALETTE_INDEX':
      case 'LED_BRIGHTNESS':
        value = char.value.getUint8(0);
        break;
      case 'CUSTOM_FREQUENCY':
        value = char.value.getUint16(0, true);
        break;
      case 'LED_CUSTOM_RGB':
        value = [
          char.value.getUint8(0),
          char.value.getUint8(1),
          char.value.getUint8(2),
        ];
        break;
    }

    listeners.forEach(listener => listener(value));
  }

  subscribe(characteristic: string, callback: (value: any) => void): () => void {
    if (!this.listeners.has(characteristic)) {
      this.listeners.set(characteristic, new Set());
    }
    this.listeners.get(characteristic)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(characteristic)?.delete(callback);
    };
  }

  /**
   * Subscribe to config changes (e.g., when presets are loaded)
   * @param callback Function to call when config is updated
   * @returns Unsubscribe function
   */
  onConfigChange(callback: (config: DeviceConfig) => void): () => void {
    this.configChangeListeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.configChangeListeners.delete(callback);
    };
  }

  // Read operations
  async readUint8(charKey: string): Promise<number> {
    const char = this.characteristics.get(charKey);
    if (!char) throw new Error(`Characteristic ${charKey} not found`);

    const value = await char.readValue();
    return value.getUint8(0);
  }

  async readUint16(charKey: string): Promise<number> {
    const char = this.characteristics.get(charKey);
    if (!char) throw new Error(`Characteristic ${charKey} not found`);

    const value = await char.readValue();
    return value.getUint16(0, true);
  }

  async readUint32(charKey: string): Promise<number> {
    const char = this.characteristics.get(charKey);
    if (!char) throw new Error(`Characteristic ${charKey} not found`);

    const value = await char.readValue();
    return value.getUint32(0, true);
  }

  async readRGB(charKey: string): Promise<[number, number, number]> {
    const char = this.characteristics.get(charKey);
    if (!char) throw new Error(`Characteristic ${charKey} not found`);

    const value = await char.readValue();
    return [value.getUint8(0), value.getUint8(1), value.getUint8(2)];
  }

  // Write operations
  async writeUint8(charKey: string, value: number): Promise<void> {
    const char = this.characteristics.get(charKey);
    if (!char) throw new Error(`Characteristic ${charKey} not found`);

    const buffer = new Uint8Array([value]);
    await char.writeValue(buffer);
  }

  async writeUint16(charKey: string, value: number): Promise<void> {
    const char = this.characteristics.get(charKey);
    if (!char) throw new Error(`Characteristic ${charKey} not found`);

    const buffer = new Uint8Array(2);
    new DataView(buffer.buffer).setUint16(0, value, true);
    await char.writeValue(buffer);
  }

  async writeUint32(charKey: string, value: number): Promise<void> {
    const char = this.characteristics.get(charKey);
    if (!char) throw new Error(`Characteristic ${charKey} not found`);

    const buffer = new Uint8Array(4);
    new DataView(buffer.buffer).setUint32(0, value, true);
    await char.writeValue(buffer);
  }

  async writeRGB(charKey: string, rgb: [number, number, number]): Promise<void> {
    const char = this.characteristics.get(charKey);
    if (!char) throw new Error(`Characteristic ${charKey} not found`);

    const buffer = new Uint8Array(rgb);
    await char.writeValue(buffer);
  }

  // High-level configuration methods
  async readConfig(): Promise<DeviceConfig> {
    const config = {
      mode: await this.readUint8('MODE') as MotorMode,
      customFrequency: await this.readUint16('CUSTOM_FREQUENCY'),
      customDutyCycle: await this.readUint8('CUSTOM_DUTY_CYCLE'),
      pwmIntensity: await this.readUint8('PWM_INTENSITY'),
      ledEnable: (await this.readUint8('LED_ENABLE')) === 1,
      ledColorMode: await this.readUint8('LED_COLOR_MODE'),
      ledPaletteIndex: await this.readUint8('LED_PALETTE_INDEX'),
      ledCustomRGB: await this.readRGB('LED_CUSTOM_RGB'),
      ledBrightness: await this.readUint8('LED_BRIGHTNESS'),
      sessionDuration: await this.readUint32('SESSION_DURATION'),
      sessionTime: await this.readUint32('SESSION_TIME'),
      batteryLevel: await this.readUint8('BATTERY_LEVEL'),
    };
    // Update cache
    this.cachedConfig = config;

    // Notify all config change listeners
    this.configChangeListeners.forEach(listener => listener(config));

    return config;
  }

  getCachedConfig(): DeviceConfig | null {
    return this.cachedConfig;
  }

  async setMotorMode(mode: MotorMode): Promise<void> {
    await this.writeUint8('MODE', mode);
  }

  async setCustomFrequency(freq: number): Promise<void> {
    await this.writeUint16('CUSTOM_FREQUENCY', freq);
  }

  async setCustomDutyCycle(duty: number): Promise<void> {
    await this.writeUint8('CUSTOM_DUTY_CYCLE', duty);
  }

  async setPWMIntensity(intensity: number): Promise<void> {
    await this.writeUint8('PWM_INTENSITY', intensity);
  }

  async setLEDEnable(enable: boolean): Promise<void> {
    await this.writeUint8('LED_ENABLE', enable ? 1 : 0);
  }

  async setLEDColorMode(mode: number): Promise<void> {
    await this.writeUint8('LED_COLOR_MODE', mode);
  }

  async setLEDPaletteIndex(index: number): Promise<void> {
    await this.writeUint8('LED_PALETTE_INDEX', index);
  }

  async setLEDCustomRGB(rgb: [number, number, number]): Promise<void> {
    await this.writeRGB('LED_CUSTOM_RGB', rgb);
  }

  async setLEDBrightness(brightness: number): Promise<void> {
    await this.writeUint8('LED_BRIGHTNESS', brightness);
  }

  async setSessionDuration(duration: number): Promise<void> {
    await this.writeUint32('SESSION_DURATION', duration);
  }

  /**
   * Read current session time from device (for polling mode)
   * @returns Current elapsed session time in seconds
   */
  async readSessionTime(): Promise<number> {
    return await this.readUint32('SESSION_TIME');
  }

  /**
   * Read current battery level from device (for polling mode)
   * @returns Battery level (0-100)
   */
  async readBatteryLevel(): Promise<number> {
    return await this.readUint8('BATTERY_LEVEL');
  }

  /**
   * Check if auto-notifications are enabled
   * @returns true if notifications are enabled, false if polling mode
   */
  isAutoNotificationsEnabled(): boolean {
    return this.autoNotificationsEnabled;
  }
}

// Singleton instance
export const bleConfigService = new BLEConfigService();
