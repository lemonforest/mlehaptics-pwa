import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  Chip,
  Alert,
  Divider,
  Snackbar,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { DevicePreset, PresetConfig } from '../types/preset.types';
import { presetStorageService } from '../services/preset-storage.service';
import { bleConfigService, MOTOR_MODE_LABELS, COLOR_PALETTE } from '../services/ble-config.service';

interface PresetManagerProps {
  open: boolean;
  onClose: () => void;
  connected: boolean;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ open, onClose, connected }) => {
  const [presets, setPresets] = useState<DevicePreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [overwriteWarning, setOverwriteWarning] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; preset: DevicePreset | null }>({
    open: false,
    preset: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadPresets();
    }
  }, [open]);

  const loadPresets = async () => {
    const loaded = await presetStorageService.getAllPresets();
    setPresets(loaded);
  };

  const handleOpenSaveDialog = async () => {
    if (!connected) {
      showSnackbar('Please connect to a device first', 'error');
      return;
    }

    // Generate auto-incremented name
    const autoName = await presetStorageService.generatePresetName();
    setPresetName(autoName);
    setOverwriteWarning(false);
    setSaveDialogOpen(true);
  };

  const handleNameChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    setPresetName(name);
    const exists = await presetStorageService.presetExists(name);
    setOverwriteWarning(exists);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      showSnackbar('Please enter a preset name', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Read current device config
      const config = await bleConfigService.readConfig();

      // Extract only the writable settings (exclude sessionTime, batteryLevel)
      const presetConfig: PresetConfig = {
        mode: config.mode,
        customFrequency: config.customFrequency,
        customDutyCycle: config.customDutyCycle,
        pwmIntensity: config.pwmIntensity,
        ledEnable: config.ledEnable,
        ledColorMode: config.ledColorMode,
        ledPaletteIndex: config.ledPaletteIndex,
        ledCustomRGB: config.ledCustomRGB,
        ledBrightness: config.ledBrightness,
        sessionDuration: config.sessionDuration,
      };

      // Save preset
      presetStorageService.savePreset(presetName.trim(), presetConfig);

      showSnackbar(`Preset "${presetName.trim()}" saved successfully`, 'success');
      setSaveDialogOpen(false);
      loadPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
      showSnackbar(`Failed to save preset: ${error}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = async (preset: DevicePreset) => {
    if (!connected) {
      showSnackbar('Please connect to a device first', 'error');
      return;
    }

    setLoadingPresetId(preset.id);
    setLoadProgress(0);

    try {
      // Validate config before applying
      const validation = presetStorageService.validateConfig(preset.config);
      if (!validation.valid) {
        showSnackbar(`Invalid preset: ${validation.errors.join(', ')}`, 'error');
        return;
      }

      // Apply all settings to device with progress tracking
      const config = preset.config;
      const totalSteps = 10;

      await bleConfigService.setMotorMode(config.mode);
      setLoadProgress((1 / totalSteps) * 100);

      await bleConfigService.setCustomFrequency(config.customFrequency);
      setLoadProgress((2 / totalSteps) * 100);

      await bleConfigService.setCustomDutyCycle(config.customDutyCycle);
      setLoadProgress((3 / totalSteps) * 100);

      await bleConfigService.setPWMIntensity(config.pwmIntensity);
      setLoadProgress((4 / totalSteps) * 100);

      await bleConfigService.setLEDEnable(config.ledEnable);
      setLoadProgress((5 / totalSteps) * 100);

      await bleConfigService.setLEDColorMode(config.ledColorMode);
      setLoadProgress((6 / totalSteps) * 100);

      await bleConfigService.setLEDPaletteIndex(config.ledPaletteIndex);
      setLoadProgress((7 / totalSteps) * 100);

      await bleConfigService.setLEDCustomRGB(config.ledCustomRGB);
      setLoadProgress((8 / totalSteps) * 100);

      await bleConfigService.setLEDBrightness(config.ledBrightness);
      setLoadProgress((9 / totalSteps) * 100);

      await bleConfigService.setSessionDuration(config.sessionDuration);
      setLoadProgress(100);

      showSnackbar(`Preset "${preset.name}" loaded successfully`, 'success');

      // Force UI refresh by triggering a config read
      // This will update all components through their cached config
      await bleConfigService.readConfig();

      // Close dialog after successful load
      onClose();
    } catch (error) {
      console.error('Failed to load preset:', error);
      showSnackbar(`Failed to load preset: ${error}`, 'error');
    } finally {
      setLoadingPresetId(null);
      setLoadProgress(0);
    }
  };

  const handleDeletePreset = (preset: DevicePreset) => {
    setDeleteConfirmDialog({ open: true, preset });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmDialog.preset) return;

    const success = await presetStorageService.deletePreset(deleteConfirmDialog.preset.id);
    if (success) {
      showSnackbar(`Preset "${deleteConfirmDialog.preset.name}" deleted`, 'success');
      loadPresets();
    } else {
      showSnackbar('Failed to delete preset', 'error');
    }
    setDeleteConfirmDialog({ open: false, preset: null });
  };

  const handleCancelDelete = () => {
    setDeleteConfirmDialog({ open: false, preset: null });
  };

  const handleExportPresets = async () => {
    try {
      const exportData = await presetStorageService.exportPresets();
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mlehaptics-presets-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSnackbar('Presets exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export presets:', error);
      showSnackbar(`Failed to export presets: ${error}`, 'error');
    }
  };

  const handleImportPresets = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const result = await presetStorageService.importPresets(data, 'merge');

      if (result.success) {
        showSnackbar(`Successfully imported ${result.imported} preset(s)`, 'success');
        if (result.errors.length > 0) {
          console.warn('Import warnings:', result.errors);
        }
        loadPresets();
      } else {
        showSnackbar(`Failed to import presets: ${result.errors.join(', ')}`, 'error');
      }
    } catch (error) {
      console.error('Failed to import presets:', error);
      showSnackbar(`Failed to import presets: ${error}`, 'error');
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

  const formatPresetSummary = (preset: DevicePreset): string => {
    const config = preset.config;
    const motorMode = MOTOR_MODE_LABELS[config.mode];
    const ledColor = config.ledColorMode === 0
      ? COLOR_PALETTE[config.ledPaletteIndex]?.name || 'Unknown'
      : `RGB(${config.ledCustomRGB.join(',')})`;
    const duration = `${config.sessionDuration / 60}min`;

    return `${motorMode} • ${ledColor} LED • ${duration}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Device Presets</Typography>
            <Box>
              <IconButton onClick={handleImportPresets} title="Import Presets">
                <FileUploadIcon />
              </IconButton>
              <IconButton onClick={handleExportPresets} title="Export Presets" disabled={presets.length === 0}>
                <FileDownloadIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingPresetId && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={loadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Loading preset... {Math.round(loadProgress)}%
              </Typography>
            </Box>
          )}
          {!connected && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Connect to a device to save or load presets
            </Alert>
          )}

          {presets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No presets saved yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Connect to a device and click "Save Preset" to get started
              </Typography>
            </Box>
          ) : (
            <List>
              {presets.map((preset, index) => (
                <React.Fragment key={preset.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {preset.name}
                          </Typography>
                          <Chip label={formatDate(preset.createdAt)} size="small" variant="outlined" />
                        </Box>
                      }
                      secondary={formatPresetSummary(preset)}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleLoadPreset(preset)}
                        disabled={!connected || loadingPresetId !== null}
                        title="Load Preset"
                        color="primary"
                      >
                        {loadingPresetId === preset.id ? (
                          <CircularProgress size={24} />
                        ) : (
                          <PlayArrowIcon />
                        )}
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeletePreset(preset)}
                        disabled={loadingPresetId !== null}
                        title="Delete Preset"
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loadingPresetId !== null}>Close</Button>
          <Button
            onClick={handleOpenSaveDialog}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!connected || loadingPresetId !== null}
          >
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => !isSaving && setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Current Settings as Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Preset Name"
            type="text"
            fullWidth
            value={presetName}
            onChange={handleNameChange}
            variant="outlined"
            disabled={isSaving}
          />
          {overwriteWarning && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              A preset with this name already exists. Saving will overwrite it.
            </Alert>
          )}
          {isSaving && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Reading device settings...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={isSaving}>Cancel</Button>
          <Button
            onClick={handleSavePreset}
            variant="contained"
            disabled={!presetName.trim() || isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {isSaving ? 'Saving...' : 'Save'}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Preset</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete preset <strong>"{deleteConfirmDialog.preset?.name}"</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
