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
  customDutyCycle: number; // 10-90%
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

export class BLEConfigService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private characteristics: Map<string, BluetoothRemoteGATTCharacteristic> = new Map();

  private listeners: Map<string, Set<(value: any) => void>> = new Map();

  async connect(): Promise<void> {
    try {
      // Request device with Configuration Service
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [CONFIG_SERVICE_UUID] }],
        optionalServices: [CONFIG_SERVICE_UUID],
      });

      if (!this.device.gatt) {
        throw new Error('GATT not supported');
      }

      // Connect to GATT server
      this.server = await this.device.gatt.connect();

      // Get Configuration Service
      this.service = await this.server.getPrimaryService(CONFIG_SERVICE_UUID);

      // Get all characteristics
      await this.discoverCharacteristics();

      // Setup notifications for read-only characteristics
      await this.setupNotifications();
    } catch (error) {
      console.error('BLE connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristics.clear();
    this.listeners.clear();
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
    // Setup notifications for read-only characteristics
    const notifyChars = ['SESSION_TIME', 'BATTERY_LEVEL'];

    for (const charKey of notifyChars) {
      const char = this.characteristics.get(charKey);
      if (char) {
        try {
          await char.startNotifications();
          char.addEventListener('characteristicvaluechanged', (event) => {
            this.handleCharacteristicChange(charKey, event.target as BluetoothRemoteGATTCharacteristic);
          });
        } catch (error) {
          console.warn(`Failed to setup notifications for ${charKey}:`, error);
        }
      }
    }
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
    return {
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
}

// Singleton instance
export const bleConfigService = new BLEConfigService();
