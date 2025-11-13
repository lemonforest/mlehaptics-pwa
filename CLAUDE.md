# Claude AI Assistant Guide

This document provides context and guidelines for AI assistants working with the MLEHaptics PWA codebase.

## Project Overview

**MLEHaptics PWA** is a Progressive Web App for configuring MLEHaptics BLE devices used in EMDR therapy. It provides a web-based interface to control motor patterns, LED settings, and monitor therapy sessions via Web Bluetooth API.

## Architecture

### Core Design
- **Frontend**: React 18 + TypeScript + Material-UI
- **Communication**: Web Bluetooth API for direct BLE device communication
- **Build System**: Vite with PWA plugin for offline-first architecture
- **State Management**: React hooks (no external state management library)

### Key Architecture Document
**[AD032: BLE Configuration Service Architecture](https://github.com/lemonforest/mlehaptics/blob/main/docs/architecture_decisions.md#ad032-ble-configuration-service-architecture)**

This is the **foundational specification** that defines:
- Complete BLE service UUID structure (12 characteristics)
- Parameter ranges and validation rules
- Motor control modes and LED color system
- Session management and monitoring requirements

**Always consult AD032** when working on BLE-related features or characteristic implementations.

## Project Structure

```
src/
├── components/
│   ├── MotorControl.tsx      # Motor pattern configuration UI
│   ├── LEDControl.tsx         # LED color and brightness UI
│   └── StatusMonitor.tsx      # Session timer and battery monitoring
├── services/
│   └── ble-config.service.ts  # Core BLE service abstraction layer
├── App.tsx                    # Main app with connection management
└── main.tsx                   # Entry point with theme setup
```

## Key Files and Their Roles

### `src/services/ble-config.service.ts`
The **heart of the application** - abstracts all BLE communication:
- Manages connection lifecycle
- Wraps all 12 BLE characteristics (motor, LED, status)
- Handles read/write operations with error handling
- Implements notification subscriptions for real-time updates

**Critical**: All BLE UUIDs and characteristic definitions must match AD032 exactly.

### `src/components/MotorControl.tsx`
Motor configuration UI implementing AD032's motor control characteristics:
- 5 preset modes (MODE_1HZ_50, MODE_1HZ_25, MODE_05HZ_50, MODE_05HZ_25, MODE_CUSTOM)
- Custom frequency: 0.25-2.0 Hz (stored as × 100: 25-200)
- Custom duty cycle: 0-50%
- PWM intensity: 30-80%

### `src/components/LEDControl.tsx`
LED configuration UI implementing AD032's dual color mode system:
- Palette mode: 16 predefined colors
- Custom RGB mode: Full spectrum (0-255 per channel)
- Brightness control: 10-30%
- Enable/disable toggle

### `src/components/StatusMonitor.tsx`
Session monitoring implementing AD032's status characteristics:
- Session duration target: 20-90 minutes (1200-5400 seconds)
- Real-time elapsed time via BLE notifications
- Battery level monitoring with low-battery alerts

## Development Guidelines

### BLE Implementation Rules
1. **Always validate against AD032**: All characteristic UUIDs, data types, and ranges must match the specification
2. **Handle disconnections gracefully**: BLE is unreliable - implement proper error handling and reconnection logic
3. **Use notifications for real-time data**: Session time and battery level use BLE notifications, not polling
4. **Respect parameter ranges**: Enforce AD032's safety limits (e.g., PWM 30-80%, brightness 10-30%)

### Code Style
- **TypeScript strict mode**: Enabled - no implicit any
- **Functional components**: Use hooks, avoid class components
- **Error handling**: Always catch BLE errors and show user-friendly messages
- **Linting**: Run `npm run lint` before committing

### Testing Strategy
- **Manual testing**: Primary method - test with real BLE devices
- **Browser requirements**: Chrome/Edge/Opera only (Safari lacks Web Bluetooth support)
- **HTTPS required**: Web Bluetooth requires secure context (Vite config handles this)

## Common Tasks

### Adding a New BLE Characteristic
1. Check if it's defined in AD032 (if not, propose an architecture decision first)
2. Add UUID and methods to `ble-config.service.ts`
3. Create/update relevant UI component
4. Update README documentation
5. Test with real hardware

### Modifying Parameter Ranges
1. **Do NOT** change ranges without updating AD032 first
2. Coordinate with embedded firmware team (ranges must match on both sides)
3. Update validation in UI components
4. Update documentation

### Debugging BLE Issues
1. Check browser console for detailed BLE errors
2. Verify device is advertising and not connected to another app (e.g., nRF Connect)
3. Use Chrome's `chrome://bluetooth-internals` for low-level debugging
4. Confirm characteristic UUIDs match AD032 exactly

## Related Repositories

- **Embedded Firmware**: [lemonforest/mlehaptics](https://github.com/lemonforest/mlehaptics) - ESP32 firmware implementing AD032
- **Architecture Decisions**: [AD032 and other specs](https://github.com/lemonforest/mlehaptics/blob/main/docs/architecture_decisions.md)

## Important Notes

### Version Compatibility
- PWA version and firmware version should be compatible
- Check that firmware implements the same AD032 characteristics
- Update PWA version in `package.json` when making breaking changes

### Security Considerations
- Web Bluetooth requires user gesture to initiate connection (no auto-connect)
- HTTPS is mandatory in production (GitHub Pages uses HTTPS)
- No sensitive data is stored - all config is on device NVS

### Deployment
- **Live URL**: https://lemonforest.github.io/mlehaptics-pwa/
- **Auto-deploy**: GitHub Actions on push to main branch
- **PWA manifest**: Auto-generated by Vite PWA plugin
- See `DEPLOYMENT.md` for detailed deployment instructions

## Working with Claude

### Best Practices
- **Reference AD032 first**: When modifying BLE features, always cite the relevant AD032 section
- **Test with hardware**: Changes should be tested with real MLEHaptics devices when possible
- **Document changes**: Update README and version number for user-facing changes
- **Follow git workflow**: Use feature branches, write clear commit messages, push to specified branches

### Current Branch
Development should occur on: `claude/add-link-to-o-01SBDCCRsvHhi1wFmGNY7U87`

### Git Workflow
1. Develop on the specified feature branch
2. Commit with descriptive messages
3. Push to origin with `git push -u origin <branch-name>`
4. Branch must start with `claude/` and match session ID

## Questions?

For architectural questions or spec clarifications, consult:
1. AD032 document first
2. Check related issues in mlehaptics or mlehaptics-pwa repos
3. Review commit history for context on past decisions
