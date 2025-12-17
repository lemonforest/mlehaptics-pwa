import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Slider,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import Battery80Icon from '@mui/icons-material/Battery80';
import Battery50Icon from '@mui/icons-material/Battery50';
import Battery20Icon from '@mui/icons-material/Battery20';
import TimerIcon from '@mui/icons-material/Timer';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { bleConfigService } from '../services/ble-config.service';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useBatteryLevel } from '../hooks/useBatteryLevel';
import { usePWASettings } from '../contexts/PWASettingsContext';
import { CollapsibleCard } from './CollapsibleCard';

interface StatusMonitorProps {
  connected: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export const StatusMonitor: React.FC<StatusMonitorProps> = ({ connected, expanded, onToggleExpanded }) => {
  const { settings } = usePWASettings();
  const compactMode = settings.ui.compactMode;
  const showAdvancedControls = settings.ui.showAdvancedControls;

  const [sessionDuration, setSessionDuration] = useState(1200); // 20 min default
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [localFirmwareVersion, setLocalFirmwareVersion] = useState('');
  const [peerFirmwareVersion, setPeerFirmwareVersion] = useState('');

  // Initialize with default values
  const [initialSessionTime, setInitialSessionTime] = useState(0);
  const [initialBatteryLevel, setInitialBatteryLevel] = useState(100);
  const [initialClientBatteryLevel, setInitialClientBatteryLevel] = useState(0);

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

  // Subscribe function for client battery level notifications
  const subscribeClientBatteryLevel = useCallback((callback: (level: number) => void) => {
    if (!connected) return () => {};
    return bleConfigService.subscribe('CLIENT_BATTERY', callback);
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

  const clientBattery = useBatteryLevel({
    initialLevel: initialClientBatteryLevel,
    onSubscribe: subscribeClientBatteryLevel,
    autoStart: false, // Will start manually after loading config
  });

  // Load initial config when connected
  useEffect(() => {
    if (connected) {
      loadInitialConfig();
    } else {
      // Stop timer when disconnected
      sessionTimer.stop();
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
      setInitialClientBatteryLevel(config.clientBatteryLevel);
      setLocalFirmwareVersion(config.localFirmwareVersion || '');
      setPeerFirmwareVersion(config.peerFirmwareVersion || '');

      // Set initial values in hooks
      sessionTimer.setTime(config.sessionTime);
      battery.setBatteryLevel(config.batteryLevel);
      clientBattery.setBatteryLevel(config.clientBatteryLevel);

      // Start the local timer now that we have initial values
      sessionTimer.start();

      console.log('✅ BLE notify mode active:');
      console.log('  - Session time: local counter + device sync every 60s');
      console.log('  - Battery level: real-time notifications');
    } catch (error) {
      console.error('Failed to load status config:', error);
      setSnackbar({ open: true, message: 'Warning: Failed to read device status.' });
    }
  };

  // Update local state immediately for responsive UI
  const handleDurationChange = (_: Event, value: number | number[]) => {
    const duration = value as number;
    setSessionDuration(duration);
  };

  // Send to BLE only when user releases slider
  const handleDurationCommitted = async (_: Event | React.SyntheticEvent, value: number | number[]) => {
    const duration = value as number;
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

  const getBatteryIcon = (level: number) => {
    if (level > 75) return <BatteryFullIcon />;
    if (level > 50) return <Battery80Icon />;
    if (level > 25) return <Battery50Icon />;
    return <Battery20Icon />;
  };

  // Summary view for collapsed state
  const summaryView = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <Chip
        icon={<TimerIcon sx={{ fontSize: 16 }} />}
        label={`${formatTime(sessionTimer.sessionTime)} / ${formatTime(sessionDuration)}`}
        size="small"
        color={sessionTimer.progress >= 100 ? 'success' : 'default'}
        variant="outlined"
      />
      <Chip
        icon={getBatteryIcon(battery.batteryLevel)}
        label={`${battery.batteryLevel}%`}
        size="small"
        color={battery.color}
        variant="outlined"
      />
      {clientBattery.batteryLevel > 0 && (
        <Chip
          label={`Client: ${clientBattery.batteryLevel}%`}
          size="small"
          color={clientBattery.color}
          variant="outlined"
        />
      )}
      {!connected && (
        <Chip label="Disconnected" size="small" color="warning" variant="outlined" />
      )}
    </Box>
  );

  return (
    <CollapsibleCard
      title="Status & Monitoring"
      expanded={expanded}
      onToggle={onToggleExpanded}
      summary={summaryView}
      compactMode={compactMode}
    >
      <Grid container spacing={compactMode ? 2 : 3}>
          <Grid item xs={12}>
            <Typography gutterBottom>
              Session Duration: {formatTime(sessionDuration)} ({sessionDuration / 60} minutes)
            </Typography>
            <Box sx={{ px: compactMode ? 1 : 2, py: compactMode ? 2 : 3 }}>
              <Slider
                value={sessionDuration}
                onChange={handleDurationChange}
                onChangeCommitted={handleDurationCommitted}
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
                {getBatteryIcon(battery.batteryLevel)}
                <Typography>Host Battery</Typography>
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
                Low battery! Please charge the host device.
              </Typography>
            )}
          </Grid>

          {clientBattery.batteryLevel > 0 && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getBatteryIcon(clientBattery.batteryLevel)}
                  <Typography>Client Battery</Typography>
                </Box>
                <Chip
                  label={`${clientBattery.batteryLevel}%`}
                  size="small"
                  color={clientBattery.color}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={clientBattery.batteryLevel}
                color={clientBattery.color}
                sx={{ height: 10, borderRadius: 1 }}
              />
              {clientBattery.isLow && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  Low battery! Please charge the client device.
                </Typography>
              )}
            </Grid>
          )}

          {connected && showAdvancedControls && localFirmwareVersion && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <InfoOutlinedIcon color="action" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Firmware Version
                </Typography>
              </Box>
              <Box sx={{ pl: 4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Host: {localFirmwareVersion}
                </Typography>
                {peerFirmwareVersion && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Client: {peerFirmwareVersion}
                  </Typography>
                )}
              </Box>
            </Grid>
          )}

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
