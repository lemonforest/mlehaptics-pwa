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
} from '@mui/material';
import { MotorMode, MOTOR_MODE_LABELS, bleConfigService } from '../services/ble-config.service';

interface MotorControlProps {
  connected: boolean;
}

export const MotorControl: React.FC<MotorControlProps> = ({ connected }) => {
  const [mode, setMode] = useState<MotorMode>(MotorMode.MODE_1HZ_50);
  const [customFrequency, setCustomFrequency] = useState(100); // 1.00 Hz
  const [customDutyCycle, setCustomDutyCycle] = useState(50);
  const [pwmIntensity, setPWMIntensity] = useState(75);

  useEffect(() => {
    if (connected) {
      loadConfig();

      // Subscribe to MODE notifications to detect changes from device button
      const unsubscribeMode = bleConfigService.subscribe('MODE', (newMode: MotorMode) => {
        console.log('MODE changed on device:', newMode);
        setMode(newMode);
      });

      // Subscribe to config changes (e.g., when presets are loaded)
      const unsubscribeConfig = bleConfigService.onConfigChange((config) => {
        console.log('Config changed, updating motor control:', config);
        setMode(config.mode);
        setCustomFrequency(config.customFrequency);
        setCustomDutyCycle(config.customDutyCycle);
        setPWMIntensity(config.pwmIntensity);
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
    } catch (error) {
      console.error('Failed to load motor config:', error);
      alert('Warning: Failed to read motor configuration from device.');
    }
  };

  const handleModeChange = async (newMode: MotorMode) => {
    setMode(newMode);
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

  const handleFrequencyChange = async (_: Event, value: number | number[]) => {
    const sliderValue = value as number;
    const freq = sliderValueToFreq(sliderValue);
    setCustomFrequency(freq);
    if (connected) {
      try {
        await bleConfigService.setCustomFrequency(freq);
      } catch (error) {
        console.error('Failed to set frequency:', error);
      }
    }
  };

  const handleDutyCycleChange = async (_: Event, value: number | number[]) => {
    const duty = value as number;
    setCustomDutyCycle(duty);
    if (connected) {
      try {
        await bleConfigService.setCustomDutyCycle(duty);
      } catch (error) {
        console.error('Failed to set duty cycle:', error);
      }
    }
  };

  const handlePWMIntensityChange = async (_: Event, value: number | number[]) => {
    const intensity = value as number;
    setPWMIntensity(intensity);
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
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Motor Control
        </Typography>

        <Grid container spacing={3}>
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
                <Box sx={{ px: 2, py: 3 }}>
                  <Slider
                    value={freqToSliderValue(customFrequency)}
                    onChange={handleFrequencyChange}
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
                <Box sx={{ px: 2, py: 3 }}>
                  <Slider
                    value={customDutyCycle}
                    onChange={handleDutyCycleChange}
                    min={0}
                    max={50}
                    step={1}
                    marks={[
                      { value: 0, label: '0%' },
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
              PWM Intensity: {pwmIntensity}%
            </Typography>
            <Box sx={{ px: 2, py: 3 }}>
              <Slider
                value={pwmIntensity}
                onChange={handlePWMIntensityChange}
                min={30}
                max={80}
                step={1}
                marks={[
                  { value: 30, label: '30%' },
                  { value: 55, label: '55%' },
                  { value: 80, label: '80%' },
                ]}
                disabled={!connected}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{ touchAction: 'none' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Motor power safety limits (30-80%)
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
