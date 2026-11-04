import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from './theme';
import { COLOR_MODE_KEY, ColorModeContext, readColorMode } from './colorMode';

export default function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState(readColorMode);
  const toggleMode = useCallback(() => setMode((previous) => previous === 'dark' ? 'light' : 'dark'), []);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  useLayoutEffect(() => {
    // Clear only the appearance overrides introduced by the reverted theme.
    for (const token of ['--color-bg', '--color-page', '--color-page-text', '--color-text', '--color-text-primary', '--color-muted', '--color-text-secondary']) {
      document.documentElement.style.removeProperty(token);
    }
    try { localStorage.removeItem('finance.backgroundColors'); } catch { /* Storage may be unavailable. */ }
    document.documentElement.dataset.colorMode = mode;
    try { localStorage.setItem(COLOR_MODE_KEY, mode); } catch { /* The switch still works when storage is unavailable. */ }
  }, [mode]);

  useEffect(() => {
    const syncMode = (event: StorageEvent) => {
      if (event.key === COLOR_MODE_KEY || event.key === null) setMode(readColorMode());
    };
    window.addEventListener('storage', syncMode);
    return () => window.removeEventListener('storage', syncMode);
  }, []);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
