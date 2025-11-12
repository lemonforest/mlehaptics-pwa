import React, { useState, useEffect } from 'react';
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

interface StatusMonitorProps {
  connected: boolean;
}

export const StatusMonitor: React.FC<StatusMonitorProps> = ({ connected }) => {
  const [sessionDuration, setSessionDuration] = useState(1200); // 20 min default
  const [sessionTime, setSessionTime] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(100);

  useEffect(() => {
    if (connected) {
      loadConfig();
      setupNotifications();
    }

    return () => {
      // Cleanup subscriptions
    };
  }, [connected]);

  const loadConfig = async () => {
    try {
      const config = await bleConfigService.readConfig();
      setSessionDuration(config.sessionDuration);
      setSessionTime(config.sessionTime);
      setBatteryLevel(config.batteryLevel);
    } catch (error) {
      console.error('Failed to load status config:', error);
    }
  };

  const setupNotifications = () => {
    // Subscribe to session time updates
    const unsubscribeTime = bleConfigService.subscribe('SESSION_TIME', (value: number) => {
      setSessionTime(value);
    });

    // Subscribe to battery level updates
    const unsubscribeBattery = bleConfigService.subscribe('BATTERY_LEVEL', (value: number) => {
      setBatteryLevel(value);
    });

    return () => {
      unsubscribeTime();
      unsubscribeBattery();
    };
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
    if (batteryLevel > 75) return <BatteryFullIcon />;
    if (batteryLevel > 50) return <Battery80Icon />;
    if (batteryLevel > 25) return <Battery50Icon />;
    return <Battery20Icon />;
  };

  const getBatteryColor = () => {
    if (batteryLevel > 50) return 'success';
    if (batteryLevel > 25) return 'warning';
    return 'error';
  };

  const sessionProgress = (sessionTime / sessionDuration) * 100;

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
            />
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
                label={`${formatTime(sessionTime)} / ${formatTime(sessionDuration)}`}
                size="small"
                color={sessionProgress >= 100 ? 'success' : 'default'}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(sessionProgress, 100)}
              sx={{ height: 10, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {sessionProgress >= 100 ? 'Session complete!' : `${Math.round(sessionProgress)}% complete`}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getBatteryIcon()}
                <Typography>Battery Level</Typography>
              </Box>
              <Chip
                label={`${batteryLevel}%`}
                size="small"
                color={getBatteryColor()}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={batteryLevel}
              color={getBatteryColor()}
              sx={{ height: 10, borderRadius: 1 }}
            />
            {batteryLevel < 20 && (
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
