# MLEHaptics PWA

Progressive Web App for configuring MLEHaptics BLE devices used in EMDR therapy.

## Live App

**[https://lemonforest.github.io/mlehaptics-pwa/](https://lemonforest.github.io/mlehaptics-pwa/)**

Works on Chrome, Edge, or Opera (Android/Desktop). No installation required.

## Architecture

This PWA implements **[AD032: BLE Configuration Service](https://github.com/lemonforest/mlehaptics/tree/main/docs/adr)** from the [MLEHaptics embedded project](https://github.com/lemonforest/mlehaptics).

## Features

### Device Configuration

| Feature | Description |
|---------|-------------|
| **Motor Control** | 4 preset modes (0.5-2.0 Hz @ 25%) + Custom mode with adjustable frequency/duty cycle |
| **LED Control** | 16-color palette or custom RGB, with universal brightness control (10-30%) |
| **Session Timer** | Configurable 20-90 minute sessions with real-time progress tracking |
| **Battery Monitor** | Live battery level with low-battery alerts |

### App Features

| Feature | Description |
|---------|-------------|
| **Device Presets** | Save, load, import/export device configurations |
| **PWA Settings** | Theme (light/dark/auto), compact mode, advanced controls |
| **Connecting Overlay** | Branded loading screen during BLE connection |
| **Disconnect Detection** | UI updates automatically when device disconnects |
| **Offline Support** | Works without internet after first load |

## Quick Start

### Using the Live App

1. Visit [https://lemonforest.github.io/mlehaptics-pwa/](https://lemonforest.github.io/mlehaptics-pwa/)
2. Click **Connect Device**
3. Select your MLEHaptics device from the browser's Bluetooth dialog
4. Configure motor, LED, and session settings

**Note:** No Bluetooth pairing required - the app handles connection directly.

### Local Development

```bash
npm install
npm run dev
```

Opens at `https://localhost:5173` (HTTPS required for Web Bluetooth).

## Requirements

### Browser Support

| Browser | Support |
|---------|---------|
| Chrome | Desktop & Android |
| Edge | Desktop |
| Opera | Desktop & Android |
| Safari | Not supported (no Web Bluetooth) |

### Device Requirements

- MLEHaptics device with firmware v0.1.2+
- Configuration Service UUID: `4BCAE9BE-9829-4F0A-9E88-267DE5E70200`

## BLE Configuration Service

### Characteristics (AD032)

```
Service: 4BCAE9BE-9829-4F0A-9E88-267DE5E70200

Motor Control:
  ...70201  Mode              uint8    R/W    0-4 (preset modes + custom)
  ...70202  Custom Frequency  uint16   R/W    25-200 (0.25-2.0 Hz × 100)
  ...70203  Custom Duty Cycle uint8    R/W    10-100%
  ...70204  PWM Intensity     uint8    R/W    0-80% (0 = LED-only)

LED Control:
  ...70205  LED Enable        uint8    R/W    0-1
  ...70206  LED Color Mode    uint8    R/W    0=palette, 1=custom RGB
  ...70207  LED Palette Index uint8    R/W    0-15
  ...70208  LED Custom RGB    uint8[3] R/W    0-255 per channel
  ...70209  LED Brightness    uint8    R/W    10-30%

Status:
  ...7020A  Session Duration  uint32   R/W    1200-5400 sec (20-90 min)
  ...7020B  Session Time      uint32   R/N    Elapsed seconds
  ...7020C  Battery Level     uint8    R/N    0-100%
```

### Motor Modes

| Mode | Value | Description |
|------|-------|-------------|
| MODE_05HZ_25 | 0 | 0.5 Hz @ 25% duty cycle |
| MODE_1HZ_25 | 1 | 1.0 Hz @ 25% duty cycle |
| MODE_15HZ_25 | 2 | 1.5 Hz @ 25% duty cycle |
| MODE_2HZ_25 | 3 | 2.0 Hz @ 25% duty cycle |
| MODE_CUSTOM | 4 | Custom frequency & duty cycle |

## Project Structure

```
mlehaptics-pwa/
├── src/
│   ├── components/
│   │   ├── MotorControl.tsx       # Motor configuration UI
│   │   ├── LEDControl.tsx         # LED configuration UI
│   │   ├── StatusMonitor.tsx      # Session timer & battery
│   │   ├── PresetManager.tsx      # Save/load device presets
│   │   ├── SettingsDialog.tsx     # PWA settings UI
│   │   └── ConnectingOverlay.tsx  # Connection loading screen
│   ├── contexts/
│   │   └── PWASettingsContext.tsx # App settings state
│   ├── hooks/
│   │   ├── useDebouncedBLESend.ts # Slider debouncing
│   │   ├── useSessionTimer.ts     # Hybrid timer with device sync
│   │   └── useBatteryLevel.ts     # Battery monitoring
│   ├── services/
│   │   ├── ble-config.service.ts  # BLE communication layer
│   │   ├── pwa-settings.service.ts    # Settings persistence
│   │   ├── preset-storage.service.ts  # Preset management
│   │   └── indexeddb.service.ts   # IndexedDB operations
│   ├── types/
│   │   ├── preset.types.ts        # Device preset types
│   │   └── pwa-settings.types.ts  # Settings types
│   ├── App.tsx                    # Main app component
│   └── main.tsx                   # Entry point & theme
├── docs/
│   └── external/                  # Cached architecture docs
├── CHANGELOG.md                   # Version history
├── DEPLOYMENT.md                  # Deployment guide
└── CLAUDE.md                      # AI assistant guide
```

## Technology Stack

- **React 18** + TypeScript
- **Material-UI** for components
- **Vite** + PWA plugin
- **Web Bluetooth API**
- **IndexedDB** for storage

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint check
npm run deploy    # Deploy to GitHub Pages
npm run fetch-docs # Update local AD032 cache
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Web Bluetooth not supported" | Use Chrome, Edge, or Opera |
| Device not appearing | Ensure device is on and close other BLE apps (nRF Connect, etc.) |
| Connection failed | Move closer to device, try refreshing page |
| HTTPS required error | Use localhost or deploy to HTTPS host |

## Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - GitHub Pages deployment
- **[CLAUDE.md](CLAUDE.md)** - AI assistant guide
- **[AD032: BLE Configuration Service](https://github.com/lemonforest/mlehaptics/tree/main/docs/adr)** - BLE specification
- **[MLEHaptics Firmware](https://github.com/lemonforest/mlehaptics)** - Embedded project

## License

Copyright © 2025 MLEHaptics Project

## Support

- [GitHub Issues](https://github.com/lemonforest/mlehaptics-pwa/issues)
- [Main Project](https://github.com/lemonforest/mlehaptics)
