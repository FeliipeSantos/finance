import type { ReactNode } from 'react';
import { Box, Button, Dialog, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import { Add, Remove, Close, CalendarMonthOutlined, Language, Sync } from '@mui/icons-material';

const border = '1px solid var(--color-border)';
const secondary = 'var(--color-text-secondary, #7E8494)';

function SettingRow({ title, description, icon, children }: {
  title: string; description: string; icon: ReactNode; children: ReactNode;
}) {
  return (
    <Box role="group" aria-label={title} sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
      border, borderRadius: '8px', p: 1, minHeight: 50,
      bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.015)',
      '@media (max-width: 360px)': { flexWrap: 'wrap' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          width: 34, height: 34, borderRadius: '7px', border,
          bgcolor: 'rgba(109, 152, 255, 0.06)', color: '#819AFF', '& svg': { fontSize: 20 },
        }}>{icon}</Box>
        <Box>
          <Typography sx={{ fontSize: '0.76rem', fontWeight: 600 }}>{title}</Typography>
          <Typography sx={{ color: secondary, fontSize: '0.6rem', mt: 0.25 }}>{description}</Typography>
        </Box>
      </Box>
      {children}
    </Box>
  );
}

function Stepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max?: number; onChange: (value: number) => void;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', border, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
      <IconButton aria-label={`Diminuir ${label}`} disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        sx={{ width: 32, height: 32, borderRadius: 0, bgcolor: 'rgba(109, 152, 255, 0.06)', color: secondary }}>
        <Remove sx={{ fontSize: 17 }} />
      </IconButton>
      <Typography component="output" aria-label={label} aria-live="polite"
        sx={{ minWidth: 46, px: 0.5, textAlign: 'center', fontWeight: 600, fontSize: '0.8rem' }}>{value}</Typography>
      <IconButton aria-label={`Aumentar ${label}`} disabled={max !== undefined && value >= max}
        onClick={() => onChange(Math.min(max ?? Infinity, value + 1))}
        sx={{ width: 32, height: 32, borderRadius: 0, bgcolor: 'rgba(109, 152, 255, 0.06)', color: secondary }}>
        <Add sx={{ fontSize: 17 }} />
      </IconButton>
    </Box>
  );
}

export default function RepeatConfigDialog({ open, onClose, startInstallment, installmentsCount, periodicity,
  onStartInstallmentChange, onInstallmentsCountChange, onPeriodicityChange }: {
  open: boolean; onClose: () => void;
  startInstallment: number; installmentsCount: number; periodicity: string;
  onStartInstallmentChange: (value: number) => void;
  onInstallmentsCountChange: (value: number) => void;
  onPeriodicityChange: (value: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ 'aria-label': 'Configurar Repetição', sx: {
      width: 'calc(100% - 24px)', maxWidth: 400, m: 1.5, border, borderRadius: '12px',
      bgcolor: 'var(--color-panel, #111217)', color: 'var(--color-text-primary, #FFFFFF)', backgroundImage: 'none',
    } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderBottom: border }}>
        <IconButton aria-label="Fechar configuração de repetição" onClick={onClose}
          sx={{ width: 32, height: 32, border, borderRadius: '8px', color: 'inherit' }}>
          <Close sx={{ fontSize: 17 }} />
        </IconButton>
        <Typography component="h2" sx={{ flex: 1, fontSize: '0.9rem', fontWeight: 700 }}>Configurar Repetição</Typography>
        <Button variant="contained" onClick={onClose} sx={{
          borderRadius: '8px', px: 2, minHeight: 32, minWidth: 76, fontSize: '0.65rem', fontWeight: 600,
          textTransform: 'none', color: '#FFFFFF', bgcolor: '#24976B', backgroundImage: 'none', boxShadow: 'none',
          '&:hover': { bgcolor: '#1C8059', boxShadow: 'none' },
        }}>Concluir</Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
        <SettingRow title="Parcela inicial" description="Número da parcela de início" icon={<CalendarMonthOutlined />}>
          <Stepper label="parcela inicial" value={startInstallment} min={1} max={installmentsCount} onChange={onStartInstallmentChange} />
        </SettingRow>
        <SettingRow title="Quantidade" description="Total de parcelas" icon={<Language />}>
          <Stepper label="quantidade" value={installmentsCount} min={1} onChange={(value) => {
            onInstallmentsCountChange(value);
            if (startInstallment > value) onStartInstallmentChange(value);
          }} />
        </SettingRow>
        <SettingRow title="Periodicidade" description="Frequência de repetição" icon={<Sync sx={{ color: '#B579EF' }} />}>
          <TextField select value={periodicity} onChange={(event) => onPeriodicityChange(event.target.value)}
            size="small" SelectProps={{
              inputProps: { 'aria-label': 'Periodicidade' },
              MenuProps: {
                PaperProps: { sx: {
                  mt: 0.5, border, borderRadius: '8px',
                  bgcolor: 'var(--color-panel, #111217)', backgroundImage: 'none',
                  color: 'var(--color-text-primary, #FFFFFF)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
                } },
                MenuListProps: { sx: {
                  p: 0.5,
                  '& .MuiMenuItem-root': {
                    minHeight: 32, px: 1.25, py: 0.75, borderRadius: '5px',
                    fontSize: '0.65rem', fontWeight: 500, lineHeight: 1.5,
                    '&.Mui-selected': { bgcolor: 'rgba(var(--color-primary-rgb), 0.12)' },
                    '&:hover, &.Mui-focusVisible, &.Mui-selected:hover': { bgcolor: 'rgba(var(--color-primary-rgb), 0.18)' },
                  },
                } },
              },
            }}
            sx={{ width: 126, flexShrink: 0, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.65rem', fontWeight: 500, height: 34 },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.12)' } }}>
            <MenuItem value="mensal">Mensal</MenuItem>
            <MenuItem value="semanal">Semanal</MenuItem>
            <MenuItem value="quinzenal">Quinzenal</MenuItem>
            <MenuItem value="anual">Anual</MenuItem>
          </TextField>
        </SettingRow>
      </Box>
    </Dialog>
  );
}
