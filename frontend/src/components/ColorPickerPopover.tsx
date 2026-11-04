import React, { useRef, useState } from 'react';
import { Box, Divider, Popover, TextField, Typography } from '@mui/material';

const DEFAULT_COLOR_PRESETS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#EF4444',
  '#F59E0B', '#06B6D4', '#EC4899', '#7E8494',
];

const isValidHex = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

interface ColorPickerPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
}

// Popover de seleção de cor reutilizado em todo o app: grade de cores
// predefinidas + cor personalizada via input nativo (type="color") ou
// digitação direta do HEX.
const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  anchorEl,
  onClose,
  value,
  onChange,
  presets = DEFAULT_COLOR_PRESETS,
}) => {
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const [hexInput, setHexInput] = useState(value);

  // Sincroniza o campo de HEX com o valor atual sempre que o popover
  // transiciona de fechado para aberto — ajuste feito durante o render (não
  // em um efeito), seguindo o padrão do próprio React para "resetar estado
  // quando uma prop muda".
  const isOpen = Boolean(anchorEl);
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setHexInput(value);
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  const commitHex = (raw: string) => {
    const v = raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`;
    if (isValidHex(v)) {
      onChange(v.toUpperCase());
      setHexInput(v.toUpperCase());
    } else {
      setHexInput(value);
    }
  };

  const swatchColor = isValidHex(value) ? value : '#7E8494';

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      PaperProps={{
        sx: {
          p: 1.75,
          bgcolor: "var(--color-surface-raised, #1E1F28)",
          borderRadius: '12px',
          border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)",
          boxShadow: "0 8px 30px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.5)",
          width: 200,
        },
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.25, justifyItems: 'center' }}>
        {presets.map((c) => (
          <Box
            key={c}
            onClick={() => {
              onChange(c);
              onClose();
            }}
            sx={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              bgcolor: c,
              cursor: 'pointer',
              border: c.toLowerCase() === value.toLowerCase() ? "2px solid var(--color-text-primary, #FFFFFF)" : '2px solid transparent',
              transition: 'all 0.12s',
              '&:hover': { transform: 'scale(1.15)' },
            }}
          />
        ))}
      </Box>

      <Divider sx={{ borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)", my: 1.5 }} />

      <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", display: 'block', mb: 1 }}>
        Cor personalizada
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          component="label"
          title="Escolher cor"
          sx={{
            position: 'relative',
            width: 30,
            height: 30,
            borderRadius: "50%",
            cursor: 'pointer',
            bgcolor: swatchColor,
            border: "2px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.2)",
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <input
            ref={nativeInputRef}
            type="color"
            value={swatchColor}
            onChange={(e) => {
              onChange(e.target.value.toUpperCase());
              setHexInput(e.target.value.toUpperCase());
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              border: 'none',
              padding: 0,
            }}
          />
        </Box>
        <TextField
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={() => commitHex(hexInput)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitHex(hexInput);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="#3B82F6"
          hiddenLabel
          size="small"
          variant="filled"
          fullWidth
          InputProps={{ disableUnderline: true }}
          sx={{
            '& .MuiFilledInput-root': {
              bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)",
              borderRadius: '8px',
              height: 30,
            },
            '& .MuiFilledInput-input': {
              color: "var(--color-text-primary, #FFFFFF)",
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              height: 30,
              lineHeight: '30px',
              boxSizing: 'border-box',
              py: 0,
              px: 1.25,
            },
          }}
        />
      </Box>
    </Popover>
  );
};

export default ColorPickerPopover;
