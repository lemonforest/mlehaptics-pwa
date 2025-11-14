# Changelog

All notable changes to the MLEHaptics PWA project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[unreleased]: https://github.com/lemonforest/mlehaptics-pwa/compare/v1.5.1...HEAD
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
