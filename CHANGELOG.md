# Changelog

All notable changes to the MLEHaptics PWA project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.4.0] - 2025-11-25

### Added
- **BLE disconnect callback**: UI now properly updates when device unexpectedly disconnects (e.g., device powered off, out of range)
- **Connecting overlay**: Responsive branded loading screen during BLE connection with:
  - Animated Bluetooth icon
  - Progress spinner
  - MLEHaptics branding
  - Responsive design (centered card on desktop, fuller on mobile)
- Connect button now disabled during connection to prevent double-clicks
- Filters out "user cancelled" error when closing device picker

### Changed
- **LED brightness is now universal**: Brightness slider works in all motor modes, not just Custom mode
- Updated brightness helper text to clarify it applies to all modes

### Technical
- Added `onDisconnect()` subscription method to `BLEConfigService` for external disconnect listeners
- Added `ConnectingOverlay` component with MUI Dialog and responsive breakpoints
- Added `isConnecting` state to App.tsx for connection progress tracking

## [2.3.1] - 2025-11-24

### Changed
- **Updated motor mode enums**: Motor modes now match updated firmware specification
  - Renamed preset modes for clarity (e.g., MODE_1HZ_50 → MODE_05HZ_25)
  - Updated mode labels in UI to reflect actual frequency/duty cycle values

## [2.3.0] - 2025-11-22

### Added
- **PWA Settings Dialog**: New settings UI for app-level configuration
  - Theme selection (Light/Dark/Auto)
  - Compact mode toggle for smaller screens
  - Show advanced controls option
  - Slider response delay configuration
  - Auto-reconnect settings
- **Compact mode**: Reduced spacing throughout UI for better mobile experience
- **Advanced controls toggle**: Hide/show debug and power-user options

### Technical
- Added `SettingsDialog` component with full settings management
- Implemented theme switching with system preference detection
- Added compact mode responsive styling throughout components

## [2.2.0] - 2025-11-20

### Added
- **Pause-to-send slider functionality**: Sliders now use debounced sending during interaction
  - Sends value to device after configurable pause (default 500ms)
  - Prevents BLE flooding while user adjusts sliders
  - Configurable delay in PWA settings
- **IndexedDB storage**: Migrated from localStorage for better data management
  - PWA settings stored in IndexedDB
  - Device presets stored in IndexedDB
  - Automatic migration from localStorage on first load
- **PWA Settings infrastructure**: Foundation for app-level configuration
  - Settings context provider for global access
  - Settings service with IndexedDB persistence

### Changed
- **Motor duty cycle range**: Updated to 10-100% (was 0-50%) per firmware update

### Technical
- Added `IndexedDBService` for database operations
- Added `PWASettingsContext` for React state management
- Added `pwa-settings.service.ts` for settings persistence
- Created type definitions for PWA settings

## [2.1.0] - 2025-11-16

### Changed - Performance & UX
- **Optimized slider BLE communication**: Sliders now send BLE writes only on release (using `onChangeCommitted`) instead of continuously during dragging
  - Reduced BLE traffic by ~99% during slider adjustments (from 100+ writes to 1 per adjustment)
  - Dramatically improved performance and responsiveness across all sliders
  - Affects 8 sliders: Motor (Frequency, Duty Cycle, PWM), LED (RGB, Brightness), Status (Duration)
- **Replaced browser dialogs with Material-UI components** for consistent design:
  - `alert()` → Material-UI Snackbar with auto-dismiss (6 seconds) and manual close
  - `window.confirm()` → Styled Material-UI Dialog for delete confirmations
  - Non-blocking error notifications that match app aesthetic

### Added
- **Loading indicators for preset operations**:
  - Save preset: Spinner on button with "Reading device settings..." message
  - Load preset: Linear progress bar showing 0-100% as each of 10 BLE writes completes
  - Individual preset load buttons show spinner during operation
  - All interactive elements disabled during operations to prevent duplicate actions
- **Material-UI delete confirmation dialog** for presets:
  - Preset name highlighted in confirmation text
  - "This action cannot be undone" warning message
  - Red "Delete" button for clear destructive action indication

### Technical
- Added `@types/web-bluetooth` dev dependency for better TypeScript support
- Split slider handlers into `onChange` (local state) and `onChangeCommitted` (BLE write) for all 8 sliders
- Added progress tracking state to PresetManager for sequential BLE operations
- Added Snackbar components to MotorControl, LEDControl, and StatusMonitor

### User Impact
- **Significantly faster** slider interactions with no lag during dragging
- **Clear visual feedback** for all preset operations (no more wondering if action succeeded)
- **Professional UI** with consistent Material-UI dialogs instead of browser alerts
- **Better mobile experience** with non-blocking notifications

## [2.0.0] - 2025-11-14

### Changed - BREAKING
- **CRITICAL**: Updated BLE Configuration Service UUIDs to avoid Nordic UART Service collision (AD032 Phase 1b update)
- Service UUID changed from `6E400002-B5A3-...` to `4BCAE9BE-9829-4F0A-9E88-267DE5E70200`
- All 12 characteristic UUIDs updated to use new project-specific base UUID
- **Requires firmware v0.1.2+** (pre-release) with matching UUID scheme

### Added
- Updated local architecture documentation cache (AD035: Battery-Based Initial Role Assignment)
- Comprehensive UUID scheme documentation in code comments

