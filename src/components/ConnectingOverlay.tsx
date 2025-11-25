/**
 * Connecting Overlay Component
 * Shows a branded loading screen while connecting to BLE device
 * Responsive design: centered card on desktop, fuller on mobile
 */

import React from 'react';
import {
  Dialog,
  Box,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';

interface ConnectingOverlayProps {
  open: boolean;
  deviceName?: string;
}

export const ConnectingOverlay: React.FC<ConnectingOverlayProps> = ({ open, deviceName }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 2 : 3,
          minWidth: isMobile ? '85vw' : 360,
          maxWidth: 420,
          m: 2,
          overflow: 'hidden',
        },
      }}
      // Prevent closing by clicking outside or pressing escape
      disableEscapeKeyDown
      onClose={() => {}}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: isMobile ? 4 : 5,
          px: isMobile ? 3 : 4,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(25,118,210,0.15) 0%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(25,118,210,0.08) 0%, transparent 100%)',
        }}
      >
        {/* Animated Bluetooth Icon */}
        <Box
          sx={{
            position: 'relative',
            mb: 3,
          }}
        >
          <BluetoothSearchingIcon
            sx={{
              fontSize: isMobile ? 64 : 80,
              color: 'primary.main',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  opacity: 1,
                  transform: 'scale(1)',
                },
                '50%': {
                  opacity: 0.6,
                  transform: 'scale(0.95)',
                },
              },
            }}
          />
        </Box>

        {/* Status Text */}
        <Typography
          variant={isMobile ? 'body1' : 'h6'}
          sx={{
            fontWeight: 500,
            mb: 1,
            textAlign: 'center',
          }}
        >
          {deviceName ? `Connecting to ${deviceName}...` : 'Connecting to device...'}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 3,
            textAlign: 'center',
          }}
        >
          Please wait while we establish the connection
        </Typography>

        {/* Progress Indicator */}
        <CircularProgress
          size={isMobile ? 32 : 40}
          thickness={4}
          sx={{ mb: 3 }}
        />

        {/* App Branding */}
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              letterSpacing: '0.5px',
            }}
          >
            MLEHaptics
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Configuration PWA
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};
