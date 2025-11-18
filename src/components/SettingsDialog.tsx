/**
 * Settings Dialog Component
 * User-friendly UI for configuring PWA application settings
 * Separate from Device Presets (which configure BLE device settings)
 */

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import RestoreIcon from '@mui/icons-material/Restore';
import { usePWASettings } from '../contexts/PWASettingsContext';
import { PWA_SETTINGS_BOUNDS } from '../types/pwa-settings.types';
import { pwaSettingsService } from '../services/pwa-settings.service';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const { settings, updateSettings, resetToDefaults } = usePWASettings();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for immediate UI updates
  const [debounceDelay, setDebounceDelay] = useState(settings.ui.debounceDelayMs);
  const [theme, setTheme] = useState(settings.ui.theme);
  const [compactMode, setCompactMode] = useState(settings.ui.compactMode);
  const [showAdvanced, setShowAdvanced] = useState(settings.ui.showAdvancedControls);
  const [autoReconnect, setAutoReconnect] = useState(settings.ble.autoReconnect);
  const [reconnectDelay, setReconnectDelay] = useState(settings.ble.reconnectDelayMs);

  // Update local state when settings change
  React.useEffect(() => {
    setDebounceDelay(settings.ui.debounceDelayMs);
    setTheme(settings.ui.theme);
    setCompactMode(settings.ui.compactMode);
    setShowAdvanced(settings.ui.showAdvancedControls);
    setAutoReconnect(settings.ble.autoReconnect);
    setReconnectDelay(settings.ble.reconnectDelayMs);
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings({
        ui: {
          debounceDelayMs: debounceDelay,
          theme,
          compactMode,
          showAdvancedControls: showAdvanced,
        },
        ble: {
          autoReconnect,
          reconnectDelayMs: reconnectDelay,
        },
      });
      showSnackbar('Settings saved successfully', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      showSnackbar(`Failed to save settings: ${error}`, 'error');
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      showSnackbar('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showSnackbar(`Failed to reset settings: ${error}`, 'error');
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await pwaSettingsService.exportSettings();
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mlehaptics-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSnackbar('Settings exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export settings:', error);
      showSnackbar(`Failed to export settings: ${error}`, 'error');
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const result = await pwaSettingsService.importSettings(data);

      if (result.success) {
        showSnackbar('Settings imported successfully', 'success');
      } else {
        showSnackbar(`Failed to import settings: ${result.errors.join(', ')}`, 'error');
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      showSnackbar(`Failed to import settings: ${error}`, 'error');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">PWA Settings</Typography>
            <Box>
              <IconButton onClick={handleImport} title="Import Settings" size="small">
                <FileUploadIcon />
              </IconButton>
              <IconButton onClick={handleExport} title="Export Settings" size="small">
                <FileDownloadIcon />
              </IconButton>
              <IconButton onClick={handleReset} title="Reset to Defaults" size="small">
                <RestoreIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* UI Settings */}
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              UI Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Debounce Delay Slider */}
            <Box sx={{ mb: 4 }}>
              <Typography gutterBottom>
                Slider Response Delay: {debounceDelay}ms
              </Typography>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                How long to pause before sending value during slider interaction
              </Typography>
              <Box sx={{ px: 2, py: 3 }}>
                <Slider
                  value={debounceDelay}
                  onChange={(_, value) => setDebounceDelay(value as number)}
                  min={PWA_SETTINGS_BOUNDS.debounceDelayMs.min}
                  max={PWA_SETTINGS_BOUNDS.debounceDelayMs.max}
                  step={50}
                  marks={[
                    { value: 100, label: '100ms' },
                    { value: 500, label: '500ms' },
                    { value: 1000, label: '1000ms' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}ms`}
                />
              </Box>
            </Box>

            {/* Theme Selector */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Theme</InputLabel>
              <Select
                value={theme}
                label="Theme"
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
              >
                <MenuItem value="auto">Auto (System)</MenuItem>
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>

            {/* Compact Mode Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={compactMode}
                  onChange={(e) => setCompactMode(e.target.checked)}
                />
              }
              label="Compact Mode"
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3, ml: 4 }}>
              Reduces spacing for smaller screens
            </Typography>

            {/* Show Advanced Controls */}
            <FormControlLabel
              control={
                <Switch
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                />
              }
              label="Show Advanced Controls"
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3, ml: 4 }}>
              Display debug and advanced options
            </Typography>

            {/* BLE Settings */}
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 4 }}>
              Bluetooth Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Auto-reconnect Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={autoReconnect}
                  onChange={(e) => setAutoReconnect(e.target.checked)}
                />
              }
              label="Auto-reconnect on disconnect"
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3, ml: 4 }}>
              Automatically attempt to reconnect if device disconnects
            </Typography>

            {/* Reconnect Delay Slider */}
            {autoReconnect && (
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Reconnect Delay: {(reconnectDelay / 1000).toFixed(1)}s
                </Typography>
                <Box sx={{ px: 2, py: 3 }}>
                  <Slider
                    value={reconnectDelay}
                    onChange={(_, value) => setReconnectDelay(value as number)}
                    min={PWA_SETTINGS_BOUNDS.reconnectDelayMs.min}
                    max={PWA_SETTINGS_BOUNDS.reconnectDelayMs.max}
                    step={500}
                    marks={[
                      { value: 1000, label: '1s' },
                      { value: 5000, label: '5s' },
                      { value: 10000, label: '10s' },
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${(value / 1000).toFixed(1)}s`}
                  />
                </Box>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 3 }}>
              Settings are saved to your browser and persist across sessions.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileSelected}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
