/**
 * PatternControl Component
 * Controls for Mode 5 (Pattern Playback) - an experimental demo mode.
 * Provides playback controls (play/stop), pattern selection, and status display.
 *
 * Note: This mode is for research/demo purposes only, not therapy.
 * Per AD032, it should be hidden by default in production builds.
 */

import { useState, useEffect } from 'react';
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Snackbar,
  Alert,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ErrorIcon from '@mui/icons-material/Error';
import {
  bleConfigService,
  PatternStatus,
  BUILTIN_PATTERNS,
} from '../services/ble-config.service';
import { usePWASettings } from '../contexts/PWASettingsContext';

interface PatternControlProps {
  connected: boolean;
}

// Status chip colors and labels
const STATUS_CONFIG: Record<PatternStatus, { color: 'default' | 'success' | 'error'; label: string }> = {
  [PatternStatus.STOPPED]: { color: 'default', label: 'Stopped' },
  [PatternStatus.PLAYING]: { color: 'success', label: 'Playing' },
  [PatternStatus.ERROR]: { color: 'error', label: 'Error' },
};

export const PatternControl: React.FC<PatternControlProps> = ({ connected }) => {
  const { settings } = usePWASettings();
  const compactMode = settings.ui.compactMode;

  // State
  const [patternStatus, setPatternStatus] = useState<PatternStatus>(PatternStatus.STOPPED);
  const [selectedPattern, setSelectedPattern] = useState<number>(BUILTIN_PATTERNS[0]?.id ?? 2);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' as 'error' | 'success' });

  // Subscribe to pattern status notifications
  useEffect(() => {
    if (connected) {
      // Read initial status
      loadPatternStatus();

      // Subscribe to status changes
      const unsubscribe = bleConfigService.onPatternStatusChange((status: PatternStatus) => {
        console.log('Pattern status changed:', status);
        setPatternStatus(status);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [connected]);

  const loadPatternStatus = async () => {
    try {
      const status = await bleConfigService.getPatternStatus();
      setPatternStatus(status);
    } catch (error) {
      console.warn('Failed to read pattern status:', error);
      // Pattern playback may not be supported by this firmware
    }
  };

  const handlePlayPattern = async () => {
    if (!connected) return;

    setIsLoading(true);
    try {
      await bleConfigService.loadAndStartBuiltinPattern(selectedPattern);
      // Status will update via notification
    } catch (error) {
      console.error('Failed to start pattern:', error);
      setSnackbar({
        open: true,
        message: 'Failed to start pattern playback',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopPattern = async () => {
    if (!connected) return;

    setIsLoading(true);
    try {
      await bleConfigService.stopPattern();
      // Status will update via notification
    } catch (error) {
      console.error('Failed to stop pattern:', error);
      setSnackbar({
        open: true,
        message: 'Failed to stop pattern playback',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isPlaying = patternStatus === PatternStatus.PLAYING;
  const hasError = patternStatus === PatternStatus.ERROR;
  const statusConfig = STATUS_CONFIG[patternStatus];

  return (
    <Box>
      <Grid container spacing={compactMode ? 2 : 3}>
        {/* Status Display */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Status:
            </Typography>
            <Chip
              icon={hasError ? <ErrorIcon /> : undefined}
              label={statusConfig.label}
              color={statusConfig.color}
              size="small"
              sx={{
                ...(isPlaying && {
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.6 },
                  },
                }),
              }}
            />
            {isLoading && <CircularProgress size={16} />}
          </Box>
        </Grid>

        {/* Pattern Selection */}
        <Grid item xs={12}>
          <FormControl fullWidth disabled={!connected || isPlaying}>
            <InputLabel>Pattern</InputLabel>
            <Select
              value={selectedPattern}
              label="Pattern"
              onChange={(e) => setSelectedPattern(e.target.value as number)}
            >
              {BUILTIN_PATTERNS.map((pattern) => (
                <MenuItem key={pattern.id} value={pattern.id}>
                  {pattern.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {BUILTIN_PATTERNS.find(p => p.id === selectedPattern)?.description && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {BUILTIN_PATTERNS.find(p => p.id === selectedPattern)?.description}
            </Typography>
          )}
        </Grid>

        {/* Playback Controls */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isPlaying ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handlePlayPattern}
                disabled={!connected || isLoading}
                fullWidth
              >
                Play
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopPattern}
                disabled={!connected || isLoading}
                fullWidth
              >
                Stop
              </Button>
            )}
          </Box>
        </Grid>

        {/* Info Notice */}
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">
            Pattern mode is experimental. Motor intensity and LED colors are controlled by the pattern data.
          </Typography>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
