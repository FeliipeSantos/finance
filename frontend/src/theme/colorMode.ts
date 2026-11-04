import { createContext, useContext } from 'react';

export type ColorMode = 'dark' | 'light';
export const COLOR_MODE_KEY = 'finance.colorMode';
export const ColorModeContext = createContext<{ mode: ColorMode; toggleMode: () => void } | null>(null);

export function readColorMode(): ColorMode {
  try {
    return localStorage.getItem(COLOR_MODE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) throw new Error('useColorMode must be used within ColorModeProvider');
  return context;
}
