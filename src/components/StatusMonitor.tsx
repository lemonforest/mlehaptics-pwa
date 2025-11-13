import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Slider,
  Box,
  Grid,
  LinearProgress,
  Chip,
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import Battery80Icon from '@mui/icons-material/Battery80';
import Battery50Icon from '@mui/icons-material/Battery50';
import Battery20Icon from '@mui/icons-material/Battery20';
import TimerIcon from '@mui/icons-material/Timer';
import { bleConfigService } from '../services/ble-config.service';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useBatteryLevel } from '../hooks/useBatteryLevel';

interface StatusMonitorProps {
  connected: boolean;
}

export const StatusMonitor: React.FC<StatusMonitorProps> = ({ connected }) => {
  const [sessionDuration, setSessionDuration] = useState(1200); // 20 min default

  // Initialize with default values
  const [initialSessionTime, setInitialSessionTime] = useState(0);
  const [initialBatteryLevel, setInitialBatteryLevel] = useState(100);

  // Subscribe function for session timer notifications
  const subscribeSessionTime = useCallback((callback: (time: number) => void) => {
    if (!connected) return () => {};
    return bleConfigService.subscribe('SESSION_TIME', callback);
  }, [connected]);

  // Subscribe function for battery level notifications
  const subscribeBatteryLevel = useCallback((callback: (level: number) => void) => {
    if (!connected) return () => {};
    return bleConfigService.subscribe('BATTERY_LEVEL', callback);
  }, [connected]);

  // Use custom hooks with BLE notifications
  const sessionTimer = useSessionTimer({
    initialTime: initialSessionTime,
    duration: sessionDuration,
    onSubscribe: subscribeSessionTime,
    autoStart: false, // Will start manually after loading config
  });

  const battery = useBatteryLevel({
    initialLevel: initialBatteryLevel,
    onSubscribe: subscribeBatteryLevel,
    autoStart: false, // Will start manually after loading config
  });

  // Load initial config when connected
  useEffect(() => {
    if (connected) {
      loadInitialConfig();
    }
  }, [connected]);

  const loadInitialConfig = async () => {
    try {
      // First try to get cached config (already read during connection)
      let config = bleConfigService.getCachedConfig();

      if (!config) {
        // Fallback: read from device if cache is empty
        console.log('Cache miss, reading status config from device...');
        config = await bleConfigService.readConfig();
      } else {
        console.log('Using cached status config');
      }

      setSessionDuration(config.sessionDuration);
      setInitialSessionTime(config.sessionTime);
      setInitialBatteryLevel(config.batteryLevel);

      // Set initial values in hooks
      sessionTimer.setTime(config.sessionTime);
      battery.setBatteryLevel(config.batteryLevel);

      console.log('✅ BLE notify mode active:');
      console.log('  - Session time: real-time notifications');
      console.log('  - Battery level: real-time notifications');
    } catch (error) {
      console.error('Failed to load status config:', error);
      alert('Warning: Failed to read device status.');
    }
  };

  const handleDurationChange = async (_: Event, value: number | number[]) => {
    const duration = value as number;
    setSessionDuration(duration);
    if (connected) {
      try {
        await bleConfigService.setSessionDuration(duration);
      } catch (error) {
        console.error('Failed to set session duration:', error);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBatteryIcon = () => {
    if (battery.batteryLevel > 75) return <BatteryFullIcon />;
    if (battery.batteryLevel > 50) return <Battery80Icon />;
    if (battery.batteryLevel > 25) return <Battery50Icon />;
    return <Battery20Icon />;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Status & Monitoring
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography gutterBottom>
              Session Duration: {formatTime(sessionDuration)} ({sessionDuration / 60} minutes)
            </Typography>
            <Box sx={{ px: 2, py: 3 }}>
              <Slider
                value={sessionDuration}
                onChange={handleDurationChange}
                min={1200}
                max={5400}
                step={60}
                marks={[
                  { value: 1200, label: '20 min' },
                  { value: 2700, label: '45 min' },
                  { value: 3600, label: '60 min' },
                  { value: 5400, label: '90 min' },
                ]}
                disabled={!connected}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value / 60} min`}
                sx={{ touchAction: 'none' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Target session length (20-90 minutes)
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimerIcon />
                <Typography>Session Progress</Typography>
              </Box>
              <Chip
                label={`${formatTime(sessionTimer.sessionTime)} / ${formatTime(sessionDuration)}`}
                size="small"
                color={sessionTimer.progress >= 100 ? 'success' : 'default'}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(sessionTimer.progress, 100)}
              sx={{ height: 10, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {sessionTimer.progress >= 100 ? 'Session complete!' : `${Math.round(sessionTimer.progress)}% complete`}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getBatteryIcon()}
                <Typography>Battery Level</Typography>
              </Box>
              <Chip
                label={`${battery.batteryLevel}%`}
                size="small"
                color={battery.color}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={battery.batteryLevel}
              color={battery.color}
              sx={{ height: 10, borderRadius: 1 }}
            />
            {battery.isLow && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                Low battery! Please charge the device.
              </Typography>
            )}
          </Grid>

          {!connected && (
            <Grid item xs={12}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'warning.light',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color="warning.dark">
                  Connect to a device to view real-time status
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};
