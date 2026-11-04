import { Box, ButtonBase, Dialog, Typography } from '@mui/material';
import { Sync, CalendarTodayOutlined, Autorenew } from '@mui/icons-material';

const options = [
  { value: 'NP', label: 'Não recorrente', description: 'Lançamento único, sem repetição', icon: Sync, color: '#6D98FF' },
  { value: 'PARCELADA', label: 'Parcelar ou repetir', description: 'Divida em parcelas ou repita automaticamente', icon: CalendarTodayOutlined, color: '#A477F5' },
  { value: 'FIXA', label: 'Fixa mensal', description: 'Repete todo mês na mesma data', icon: Autorenew, color: '#43CDA8' },
] as const;

type RecurrenceType = typeof options[number]['value'];

export default function RecurrenceDialog({ open, value, onClose, onSelect }: {
  open: boolean;
  value: RecurrenceType;
  onClose: () => void;
  onSelect: (value: RecurrenceType) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}
      PaperProps={{ 'aria-label': 'Recorrência', sx: {
        width: 'calc(100% - 32px)', maxWidth: 328, m: 2, p: 1,
        borderRadius: '12px', bgcolor: 'var(--color-panel, #111217)', backgroundImage: 'none',
        color: 'var(--color-text-primary, #FFFFFF)',
      } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {options.map(({ value: optionValue, label, description, icon: Icon, color }) => {
          const selected = value === optionValue;
          return (
            <ButtonBase key={optionValue} onClick={() => onSelect(optionValue)} aria-pressed={selected}
              sx={{
                display: 'flex', justifyContent: 'flex-start', gap: 1.5, px: 1, py: 1,
                minHeight: 56, width: '100%', borderRadius: '9px', textAlign: 'left',
                border: '1px solid', borderColor: selected ? `${color}40` : 'transparent',
                bgcolor: selected ? `${color}16` : 'transparent',
                '&:hover': { bgcolor: `${color}20` },
                '&.Mui-focusVisible': { outline: '2px solid', outlineColor: color, outlineOffset: -2 },
              }}>
              <Box sx={{
                width: 36, height: 36, flexShrink: 0, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: `${color}12`, border: `1px solid ${color}26`, color,
              }}>
                <Icon sx={{ fontSize: 20 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.5 }}>{label}</Typography>
                <Typography sx={{ fontSize: '0.66rem', lineHeight: 1.5, mt: 0.125, color: 'var(--color-text-secondary, #7E8494)' }}>{description}</Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Dialog>
  );
}
