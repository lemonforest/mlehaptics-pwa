# MLEHaptics PWA - Configuration Service

Progressive Web App for configuring MLEHaptics BLE devices for EMDR therapy.

## 📋 Architecture Documentation

This PWA implements the **[AD032: BLE Configuration Service Architecture](https://github.com/lemonforest/mlehaptics/blob/main/docs/architecture_decisions.md#ad032-ble-configuration-service-architecture)** specification from the [MLEHaptics embedded firmware project](https://github.com/lemonforest/mlehaptics).

AD032 defines the complete BLE service structure, characteristic UUIDs, parameter ranges, and device behavior. All features in this PWA are designed to be fully compliant with AD032.

## 🚀 Live App

**Try it now:** [https://lemonforest.github.io/mlehaptics-pwa/](https://lemonforest.github.io/mlehaptics-pwa/)

Works on Chrome, Edge, or Opera (Android/Desktop). No installation required - just visit the URL and connect your device!

## Features

### BLE Configuration Service (AD032 Compliant)

This PWA implements the complete BLE Configuration Service architecture as defined in AD032:

#### Motor Control
- **Preset Modes**: 5 predefined motor patterns (1Hz/0.5Hz @ 50%/25%, Custom)
- **Custom Frequency**: 0.25-2.0 Hz research range (adjustable in 0.01 Hz increments)
- **Custom Duty Cycle**: 10-50% timing pattern range (50% max prevents overlap)
- **PWM Intensity**: 0-80% motor power (0% = LED-only mode, no vibration)

#### LED Control
- **Dual Mode System**:
  - **Palette Mode**: 16 preset colors (Red, Green, Blue, Yellow, etc.)
  - **Custom RGB Mode**: Full-spectrum color wheel (0-255 per channel)
- **Brightness Control**: 10-30% eye strain prevention range
- **Enable/Disable**: Toggle LED on/off

#### Status & Monitoring
- **Session Duration**: Configurable 20-90 minute target sessions
- **Real-time Progress**: Live elapsed time tracking via BLE notifications
- **Battery Monitoring**: Real-time battery level (0-100%) with alerts
- **Auto-save**: All settings persist to device NVS storage

## Technology Stack

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Material-UI (MUI)** - Professional component library
- **Vite** - Fast build tool with HMR
- **Web Bluetooth API** - Direct BLE communication
- **PWA** - Offline-first architecture with service workers

## Requirements

### Browser Support

Web Bluetooth API is required. Supported browsers:
- Chrome (desktop and Android)
- Microsoft Edge
- Opera

**Note**: Safari does not currently support Web Bluetooth API.

### Device Requirements

- MLEHaptics device with Configuration Service (UUID: `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`)
- Bluetooth Low Energy (BLE) support
- Device must advertise the Configuration Service

### Security

- **HTTPS Required**: Web Bluetooth requires secure contexts (HTTPS in production)
- **User Gesture**: Connection must be initiated by user action (button click)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will start on `https://localhost:5173` (HTTPS required for Web Bluetooth).

### Build for Production

```bash
npm run build
```

The optimized PWA will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Device Scanning & Connection

The app provides flexible scanning options to find your MLEHaptics device:

#### Quick Connect (Default)
1. Click "Connect Device" in the top-right corner
2. Browser shows devices advertising the Configuration Service
3. Select your MLEHaptics device from the list
4. Device name will appear once connected

**Note:** You do NOT need to pair the device in your phone/computer's Bluetooth settings. The app handles the connection directly via Web Bluetooth API.

#### Advanced Scan Options

For more control over device discovery, click the **Settings icon (⚙️)** next to "Connect Device":

1. **Device Name Prefix** - Filter devices by name pattern
   - Example: Enter "EMDR" to show only devices starting with "EMDR-"
   - Leave empty to show all devices with the Configuration Service

2. **Show All BLE Devices (Testing Mode)** - Display all nearby BLE devices
   - Useful for debugging or when testing with tools like nRF Connect
   - **Warning:** May show incompatible devices that will fail to connect

#### Connection Tips

- Ensure device is powered on and advertising
- Keep device within 10 meters (closer is better)
- **No pairing required** - Web Bluetooth handles connection directly
- If device doesn't appear, try refreshing the scan
- Only one app can connect at a time (disconnect from nRF Connect first)

### Configuration

1. **Connect Device**
   - Use quick connect or advanced scan options
   - Select your MLEHaptics device from the browser's Bluetooth dialog
   - Device name will appear once connected

2. **Configure Motor Settings**
   - Select a preset mode or choose "Custom" for advanced control
   - Adjust frequency (0.25-2.0 Hz) and duty cycle (0-50%) in custom mode
   - Set PWM intensity (30-80%) for motor power

3. **Configure LED Settings**
   - Toggle LED on/off
   - Choose color mode: Palette (16 presets) or Custom RGB (full spectrum)
   - Adjust brightness (10-30%) for comfort

4. **Monitor Session**
   - Set target session duration (20-90 minutes)
   - Track real-time progress and elapsed time
   - Monitor battery level with low-battery alerts

5. **Automatic Saving**
   - All changes are immediately written to the device
   - Settings persist across device power cycles via NVS storage

## Architecture

### BLE Service Implementation

The app implements AD032's Configuration Service with all 12 characteristics:

```typescript
Service UUID: 6E400002-B5A3-F393-E0A9-E50E24DCCA9E

Motor Control (4 characteristics):
- 6E400102: Mode (uint8, R/W)
- 6E400202: Custom Frequency (uint16, R/W)
- 6E400302: Custom Duty Cycle (uint8, R/W)
- 6E400402: PWM Intensity (uint8, R/W)

LED Control (5 characteristics):
- 6E400502: LED Enable (uint8, R/W)
- 6E400602: LED Color Mode (uint8, R/W)
- 6E400702: LED Palette Index (uint8, R/W)
- 6E400802: LED Custom RGB (uint8[3], R/W)
- 6E400902: LED Brightness (uint8, R/W)

Status/Monitoring (3 characteristics):
- 6E400A02: Session Duration (uint32, R/W)
- 6E400B02: Session Time (uint32, R/Notify)
- 6E400C02: Battery Level (uint8, R/Notify)
```

### PWA Features

- **Offline Support**: Service worker caches assets for offline use
- **Installable**: Can be installed as a standalone app on mobile/desktop
- **Responsive**: Works on phones, tablets, and desktop browsers
- **Fast**: Optimized build with code splitting and lazy loading

## Project Structure

```
mlehaptics-pwa/
├── public/
│   ├── favicon.ico
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── components/
│   │   ├── MotorControl.tsx    # Motor configuration UI
│   │   ├── LEDControl.tsx      # LED configuration UI
│   │   └── StatusMonitor.tsx   # Session & battery monitoring
│   ├── services/
│   │   └── ble-config.service.ts  # BLE Configuration Service layer
│   ├── App.tsx                 # Main app with connection management
│   ├── main.tsx               # Entry point with theme
│   └── vite-env.d.ts          # Type definitions
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts             # Vite + PWA configuration
└── README.md
```

## Configuration Service Details

### Default Settings (First Boot)

- Mode: MODE_1HZ_50 (1 Hz @ 50%)
- Custom Frequency: 100 (1.00 Hz)
- Custom Duty: 50%
- PWM Intensity: 75%
- LED Enable: false
- LED Color Mode: Custom RGB
- LED Custom RGB: Red (255, 0, 0)
- LED Brightness: 20%
- Session Duration: 1200 seconds (20 minutes)

### Parameter Ranges

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| Mode | uint8 | 0-4 | Motor preset modes |
| Custom Frequency | uint16 | 25-200 | Hz × 100 (0.25-2.0 Hz) |
| Custom Duty | uint8 | 10-50 | Duty cycle percentage |
| PWM Intensity | uint8 | 0-80 | Motor power (0% = LED-only) |
| LED Enable | uint8 | 0-1 | Off/On |
| LED Color Mode | uint8 | 0-1 | Palette/Custom RGB |
| LED Palette Index | uint8 | 0-15 | 16-color preset |
| LED Custom RGB | uint8[3] | 0-255 | RGB channels |
| LED Brightness | uint8 | 10-30 | Brightness percentage |
| Session Duration | uint32 | 1200-5400 | Seconds (20-90 min) |

## Troubleshooting

### "Web Bluetooth is not supported"
- Use Chrome, Edge, or Opera browser
- Safari does not support Web Bluetooth
- Ensure you're using a recent browser version

### "Connection failed"
- Ensure device is powered on and within range
- **Disconnect from other apps first** - Only one BLE connection at a time (close nRF Connect, etc.)
- Check that device is advertising the Configuration Service
- Try advanced scan with "Show All Devices" to verify device is visible
- Try refreshing the page and reconnecting
- Check browser console for detailed error messages

### "HTTPS required"
- Web Bluetooth only works over HTTPS in production
- Development servers must use HTTPS (Vite config includes this)
- Use `localhost` in development (automatically secure context)

### Settings not persisting
- Check that device firmware implements NVS storage
- Verify write operations complete successfully in browser console
- Ensure device has sufficient NVS flash space

## Development

### Linting

```bash
npm run lint
```

### Type Checking

TypeScript will check types during build. For manual checking:

```bash
npx tsc --noEmit
```

## Related Documentation

- [AD032: BLE Configuration Service Architecture](https://github.com/lemonforest/mlehaptics/blob/main/docs/architecture_decisions.md#ad032-ble-configuration-service-architecture)
- [Web Bluetooth API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## License

Copyright © 2025 MLEHaptics Project

## Support

For issues and questions:
- GitHub Issues: [mlehaptics-pwa issues](https://github.com/lemonforest/mlehaptics-pwa/issues)
- Main Project: [mlehaptics](https://github.com/lemonforest/mlehaptics)
