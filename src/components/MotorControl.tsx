import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
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
} from '@mui/material';
import { MotorMode, MOTOR_MODE_LABELS, bleConfigService } from '../services/ble-config.service';
import { useDebouncedBLESend } from '../hooks/useDebouncedBLESend';
import { usePWASettings } from '../contexts/PWASettingsContext';

interface MotorControlProps {
  connected: boolean;
  onModeChange?: (mode: MotorMode) => void;
}

export const MotorControl: React.FC<MotorControlProps> = ({ connected, onModeChange }) => {
  const { settings } = usePWASettings();
  const compactMode = settings.ui.compactMode;
  const showAdvancedControls = settings.ui.showAdvancedControls;

  const [mode, setMode] = useState<MotorMode>(MotorMode.MODE_1HZ_50);
  const [customFrequency, setCustomFrequency] = useState(100); // 1.00 Hz
  const [customDutyCycle, setCustomDutyCycle] = useState(50);
  const [pwmIntensity, setPWMIntensity] = useState(75);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

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

  const pwmIntensityDebounce = useDebouncedBLESend(
    pwmIntensity,
    async (intensity) => {
      if (connected) {
        await bleConfigService.setPWMIntensity(intensity);
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
        setPWMIntensity(config.pwmIntensity);
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
      setPWMIntensity(config.pwmIntensity);
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

  // Helper functions for logarithmic frequency scaling
  const freqToSliderValue = (freq: number): number => {
    // Map frequency (25-200) to slider position (0-100) logarithmically
    const minFreq = 25;  // 0.25 Hz × 100
    const maxFreq = 200; // 2.0 Hz × 100
    const minLog = Math.log2(minFreq);
    const maxLog = Math.log2(maxFreq);
    return ((Math.log2(freq) - minLog) / (maxLog - minLog)) * 100;
  };

  const sliderValueToFreq = (sliderValue: number): number => {
    // Map slider position (0-100) to frequency (25-200) logarithmically
    const minFreq = 25;  // 0.25 Hz × 100
    const maxFreq = 200; // 2.0 Hz × 100
    const minLog = Math.log2(minFreq);
    const maxLog = Math.log2(maxFreq);
    const freq = Math.pow(2, minLog + (sliderValue / 100) * (maxLog - minLog));
    return Math.round(freq);
  };

  // Update local state immediately for responsive UI
  const handleFrequencyChange = (_: Event, value: number | number[]) => {
    const sliderValue = value as number;
    const freq = sliderValueToFreq(sliderValue);
    setCustomFrequency(freq);
  };

  // Send to BLE only when user releases slider
  const handleFrequencyCommitted = async (_: Event | React.SyntheticEvent, value: number | number[]) => {
    frequencyDebounce.onInteractionEnd(); // Cancel debounced send
    const sliderValue = value as number;
    const freq = sliderValueToFreq(sliderValue);
    if (connected) {
      try {
        await bleConfigService.setCustomFrequency(freq);
      } catch (error) {
        console.error('Failed to set frequency:', error);
      }
    }
  };

  // Update local state immediately for responsive UI
  const handleDutyCycleChange = (_: Event, value: number | number[]) => {
    const duty = value as number;
    setCustomDutyCycle(duty);
  };

  // Send to BLE only when user releases slider
  const handleDutyCycleCommitted = async (_: Event | React.SyntheticEvent, value: number | number[]) => {
    dutyCycleDebounce.onInteractionEnd(); // Cancel debounced send
    const duty = value as number;
    if (connected) {
      try {
        await bleConfigService.setCustomDutyCycle(duty);
      } catch (error) {
        console.error('Failed to set duty cycle:', error);
      }
    }
  };

  // Update local state immediately for responsive UI
  const handlePWMIntensityChange = (_: Event, value: number | number[]) => {
    const intensity = value as number;
    setPWMIntensity(intensity);
  };

  // Send to BLE only when user releases slider
  const handlePWMIntensityCommitted = async (_: Event | React.SyntheticEvent, value: number | number[]) => {
    pwmIntensityDebounce.onInteractionEnd(); // Cancel debounced send
    const intensity = value as number;
    if (connected) {
      try {
        await bleConfigService.setPWMIntensity(intensity);
      } catch (error) {
        console.error('Failed to set PWM intensity:', error);
      }
    }
  };

  return (
    <Card>
      <CardContent sx={{ py: compactMode ? 1.5 : 2, '&:last-child': { pb: compactMode ? 2 : 3 } }}>
        <Typography variant="h6" gutterBottom>
          Motor Control
        </Typography>

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

          {mode === MotorMode.MODE_CUSTOM && showAdvancedControls && (
            <>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  Custom Frequency: {(customFrequency / 100).toFixed(2)} Hz
                </Typography>
                <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
                  <Slider
                    value={freqToSliderValue(customFrequency)}
                    onChange={handleFrequencyChange}
                    onChangeCommitted={handleFrequencyCommitted}
                    onMouseDown={frequencyDebounce.onInteractionStart}
                    onTouchStart={frequencyDebounce.onInteractionStart}
                    min={0}
                    max={100}
                    step={0.1}
                    marks={[
                      { value: freqToSliderValue(25), label: '0.25 Hz' },
                      { value: freqToSliderValue(50), label: '0.5 Hz' },
                      { value: freqToSliderValue(100), label: '1.0 Hz' },
                      { value: freqToSliderValue(200), label: '2.0 Hz' },
                    ]}
                    disabled={!connected}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${(sliderValueToFreq(value) / 100).toFixed(2)} Hz`}
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
                    value={customDutyCycle}
                    onChange={handleDutyCycleChange}
                    onChangeCommitted={handleDutyCycleCommitted}
                    onMouseDown={dutyCycleDebounce.onInteractionStart}
                    onTouchStart={dutyCycleDebounce.onInteractionStart}
                    min={10}
                    max={50}
                    step={1}
                    marks={[
                      { value: 10, label: '10%' },
                      { value: 25, label: '25%' },
                      { value: 50, label: '50%' },
                    ]}
                    disabled={!connected}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                    sx={{ touchAction: 'none' }}
                  />
                </Box>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Typography gutterBottom>
              PWM Intensity: {pwmIntensity}% {pwmIntensity === 0 && '(LED-only)'}
            </Typography>
            <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
              <Slider
                value={pwmIntensity}
                onChange={handlePWMIntensityChange}
                onChangeCommitted={handlePWMIntensityCommitted}
                onMouseDown={pwmIntensityDebounce.onInteractionStart}
                onTouchStart={pwmIntensityDebounce.onInteractionStart}
                min={0}
                max={80}
                step={1}
                marks={[
                  { value: 0, label: '0% (LED-only)' },
                  { value: 40, label: '40%' },
                  { value: 80, label: '80%' },
                ]}
                disabled={!connected}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{ touchAction: 'none' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Motor power (0% = LED-only mode, 1-80% = motor + LED)
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
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
    </Card>
  );
};
