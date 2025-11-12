import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Alert,
  Snackbar,
  IconButton,
  Chip,
} from '@mui/material';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import BluetoothConnectedIcon from '@mui/icons-material/BluetoothConnected';
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MotorControl } from './components/MotorControl';
import { LEDControl } from './components/LEDControl';
import { StatusMonitor } from './components/StatusMonitor';
import { bleConfigService } from './services/ble-config.service';

function App() {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(true);

  useEffect(() => {
    // Check if Web Bluetooth is available
    if (!navigator.bluetooth) {
      setBluetoothAvailable(false);
      setError('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }
  }, []);

  const handleConnect = async () => {
    try {
      setError('');
      await bleConfigService.connect();
      setConnected(true);
      setDeviceName(bleConfigService.getDeviceName());
      setSnackbarOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to device';
      setError(errorMessage);
      setConnected(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await bleConfigService.disconnect();
      setConnected(false);
      setDeviceName('');
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(errorMessage);
    }
  };

  const handleRefresh = async () => {
    if (connected) {
      try {
        // Force reload configuration from device
        window.location.reload();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to refresh';
        setError(errorMessage);
      }
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <BluetoothIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MLEHaptics Configuration
          </Typography>
          {connected && (
            <>
              <Chip
                icon={<BluetoothConnectedIcon />}
                label={deviceName}
                color="success"
                sx={{ mr: 2 }}
              />
              <IconButton color="inherit" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </>
          )}
          <Button
            color="inherit"
            onClick={connected ? handleDisconnect : handleConnect}
            disabled={!bluetoothAvailable}
            startIcon={connected ? <BluetoothDisabledIcon /> : <BluetoothIcon />}
          >
            {connected ? 'Disconnect' : 'Connect Device'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {!bluetoothAvailable && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Web Bluetooth Not Supported</strong>
            </Typography>
            <Typography variant="body2">
              This application requires Web Bluetooth API support. Please use one of the following browsers:
            </Typography>
            <ul>
              <li>Chrome (desktop and Android)</li>
              <li>Microsoft Edge</li>
              <li>Opera</li>
            </ul>
            <Typography variant="body2">
              Note: Web Bluetooth requires HTTPS in production.
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {!connected && bluetoothAvailable && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Welcome to MLEHaptics Configuration</strong>
            </Typography>
            <Typography variant="body2">
              Click "Connect Device" to pair with your MLEHaptics device via Bluetooth.
              This app allows you to configure motor parameters, LED settings, and monitor your therapy sessions.
            </Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <MotorControl connected={connected} />
          <LEDControl connected={connected} />
          <StatusMonitor connected={connected} />
        </Box>

        {connected && (
          <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              All settings are automatically saved to the device when changed.
              Settings persist across power cycles via NVS storage.
            </Typography>
          </Box>
        )}
      </Container>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={`Connected to ${deviceName}`}
      />
    </Box>
  );
}

export default App;
