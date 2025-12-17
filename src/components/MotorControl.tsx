import { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Box,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import { MotorMode, MOTOR_MODE_LABELS, bleConfigService } from '../services/ble-config.service';
import { useDebouncedBLESend } from '../hooks/useDebouncedBLESend';
import { usePWASettings } from '../contexts/PWASettingsContext';
import { CollapsibleCard } from './CollapsibleCard';

interface MotorControlProps {
  connected: boolean;
  onModeChange?: (mode: MotorMode) => void;
  onLedOnlyModeChange?: (ledOnly: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

// Mode intensity range configuration
const MODE_INTENSITY_RANGES: Record<MotorMode, { min: number; max: number }> = {
  [MotorMode.MODE_05HZ_25]: { min: 50, max: 80 },
  [MotorMode.MODE_1HZ_25]: { min: 50, max: 80 },
  [MotorMode.MODE_15HZ_25]: { min: 70, max: 90 },
  [MotorMode.MODE_2HZ_25]: { min: 70, max: 90 },
  [MotorMode.MODE_CUSTOM]: { min: 30, max: 80 },
};

// Generic logarithmic scale helpers for percentage-based sliders
const createLogScaleHelpers = (minVal: number, maxVal: number) => {
  const minLog = Math.log2(minVal);
  const maxLog = Math.log2(maxVal);

  return {
    valueToSlider: (val: number): number => {
      // Clamp value to valid range
      const clamped = Math.max(minVal, Math.min(maxVal, val));
      return ((Math.log2(clamped) - minLog) / (maxLog - minLog)) * 100;
    },
    sliderToValue: (sliderVal: number): number => {
      const val = Math.pow(2, minLog + (sliderVal / 100) * (maxLog - minLog));
      return Math.round(val);
    },
  };
};

// Pre-computed log scale helpers for frequency (25-200)
const freqLogScale = createLogScaleHelpers(25, 200);

// Pre-computed log scale helpers for duty cycle (10-100)
const dutyLogScale = createLogScaleHelpers(10, 100);

export const MotorControl: React.FC<MotorControlProps> = ({ connected, onModeChange, onLedOnlyModeChange, expanded, onToggleExpanded }) => {
  const { settings } = usePWASettings();
  const compactMode = settings.ui.compactMode;

  const [mode, setMode] = useState<MotorMode>(MotorMode.MODE_05HZ_25);
  const [customFrequency, setCustomFrequency] = useState(100); // 1.00 Hz
  const [customDutyCycle, setCustomDutyCycle] = useState(50);
  // Per-mode intensity state
  const [modeIntensities, setModeIntensities] = useState<Record<MotorMode, number>>({
    [MotorMode.MODE_05HZ_25]: 65,
    [MotorMode.MODE_1HZ_25]: 65,
    [MotorMode.MODE_15HZ_25]: 80,
    [MotorMode.MODE_2HZ_25]: 80,
    [MotorMode.MODE_CUSTOM]: 55,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // LED-only mode state (Mode 4 only: 0% intensity = motors off, LED only)
  const [ledOnlyMode, setLedOnlyMode] = useState(false);
  // Saved intensity for restoring when exiting LED-only mode (default 55% if unknown)
  const [savedMode4Intensity, setSavedMode4Intensity] = useState(55);

  // Notify parent when ledOnlyMode changes
  useEffect(() => {
    onLedOnlyModeChange?.(ledOnlyMode);
  }, [ledOnlyMode, onLedOnlyModeChange]);

  // Get current mode's intensity range and log scale helpers
  const currentIntensityRange = MODE_INTENSITY_RANGES[mode];
  const intensityLogScale = useMemo(
    () => createLogScaleHelpers(currentIntensityRange.min, currentIntensityRange.max),
    [currentIntensityRange.min, currentIntensityRange.max]
  );

  // Current mode's intensity value
  const currentIntensity = modeIntensities[mode];

  // Debounced BLE sends for sliders (pause-to-send functionality)
  const frequencyDebounce = useDebouncedBLESend(
    customFrequency,
    async (freq) => {
      if (connected) {
        await bleConfigService.setCustomFrequency(freq);
      }
    }
  );

  const dutyCycleDebounce = useDebouncedBLESend(
    customDutyCycle,
    async (duty) => {
      if (connected) {
        await bleConfigService.setCustomDutyCycle(duty);
      }
    }
  );

  const intensityDebounce = useDebouncedBLESend(
    currentIntensity,
    async (intensity) => {
      if (connected) {
        await bleConfigService.setModeIntensity(mode, intensity);
      }
    }
  );

  useEffect(() => {
    if (connected) {
      loadConfig();

      // Subscribe to MODE notifications to detect changes from device button
      const unsubscribeMode = bleConfigService.subscribe('MODE', (newMode: MotorMode) => {
        console.log('MODE changed on device:', newMode);
        setMode(newMode);
        onModeChange?.(newMode);
      });

      // Subscribe to config changes (e.g., when presets are loaded)
      const unsubscribeConfig = bleConfigService.onConfigChange((config) => {
        console.log('Config changed, updating motor control:', config);
        setMode(config.mode);
        setCustomFrequency(config.customFrequency);
        setCustomDutyCycle(config.customDutyCycle);

        // Detect LED-only mode for Mode 4 (intensity = 0)
        const isLedOnly = config.mode4Intensity === 0;
        setLedOnlyMode(isLedOnly);

        // Save intensity for LED-only toggle restoration
        if (!isLedOnly && config.mode4Intensity >= 30) {
          setSavedMode4Intensity(config.mode4Intensity);
        }

        setModeIntensities({
          [MotorMode.MODE_05HZ_25]: config.mode0Intensity,
          [MotorMode.MODE_1HZ_25]: config.mode1Intensity,
          [MotorMode.MODE_15HZ_25]: config.mode2Intensity,
          [MotorMode.MODE_2HZ_25]: config.mode3Intensity,
          // For Mode 4, if LED-only (0%), show saved intensity in UI
          [MotorMode.MODE_CUSTOM]: isLedOnly ? savedMode4Intensity : config.mode4Intensity,
        });
        onModeChange?.(config.mode);
      });

      // Cleanup subscriptions on disconnect
      return () => {
        unsubscribeMode();
        unsubscribeConfig();
      };
    }
  }, [connected]);

  const loadConfig = async () => {
    try {
      // First try to get cached config (already read during connection)
      let config = bleConfigService.getCachedConfig();

      if (!config) {
        // Fallback: read from device if cache is empty
        console.log('Cache miss, reading motor config from device...');
        config = await bleConfigService.readConfig();
      } else {
        console.log('Using cached motor config');
      }

      setMode(config.mode);
      setCustomFrequency(config.customFrequency);
      setCustomDutyCycle(config.customDutyCycle);

      // Detect LED-only mode for Mode 4 (intensity = 0)
      const isLedOnly = config.mode4Intensity === 0;
      setLedOnlyMode(isLedOnly);

      // If in LED-only mode, use default intensity for the slider display
      // Otherwise, save the current intensity for potential LED-only toggle
      if (isLedOnly) {
        // Device was in LED-only mode; keep saved intensity at default
        setSavedMode4Intensity(55);
      } else if (config.mode4Intensity >= 30) {
        // Save the current valid intensity
        setSavedMode4Intensity(config.mode4Intensity);
      }

      setModeIntensities({
        [MotorMode.MODE_05HZ_25]: config.mode0Intensity,
        [MotorMode.MODE_1HZ_25]: config.mode1Intensity,
        [MotorMode.MODE_15HZ_25]: config.mode2Intensity,
        [MotorMode.MODE_2HZ_25]: config.mode3Intensity,
        // For Mode 4, if LED-only (0%), show saved intensity in UI
        [MotorMode.MODE_CUSTOM]: isLedOnly ? 55 : config.mode4Intensity,
      });
      onModeChange?.(config.mode);
    } catch (error) {
      console.error('Failed to load motor config:', error);
      setSnackbar({ open: true, message: 'Warning: Failed to read motor configuration from device.' });
    }
  };

  const handleModeChange = async (newMode: MotorMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
    if (connected) {
      try {
        await bleConfigService.setMotorMode(newMode);
      } catch (error) {
        console.error('Failed to set motor mode:', error);
      }
    }
  };

  // Handle LED-only mode toggle (Mode 4 only)
  const handleLedOnlyToggle = async (enabled: boolean) => {
    setLedOnlyMode(enabled);

    if (connected) {
      try {
        if (enabled) {
          // Save current intensity before switching to LED-only
          const currentIntensity = modeIntensities[MotorMode.MODE_CUSTOM];
          if (currentIntensity >= 30) {
            setSavedMode4Intensity(currentIntensity);
          }
          // Set intensity to 0 (LED-only mode)
          await bleConfigService.setModeIntensity(MotorMode.MODE_CUSTOM, 0);
        } else {
          // Restore previous intensity (or default 55%)
          const restoreIntensity = savedMode4Intensity >= 30 ? savedMode4Intensity : 55;
          setModeIntensities(prev => ({ ...prev, [MotorMode.MODE_CUSTOM]: restoreIntensity }));
          await bleConfigService.setModeIntensity(MotorMode.MODE_CUSTOM, restoreIntensity);
        }
      } catch (error) {
        console.error('Failed to toggle LED-only mode:', error);
        // Revert the toggle on error
        setLedOnlyMode(!enabled);
      }
    }
  };

  // Frequency handlers (logarithmic)
  const handleFrequencyChange = (_: Event, value: number | number[]) => {
    const sliderValue = value as number;
    const freq = freqLogScale.sliderToValue(sliderValue);
    setCustomFrequency(freq);
  };

  const handleFrequencyCommitted = async (_: Event | React.SyntheticEvent, value: number | number[]) => {
    frequencyDebounce.onInteractionEnd();
    const sliderValue = value as number;
    const freq = freqLogScale.sliderToValue(sliderValue);
    if (connected) {
      try {
        await bleConfigService.setCustomFrequency(freq);
      } catch (error) {
        console.error('Failed to set frequency:', error);
      }
    }
  };

  // Duty cycle handlers (logarithmic)
  const handleDutyCycleChange = (_: Event, value: number | number[]) => {
    const sliderValue = value as number;
    const duty = dutyLogScale.sliderToValue(sliderValue);
    setCustomDutyCycle(duty);
  };

  const handleDutyCycleCommitted = async (_: Event | React.SyntheticEvent, value: number | number[]) => {
    dutyCycleDebounce.onInteractionEnd();
    const sliderValue = value as number;
    const duty = dutyLogScale.sliderToValue(sliderValue);
    if (connected) {
      try {
        await bleConfigService.setCustomDutyCycle(duty);
      } catch (error) {
        console.error('Failed to set duty cycle:', error);
      }
    }
  };

  // Intensity handlers (logarithmic, mode-specific)
  const handleIntensityChange = (_: Event, value: number | number[]) => {
    const sliderValue = value as number;
    const intensity = intensityLogScale.sliderToValue(sliderValue);
    setModeIntensities(prev => ({ ...prev, [mode]: intensity }));

    // For Mode 4, save intensity for LED-only toggle restoration
    if (mode === MotorMode.MODE_CUSTOM && intensity >= 30) {
      setSavedMode4Intensity(intensity);
    }
  };

  const handleIntensityCommitted = async (_: Event | React.SyntheticEvent, value: number | number[]) => {
    intensityDebounce.onInteractionEnd();
    const sliderValue = value as number;
    const intensity = intensityLogScale.sliderToValue(sliderValue);
    if (connected) {
      try {
        await bleConfigService.setModeIntensity(mode, intensity);
      } catch (error) {
        console.error('Failed to set intensity:', error);
      }
    }
  };

  // Generate marks for intensity slider based on current mode's range
  const intensityMarks = useMemo(() => {
    const { min, max } = currentIntensityRange;
    const mid = Math.round((min + max) / 2);
    return [
      { value: intensityLogScale.valueToSlider(min), label: `${min}%` },
      { value: intensityLogScale.valueToSlider(mid), label: `${mid}%` },
      { value: intensityLogScale.valueToSlider(max), label: `${max}%` },
    ];
  }, [currentIntensityRange, intensityLogScale]);

  // Summary view for collapsed state
  const summaryView = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <Chip label={MOTOR_MODE_LABELS[mode]} size="small" color="primary" variant="outlined" />
      <Chip
        label={ledOnlyMode && mode === MotorMode.MODE_CUSTOM ? 'LED Only' : `${currentIntensity}%`}
        size="small"
        color={ledOnlyMode && mode === MotorMode.MODE_CUSTOM ? 'secondary' : 'default'}
      />
      {mode === MotorMode.MODE_CUSTOM && (
        <>
          <Chip label={`${(customFrequency / 100).toFixed(2)} Hz`} size="small" variant="outlined" />
          <Chip label={`${customDutyCycle}% duty`} size="small" variant="outlined" />
        </>
      )}
    </Box>
  );

  return (
    <CollapsibleCard
      title="Motor Control"
      expanded={expanded}
      onToggle={onToggleExpanded}
      summary={summaryView}
      compactMode={compactMode}
    >
      <Grid container spacing={compactMode ? 2 : 3}>
          <Grid item xs={12}>
            <FormControl fullWidth disabled={!connected}>
              <InputLabel>Mode</InputLabel>
              <Select
                value={mode}
                label="Mode"
                onChange={(e) => handleModeChange(e.target.value as MotorMode)}
              >
                {Object.entries(MOTOR_MODE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={Number(value)}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {mode === MotorMode.MODE_CUSTOM && (
            <>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  Custom Frequency: {(customFrequency / 100).toFixed(2)} Hz
                </Typography>
                <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
                  <Slider
                    value={freqLogScale.valueToSlider(customFrequency)}
                    onChange={handleFrequencyChange}
                    onChangeCommitted={handleFrequencyCommitted}
                    onMouseDown={frequencyDebounce.onInteractionStart}
                    onTouchStart={frequencyDebounce.onInteractionStart}
                    min={0}
                    max={100}
                    step={0.1}
                    marks={[
                      { value: freqLogScale.valueToSlider(25), label: '0.25 Hz' },
                      { value: freqLogScale.valueToSlider(50), label: '0.5 Hz' },
                      { value: freqLogScale.valueToSlider(100), label: '1.0 Hz' },
                      { value: freqLogScale.valueToSlider(200), label: '2.0 Hz' },
                    ]}
                    disabled={!connected}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${(freqLogScale.sliderToValue(value) / 100).toFixed(2)} Hz`}
                    sx={{ touchAction: 'none' }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Custom Duty Cycle: {customDutyCycle}%
                </Typography>
                <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
                  <Slider
                    value={dutyLogScale.valueToSlider(customDutyCycle)}
                    onChange={handleDutyCycleChange}
                    onChangeCommitted={handleDutyCycleCommitted}
                    onMouseDown={dutyCycleDebounce.onInteractionStart}
                    onTouchStart={dutyCycleDebounce.onInteractionStart}
                    min={0}
                    max={100}
                    step={0.1}
                    marks={[
                      { value: dutyLogScale.valueToSlider(10), label: '10%' },
                      { value: dutyLogScale.valueToSlider(32), label: '32%' },
                      { value: dutyLogScale.valueToSlider(100), label: '100%' },
                    ]}
                    disabled={!connected}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${dutyLogScale.sliderToValue(value)}%`}
                    sx={{ touchAction: 'none' }}
                  />
                </Box>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography>
                Intensity: {ledOnlyMode && mode === MotorMode.MODE_CUSTOM ? '0%' : `${currentIntensity}%`}
              </Typography>
              {mode === MotorMode.MODE_CUSTOM && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={ledOnlyMode}
                      onChange={(e) => handleLedOnlyToggle(e.target.checked)}
                      disabled={!connected}
                      size="small"
                    />
                  }
                  label="LED Only"
                  labelPlacement="start"
                  sx={{ mr: 0 }}
                />
              )}
            </Box>
            <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
              <Slider
                value={intensityLogScale.valueToSlider(currentIntensity)}
                onChange={handleIntensityChange}
                onChangeCommitted={handleIntensityCommitted}
                onMouseDown={intensityDebounce.onInteractionStart}
                onTouchStart={intensityDebounce.onInteractionStart}
                min={0}
                max={100}
                step={0.1}
                marks={intensityMarks}
                disabled={!connected || (mode === MotorMode.MODE_CUSTOM && ledOnlyMode)}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${intensityLogScale.sliderToValue(value)}%`}
                sx={{ touchAction: 'none' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {mode === MotorMode.MODE_CUSTOM && ledOnlyMode
                ? 'Motors disabled - LED visual feedback only'
                : `Motor power for ${MOTOR_MODE_LABELS[mode]} mode (${currentIntensityRange.min}-${currentIntensityRange.max}%)`}
            </Typography>
          </Grid>
        </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="error" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </CollapsibleCard>
  );
};
