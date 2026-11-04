import { createTheme } from '@mui/material/styles';

// Visual tokens adapted from the Finance management Dashboard UI kit.
// Keep palette colors literal for MUI's contrast and color calculations.
export function createAppTheme(mode: 'dark' | 'light') {
  const dark = mode === 'dark';
  const primary = dark ? '#8A98F1' : '#3447AA';
  const primarySolid = dark ? '#394BBF' : '#3447AA';
  return createTheme({
    palette: {
      mode,
      primary: { main: primary, light: '#A7B1F7', dark: '#26368A', contrastText: dark ? '#171A23' : '#FFFFFF' },
      secondary: { main: dark ? '#E66B78' : '#BF4052', contrastText: '#FFFFFF' },
      background: { default: dark ? '#111111' : '#F7F8FC', paper: dark ? '#1E1F27' : '#FFFFFF' },
      text: { primary: dark ? '#F5F6FA' : '#171A23', secondary: dark ? '#979CAE' : '#626D7B' },
      divider: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(31, 42, 68, 0.08)',
      success: { main: dark ? '#35C3A3' : '#16846F' },
      error: { main: dark ? '#E66B78' : '#BF4052' },
      warning: { main: dark ? '#DDB06C' : '#956015' },
      info: { main: primary },
      action: {
        hover: dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(52, 71, 170, 0.04)',
        selected: 'rgba(57, 75, 191, 0.12)',
        focus: 'rgba(57, 75, 191, 0.18)',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.035em' },
      h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' },
      h3: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.025em' },
      h4: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' },
      h5: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em' },
      h6: { fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.015em' },
      subtitle2: { fontWeight: 600, letterSpacing: '-0.01em' },
      body1: { fontSize: '0.95rem', lineHeight: 1.6 },
      body2: { fontSize: '0.85rem', lineHeight: 1.6 },
      button: { textTransform: 'none', fontWeight: 600 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: { styleOverrides: {
        body: { backgroundColor: 'var(--color-page)', color: 'var(--color-text-primary)' },
        '::selection': { backgroundColor: 'rgba(57, 75, 191, 0.24)' },
      } },
      MuiButton: { styleOverrides: {
        root: {
          borderRadius: 8, padding: '9px 18px', boxShadow: 'none',
          transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
          '&:focus-visible': { outline: '2px solid', outlineColor: primary, outlineOffset: 3 },
        },
        contained: { '--color-text-primary': '#FFFFFF', '&:hover': { boxShadow: 'none' } },
        containedPrimary: {
          backgroundColor: primarySolid, backgroundImage: 'none', color: '#FFFFFF',
          '&:hover': { backgroundColor: '#26368A', backgroundImage: 'none' },
        },
        containedSecondary: { backgroundImage: 'none', '&:hover': { backgroundImage: 'none' } },
        outlinedPrimary: {
          borderColor: 'rgba(57, 75, 191, 0.3)',
          '&:hover': { borderColor: primary, backgroundColor: 'rgba(57, 75, 191, 0.06)' },
        },
      } },
      MuiIconButton: { styleOverrides: { root: {
        color: 'var(--color-text-secondary)',
        '&:focus-visible': { outline: '2px solid', outlineColor: primary, outlineOffset: 2 },
      } } },
      MuiCard: { styleOverrides: { root: {
        background: 'var(--color-panel)', border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-panel)', borderRadius: 12,
      } } },
      MuiPaper: { styleOverrides: { root: {
        backgroundImage: 'none', backgroundColor: 'var(--color-panel)',
        border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-panel)',
      } } },
      MuiTextField: { styleOverrides: { root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8, backgroundColor: 'var(--color-input)',
          '& fieldset': { borderColor: 'var(--color-border)' },
          '&:hover fieldset': { borderColor: 'rgba(57, 75, 191, 0.4)' },
          '&.Mui-focused fieldset': { borderColor: primary, boxShadow: '0 0 0 3px rgba(57, 75, 191, 0.08)' },
        },
        '& .MuiInputLabel-root.Mui-focused': { color: primary },
      } } },
      MuiTableCell: { styleOverrides: {
        root: { borderBottom: '1px solid var(--color-border)', fontVariantNumeric: 'tabular-nums' },
        head: { color: 'var(--color-text-secondary)', fontWeight: 600, backgroundColor: 'var(--color-table-header)' },
      } },
      MuiMenu: { styleOverrides: { paper: {
        background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)',
        borderRadius: 10, boxShadow: 'var(--shadow-popover)',
      } } },
      MuiMenuItem: { styleOverrides: { root: {
        '&:hover': { backgroundColor: 'rgba(57, 75, 191, 0.06)' },
        '&.Mui-selected': { backgroundColor: 'rgba(57, 75, 191, 0.12)' },
      } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem' } } },
      MuiDivider: { styleOverrides: { root: { borderColor: 'var(--color-border)' } } },
      MuiAppBar: { styleOverrides: { root: {
        backgroundImage: 'none', backgroundColor: 'var(--color-page)', borderBottom: 'none', boxShadow: 'none',
      } } },
      MuiDialog: { styleOverrides: { paper: {
        background: 'var(--color-panel)', border: '1px solid var(--color-border)',
        borderRadius: 16, boxShadow: 'var(--shadow-popover)',
      } } },
      MuiSwitch: { styleOverrides: { switchBase: {
        '&.Mui-checked': { color: primary, '& + .MuiSwitch-track': { backgroundColor: primary, opacity: 0.5 } },
      } } },
      MuiTooltip: { styleOverrides: { tooltip: {
        backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)', borderRadius: 6,
        boxShadow: 'var(--shadow-popover)', fontSize: '0.78rem',
      } } },
      MuiLinearProgress: { styleOverrides: { root: {
        borderRadius: 6, backgroundColor: 'rgba(var(--color-overlay-rgb), 0.06)',
      } } },
      MuiTabs: { styleOverrides: { indicator: { height: 2, borderRadius: 2 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
    },
  });
}

export default createAppTheme('dark');
