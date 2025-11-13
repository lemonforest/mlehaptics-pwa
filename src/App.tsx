import { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import BluetoothConnectedIcon from '@mui/icons-material/BluetoothConnected';
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { MotorControl } from './components/MotorControl';
import { LEDControl } from './components/LEDControl';
import { StatusMonitor } from './components/StatusMonitor';
import { PresetManager } from './components/PresetManager';
import { bleConfigService, ScanOptions } from './services/ble-config.service';
import { presetStorageService } from './services/preset-storage.service';

function App() {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(true);

  // Scan options state
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [namePrefix, setNamePrefix] = useState<string>('');
  const [acceptAllDevices, setAcceptAllDevices] = useState(false);

  // Preset manager state
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);

  // Format build date for display
  const formatBuildDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    // Check if Web Bluetooth is available
    if (!navigator.bluetooth) {
      setBluetoothAvailable(false);
      setError('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }

    // Initialize preset storage with default presets
    presetStorageService.initialize();
  }, []);

  const handleConnect = async (scanOptions?: ScanOptions) => {
    try {
      setError('');
      const options = scanOptions || {
        namePrefix: namePrefix || undefined,
        acceptAllDevices: acceptAllDevices,
        disableAutoNotifications: true, // Use polling mode to reduce BLE traffic
      };
      await bleConfigService.connect(options);
      setConnected(true);
      setDeviceName(bleConfigService.getDeviceName());
      setSnackbarOpen(true);
      setScanDialogOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to device';
      setError(errorMessage);
      setConnected(false);
    }
  };

  const handleQuickConnect = () => {
    // Quick connect with default options (service UUID filter only)
    handleConnect({ disableAutoNotifications: true });
  };

  const handleAdvancedScan = () => {
    setScanDialogOpen(true);
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
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              MLEHaptics Configuration
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              v{__APP_VERSION__} • {formatBuildDate(__BUILD_DATE__)}
              {connected && (
                <>
                  {' • '}
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <BluetoothConnectedIcon sx={{ fontSize: '0.875rem' }} />
                    {deviceName}
                  </Box>
                </>
              )}
            </Typography>
          </Box>
          {connected && (
            <IconButton color="inherit" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          )}
          <IconButton color="inherit" onClick={() => setPresetDialogOpen(true)} disabled={!bluetoothAvailable} title="Presets">
            <BookmarkIcon />
          </IconButton>
          {!connected && (
            <IconButton color="inherit" onClick={handleAdvancedScan} disabled={!bluetoothAvailable}>
              <SettingsIcon />
            </IconButton>
          )}
          <Button
            color="inherit"
            onClick={connected ? handleDisconnect : handleQuickConnect}
            disabled={!bluetoothAvailable}
            startIcon={connected ? <BluetoothDisabledIcon /> : <BluetoothIcon />}
          >
            {connected ? 'Disconnect' : 'Connect Device'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Scan Options Dialog */}
      <Dialog open={scanDialogOpen} onClose={() => setScanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Scan Options</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Customize how the app scans for BLE devices. By default, only devices advertising the Configuration Service are shown.
              </Typography>
            </Alert>

            <TextField
              label="Device Name Prefix"
              placeholder="e.g., EMDR, MLEHaptics"
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              helperText="Filter devices by name prefix (leave empty to show all)"
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={acceptAllDevices}
                  onChange={(e) => setAcceptAllDevices(e.target.checked)}
                />
              }
              label="Show All BLE Devices (Testing Mode)"
            />

            {acceptAllDevices && (
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Testing Mode:</strong> All nearby BLE devices will be shown, even if they don't support the Configuration Service.
                  This may cause connection errors if you select an incompatible device.
                </Typography>
              </Alert>
            )}

            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Tips:</strong>
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>
                  <Typography variant="caption" color="text.secondary">
                    Leave options empty for standard scanning (service UUID only)
                  </Typography>
                </li>
                <li>
                  <Typography variant="caption" color="text.secondary">
                    Use name prefix if you know your device name pattern
                  </Typography>
                </li>
                <li>
                  <Typography variant="caption" color="text.secondary">
                    Enable "Show All" for debugging with tools like nRF Connect
                  </Typography>
                </li>
              </ul>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleConnect()} variant="contained">
            Scan & Connect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preset Manager Dialog */}
      <PresetManager
        open={presetDialogOpen}
        onClose={() => setPresetDialogOpen(false)}
        connected={connected}
      />

      <Container
        maxWidth="md"
        sx={{
          mt: 2,
          mb: 4,
          px: { xs: 2, sm: 3 },
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {!bluetoothAvailable && (
          <Alert severity="error" sx={{ mb: 2 }}>
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
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {!connected && bluetoothAvailable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Welcome to MLEHaptics Configuration</strong>
            </Typography>
            <Typography variant="body2">
              Click "Connect Device" to pair with your MLEHaptics device via Bluetooth.
              This app allows you to configure motor parameters, LED settings, and monitor your therapy sessions.
            </Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <MotorControl connected={connected} />
          <LEDControl connected={connected} />
          <StatusMonitor connected={connected} />
        </Box>

        {connected && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
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
