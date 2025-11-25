import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  Slider,
  Box,
  Grid,
  Button,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import { COLOR_PALETTE, bleConfigService, MotorMode, MOTOR_MODE_LABELS } from '../services/ble-config.service';
import { useDebouncedBLESend } from '../hooks/useDebouncedBLESend';
import { usePWASettings } from '../contexts/PWASettingsContext';

interface LEDControlProps {
  connected: boolean;
  motorMode: MotorMode;
}

export const LEDControl: React.FC<LEDControlProps> = ({ connected, motorMode }) => {
  const { settings } = usePWASettings();
  const compactMode = settings.ui.compactMode;

  const [ledEnable, setLEDEnable] = useState(false);
  const [colorMode, setColorMode] = useState(1); // 0=palette, 1=custom RGB
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [customRGB, setCustomRGB] = useState<[number, number, number]>([255, 0, 0]);
  const [brightness, setBrightness] = useState(20);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // LED settings are only configurable in Custom mode
  const isCustomMode = motorMode === MotorMode.MODE_CUSTOM;

  // Debounced BLE sends for sliders (pause-to-send functionality)
  const rgbDebounce = useDebouncedBLESend(
    customRGB,
    async (rgb) => {
      if (connected) {
        await bleConfigService.setLEDCustomRGB(rgb);
      }
    }
  );

  const brightnessDebounce = useDebouncedBLESend(
    brightness,
    async (bright) => {
      if (connected) {
        await bleConfigService.setLEDBrightness(bright);
      }
    }
  );

  useEffect(() => {
    if (connected) {
      loadConfig();

      // Subscribe to config changes (e.g., when presets are loaded)
      const unsubscribeConfig = bleConfigService.onConfigChange((config) => {
        console.log('Config changed, updating LED control:', config);
        setLEDEnable(config.ledEnable);
        setColorMode(config.ledColorMode);
        setPaletteIndex(config.ledPaletteIndex);
        setCustomRGB(config.ledCustomRGB);
        setBrightness(config.ledBrightness);
      });

      // Cleanup subscription on disconnect
      return () => {
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
        console.log('Cache miss, reading LED config from device...');
        config = await bleConfigService.readConfig();
      } else {
        console.log('Using cached LED config:', {
          ledEnable: config.ledEnable,
          ledColorMode: config.ledColorMode,
          ledPaletteIndex: config.ledPaletteIndex,
          ledBrightness: config.ledBrightness,
        });
      }

      setLEDEnable(config.ledEnable);
      setColorMode(config.ledColorMode);
      setPaletteIndex(config.ledPaletteIndex);
      setCustomRGB(config.ledCustomRGB);
      setBrightness(config.ledBrightness);
    } catch (error) {
      console.error('Failed to load LED config:', error);
      // Show error to user instead of silently failing
      setSnackbar({ open: true, message: 'Warning: Failed to read LED state from device. The displayed state may not match the device.' });
    }
  };

  const handleLEDEnableChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const enable = event.target.checked;
    setLEDEnable(enable);
    if (connected) {
      try {
        await bleConfigService.setLEDEnable(enable);
      } catch (error) {
        console.error('Failed to set LED enable:', error);
      }
    }
  };

  const handleColorModeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const mode = Number(event.target.value);
    setColorMode(mode);
    if (connected) {
      try {
        await bleConfigService.setLEDColorMode(mode);
      } catch (error) {
        console.error('Failed to set color mode:', error);
      }
    }
  };

  const handlePaletteSelect = async (index: number) => {
    setPaletteIndex(index);
    if (connected) {
      try {
        await bleConfigService.setLEDPaletteIndex(index);
      } catch (error) {
        console.error('Failed to set palette index:', error);
      }
    }
  };

  // Update local state immediately for responsive UI
  const handleRGBChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const newRGB: [number, number, number] = [...customRGB];
    const index = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
    newRGB[index] = value;
    setCustomRGB(newRGB);
  };

  // Send to BLE only when user releases slider
  const handleRGBCommitted = async (channel: 'r' | 'g' | 'b', value: number) => {
    rgbDebounce.onInteractionEnd(); // Cancel debounced send
    const newRGB: [number, number, number] = [...customRGB];
    const index = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
    newRGB[index] = value;

    if (connected) {
      try {
        await bleConfigService.setLEDCustomRGB(newRGB);
      } catch (error) {
        console.error('Failed to set custom RGB:', error);
      }
    }
  };

  // Update local state immediately for responsive UI
  const handleBrightnessChange = (_: Event, value: number | number[]) => {
    const bright = value as number;
    setBrightness(bright);
  };

  // Send to BLE only when user releases slider
  const handleBrightnessCommitted = async (_: Event | React.SyntheticEvent, value: number | number[]) => {
    brightnessDebounce.onInteractionEnd(); // Cancel debounced send
    const bright = value as number;
    if (connected) {
      try {
        await bleConfigService.setLEDBrightness(bright);
      } catch (error) {
        console.error('Failed to set brightness:', error);
      }
    }
  };

  const rgbToHex = (rgb: [number, number, number]): string => {
    return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
  };

  const currentColor = colorMode === 0 ? COLOR_PALETTE[paletteIndex].rgb : customRGB;

  return (
    <Card>
      <CardContent sx={{ py: compactMode ? 1.5 : 2, '&:last-child': { pb: compactMode ? 2 : 3 } }}>
        <Typography variant="h6" gutterBottom>
          LED Control
        </Typography>

        {!isCustomMode && (
          <Alert severity="info" sx={{ mb: compactMode ? 1 : 2 }}>
            LED settings are only available in Custom motor mode. Currently in: <strong>{MOTOR_MODE_LABELS[motorMode]}</strong>
          </Alert>
        )}

        <Grid container spacing={compactMode ? 2 : 3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={ledEnable}
                  onChange={handleLEDEnableChange}
                  disabled={!connected || !isCustomMode}
                />
              }
              label="LED Enable"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl component="fieldset" disabled={!connected || !isCustomMode || !ledEnable}>
              <Typography gutterBottom>Color Mode</Typography>
              <RadioGroup value={colorMode} onChange={handleColorModeChange} row>
                <FormControlLabel value={0} control={<Radio />} label="Palette" />
                <FormControlLabel value={1} control={<Radio />} label="Custom RGB" />
              </RadioGroup>
            </FormControl>
          </Grid>

          {colorMode === 0 ? (
            <Grid item xs={12}>
              <Typography gutterBottom>Palette Colors</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 2 }}>
                {COLOR_PALETTE.map((color, index) => (
                  <Button
                    key={index}
                    variant={paletteIndex === index ? 'contained' : 'outlined'}
                    onClick={() => handlePaletteSelect(index)}
                    disabled={!connected || !isCustomMode || !ledEnable}
                    sx={{
                      minWidth: 80,
                      bgcolor: paletteIndex === index ? rgbToHex(color.rgb as [number, number, number]) : 'transparent',
                      borderColor: rgbToHex(color.rgb as [number, number, number]),
                      color: paletteIndex === index ? '#fff' : 'inherit',
                      '&:hover': {
                        bgcolor: rgbToHex(color.rgb as [number, number, number]),
                        opacity: 0.8,
                      },
                    }}
                  >
                    {color.name}
                  </Button>
                ))}
              </Box>
            </Grid>
          ) : (
            <>
              <Grid item xs={12}>
                <Typography gutterBottom>Red: {customRGB[0]}</Typography>
                <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
                  <Slider
                    value={customRGB[0]}
                    onChange={(_, value) => handleRGBChange('r', value as number)}
                    onChangeCommitted={(_, value) => handleRGBCommitted('r', value as number)}
                    onMouseDown={rgbDebounce.onInteractionStart}
                    onTouchStart={rgbDebounce.onInteractionStart}
                    min={0}
                    max={255}
                    disabled={!connected || !isCustomMode || !ledEnable}
                    sx={{ color: '#f44336', touchAction: 'none' }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>Green: {customRGB[1]}</Typography>
                <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
                  <Slider
                    value={customRGB[1]}
                    onChange={(_, value) => handleRGBChange('g', value as number)}
                    onChangeCommitted={(_, value) => handleRGBCommitted('g', value as number)}
                    onMouseDown={rgbDebounce.onInteractionStart}
                    onTouchStart={rgbDebounce.onInteractionStart}
                    min={0}
                    max={255}
                    disabled={!connected || !isCustomMode || !ledEnable}
                    sx={{ color: '#4caf50', touchAction: 'none' }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>Blue: {customRGB[2]}</Typography>
                <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
                  <Slider
                    value={customRGB[2]}
                    onChange={(_, value) => handleRGBChange('b', value as number)}
                    onChangeCommitted={(_, value) => handleRGBCommitted('b', value as number)}
                    onMouseDown={rgbDebounce.onInteractionStart}
                    onTouchStart={rgbDebounce.onInteractionStart}
                    min={0}
                    max={255}
                    disabled={!connected || !isCustomMode || !ledEnable}
                    sx={{ color: '#2196f3', touchAction: 'none' }}
                  />
                </Box>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography>Current Color:</Typography>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 1,
                  bgcolor: rgbToHex(currentColor as [number, number, number]),
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Chip
                label={`RGB(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]})`}
                size="small"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography gutterBottom>
              Brightness: {brightness}%
            </Typography>
            <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
              <Slider
                value={brightness}
                onChange={handleBrightnessChange}
                onChangeCommitted={handleBrightnessCommitted}
                onMouseDown={brightnessDebounce.onInteractionStart}
                onTouchStart={brightnessDebounce.onInteractionStart}
                min={10}
                max={30}
                step={1}
                marks={[
                  { value: 10, label: '10%' },
                  { value: 20, label: '20%' },
                  { value: 30, label: '30%' },
                ]}
                disabled={!connected}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{ touchAction: 'none' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Universal LED brightness (all modes)
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