### Migration Notes
- This version **only works** with firmware implementing the new UUID scheme (v0.1.2+ pre-release)
- Devices with older firmware (using 6E400002-... UUIDs) will not be discoverable
- For older firmware, use PWA v1.5.1 or earlier

### Firmware Compatibility
- PWA v2.0.0 ↔ Firmware v0.1.2+ (new project-specific UUIDs: 4BCAE9BE-...)
- PWA v1.5.1 ↔ Firmware v0.1.0-v0.1.1 (old Nordic UART UUIDs: 6E400002-...)

## [1.5.1] - 2025-01-14

### Fixed
- Disabled LED control UI when not in Custom motor mode to prevent user confusion
- LED controls now properly reflect that they only work in Custom mode per device firmware

## [1.5.0] - 2025-01-13

### Fixed
- **Critical**: Fixed color palette mismatch between PWA and device firmware (AD032 compliance)
- LED palette colors now correctly match the device's actual color output

### Changed
- Updated PWA to fully comply with AD032 specification changes
- Added local caching of architecture documentation (`docs/external/`)
- Added `fetch-docs` npm script to update local AD032 documentation

### Added
- CLAUDE.md guide for AI assistant development workflow
- Enhanced README with prominent AD032 architecture links

## [1.4.3] - 2025-01-12

### Added
- Hybrid session timer: local counting with periodic device synchronization
- Improved timer accuracy and responsiveness

### Changed
- Reduced BLE traffic by using local timer with periodic sync instead of continuous notifications

## [1.4.2] - 2025-01-11

### Added
- Configuration change listener system for better UI synchronization
- Real-time UI updates when presets are loaded

### Fixed
- Settings icon now conditionally shown (only when disconnected)
- Preset loading now properly refreshes all UI components

## [1.4.1] - 2025-01-10

### Added
- Motor MODE characteristic notifications for device button synchronization
- UI now updates automatically when device buttons change motor mode

### Fixed
- PWA disconnect issues and UI spacing problems
- Improved connection stability on mobile devices

## [1.4.0] - 2025-01-09

### Added
- **Device Preset Management**: Save and load complete device configurations
  - Save current settings as named presets (stored in browser localStorage)
  - Load presets to quickly restore configurations
  - Import/export presets as JSON files for backup and sharing
  - 3 default presets included: Standard, Gentle, and Intense
  - Full validation of preset data before import/load
- Preset Manager UI component with intuitive controls

### Changed
- Made frequency slider logarithmic with 0.5Hz mark for better precision
- Fixed duty cycle parameter bounds to 0-50% (AD032 compliance)

## [1.3.2] - 2025-01-08

### Fixed
- Corrected motor duty cycle range documentation from 10-90% to 0-50%
- Updated README to reflect actual AD032 specification

## [1.3.1] - 2025-01-07

### Fixed
- Improved Android BLE disconnect timing
- Activating BLE connection before disconnect for better cleanup

## [1.3.0] - 2025-01-06

### Fixed
- **Android BLE disconnect issues** with proper cleanup sequence
- Resolved connection stability problems on Android devices
- Improved BLE resource management and cleanup

## [1.2.2] - 2025-01-05

### Fixed
- Session progress calculation now responds correctly to duration changes
- Progress bar updates immediately when session duration is modified

## [1.2.1] - 2025-01-04

### Fixed
- Mobile PWA layout: moved device name inline with version number
- Improved mobile UI spacing and responsiveness

## [1.2.0] - 2025-01-03

### Added
- Periodic polling for battery level and session time (10-second interval)
- Version number display in PWA header

### Fixed
- Session timer bug causing incorrect time display
- Improved mobile UX with better slider scrolling

### Changed
- Optimized BLE traffic by replacing continuous notifications with periodic polling
- Reduced battery drain on both device and phone

## [1.1.0] - 2025-01-02

### Added
- Advanced BLE scanning options with device name prefix filtering
- "Show All BLE Devices" testing mode for debugging
- GitHub Pages deployment with automatic CI/CD
- Comprehensive Android deployment documentation

### Fixed
- Device discovery issues with service UUID filtering
- LED state synchronization between device and PWA
- nRF Connect interference (added disconnection tip to troubleshooting)

## [1.0.0] - 2025-01-01

### Added
- Initial release of MLEHaptics PWA
- Complete BLE Configuration Service implementation (AD032 compliant)
- Motor control with 5 preset modes and custom frequency/duty cycle
- LED control with palette mode (16 colors) and custom RGB mode
- Session duration configuration (20-90 minutes)
- Real-time session timer and battery monitoring
- Progressive Web App with offline support and installability
- Material-UI based responsive interface
- Secure HTTPS development server (required for Web Bluetooth)
- BLE service abstraction layer for clean architecture
- Comprehensive README documentation

### Technical Details
- React 18 with TypeScript
- Web Bluetooth API integration
- Vite build system with PWA plugin
- Service workers for offline functionality
- BLE Configuration Service UUID: `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- 12 BLE characteristics for motor, LED, and session control

[unreleased]: https://github.com/lemonforest/mlehaptics-pwa/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/lemonforest/mlehaptics-pwa/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.5.1...v2.0.0
[1.5.1]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.4.3...v1.5.0
[1.4.3]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.4.2...v1.4.3
[1.4.2]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/lemonforest/mlehaptics-pwa/releases/tag/v1.0.0
