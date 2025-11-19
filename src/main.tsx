import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery, PaletteMode } from '@mui/material';
import App from './App';
import { PWASettingsProvider, usePWASettings } from './contexts/PWASettingsContext';

// Create theme factory function
const createAppTheme = (mode: PaletteMode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    ...(mode === 'light' ? {
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
    } : {
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
    }),
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'light'
            ? '0 2px 8px rgba(0,0,0,0.1)'
            : '0 2px 8px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});

// Theme wrapper component that responds to settings
const ThemedApp: React.FC = () => {
  const { settings } = usePWASettings();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Determine effective theme mode
  const themeMode: PaletteMode =
    settings.ui.theme === 'auto'
      ? (prefersDarkMode ? 'dark' : 'light')
      : settings.ui.theme;

  const theme = React.useMemo(() => createAppTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PWASettingsProvider>
      <ThemedApp />
    </PWASettingsProvider>
  </React.StrictMode>
);
