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
} from '@mui/material';
import { COLOR_PALETTE, bleConfigService } from '../services/ble-config.service';

interface LEDControlProps {
  connected: boolean;
}

export const LEDControl: React.FC<LEDControlProps> = ({ connected }) => {
  const [ledEnable, setLEDEnable] = useState(false);
  const [colorMode, setColorMode] = useState(1); // 0=palette, 1=custom RGB
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [customRGB, setCustomRGB] = useState<[number, number, number]>([255, 0, 0]);
  const [brightness, setBrightness] = useState(20);

  useEffect(() => {
    if (connected) {
      loadConfig();
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
      alert('Warning: Failed to read LED state from device. The displayed state may not match the device.');
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

  const handleRGBChange = async (channel: 'r' | 'g' | 'b', value: number) => {
    const newRGB: [number, number, number] = [...customRGB];
    const index = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
    newRGB[index] = value;
    setCustomRGB(newRGB);

    if (connected) {
      try {
        await bleConfigService.setLEDCustomRGB(newRGB);
      } catch (error) {
        console.error('Failed to set custom RGB:', error);
      }
    }
  };

  const handleBrightnessChange = async (_: Event, value: number | number[]) => {
    const bright = value as number;
    setBrightness(bright);
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
      <CardContent>
        <Typography variant="h6" gutterBottom>
          LED Control
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={ledEnable}
                  onChange={handleLEDEnableChange}
                  disabled={!connected}
                />
              }
              label="LED Enable"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl component="fieldset" disabled={!connected || !ledEnable}>
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {COLOR_PALETTE.map((color, index) => (
                  <Button
                    key={index}
                    variant={paletteIndex === index ? 'contained' : 'outlined'}
                    onClick={() => handlePaletteSelect(index)}
                    disabled={!connected || !ledEnable}
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
                <Slider
                  value={customRGB[0]}
                  onChange={(_, value) => handleRGBChange('r', value as number)}
                  min={0}
                  max={255}
                  disabled={!connected || !ledEnable}
                  sx={{ color: '#f44336' }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>Green: {customRGB[1]}</Typography>
                <Slider
                  value={customRGB[1]}
                  onChange={(_, value) => handleRGBChange('g', value as number)}
                  min={0}
                  max={255}
                  disabled={!connected || !ledEnable}
                  sx={{ color: '#4caf50' }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>Blue: {customRGB[2]}</Typography>
                <Slider
                  value={customRGB[2]}
                  onChange={(_, value) => handleRGBChange('b', value as number)}
                  min={0}
                  max={255}
                  disabled={!connected || !ledEnable}
                  sx={{ color: '#2196f3' }}
                />
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
            <Slider
              value={brightness}
              onChange={handleBrightnessChange}
              min={10}
              max={30}
              step={1}
              marks={[
                { value: 10, label: '10%' },
                { value: 20, label: '20%' },
                { value: 30, label: '30%' },
              ]}
              disabled={!connected || !ledEnable}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
            />
            <Typography variant="caption" color="text.secondary">
              User comfort range (eye strain prevention)
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
