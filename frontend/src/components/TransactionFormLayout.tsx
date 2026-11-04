import type { ReactNode } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import {
  DescriptionOutlined, GroupOutlined, EventOutlined, Repeat,
  LocalOfferOutlined, Percent, ChatOutlined, HelpOutline,
} from '@mui/icons-material';

const border = '1px solid var(--color-border)';
const secondary = 'var(--color-text-secondary, #7E8494)';

export const transactionPaperSx = {
  '--transaction-control-height': '38px',
  '--transaction-label-height': '18px',
  '--transaction-field-gap': '8px',
  '--transaction-panel-padding': '12px',
  borderRadius: "8px", bgcolor: 'var(--color-panel, #111217)', backgroundImage: 'none',
  border, color: 'var(--color-text-primary, #FFFFFF)',
  width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 32px)' }, maxWidth: 1000,
  m: { xs: 1.5, sm: 2 }, maxHeight: 'calc(100% - 24px)',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
  '& .MuiDialogContent-root': {
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
  },
  '& form': { display: 'flex', flexDirection: 'column', minHeight: 0 },
  '& .MuiFormLabel-asterisk': { display: 'none' },
  '@media (min-width: 600px) and (max-height: 740px)': {
    '--transaction-control-height': '32px',
    '--transaction-label-height': '16px',
    '--transaction-field-gap': '6px',
    '--transaction-panel-padding': '10px',
    '& [data-transaction-header]': {
      py: 1,
      '& .MuiTypography-h6': { fontSize: '1.2rem' },
      '& [data-transaction-type-icon]': { width: 36, height: 36 },
    },
    '& [data-transaction-content]': { p: 1.5 },
    '& [data-transaction-primary-fields]': { mb: 1 },
    '& [data-transaction-field-label]': { fontSize: '0.72rem' },
    '& [data-transaction-amount] input': { fontSize: '1.4rem' },
    '& [data-transaction-value-type] > div': { py: 0.5 },
  },
};

export const transactionContentSx = { p: { xs: 1.5, sm: 2 } };

export const transactionHeaderSx = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 1.5, px: { xs: 1.5, sm: 2 }, py: 1.25, flexShrink: 0,
  borderBottom: border,
};

export const transactionColumnsSx = {
  display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
  gap: 1.5,
};

export const transactionPanelSx = {
  display: 'flex', flexDirection: 'column', gap: 'var(--transaction-field-gap)', minWidth: 0,
  border, borderRadius: '10px', p: 'var(--transaction-panel-padding)',
  bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.012)',
};

export const transactionHeadingSx = { fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.4 };

const fieldIcons: Record<string, typeof DescriptionOutlined> = {
  'Descrição': DescriptionOutlined, 'Perfil': GroupOutlined,
  'Data de Efetivação': EventOutlined, 'Data de Vencimento': EventOutlined,
  'Fatura': EventOutlined, 'Recorrência': Repeat,
  'Tags': LocalOfferOutlined, 'Encargos': Percent, 'Observações': ChatOutlined,
};

export function TransactionField({ label, children, action }: {
  label: string; children: ReactNode; action?: ReactNode;
}) {
  const Icon = fieldIcons[label];
  const outside = ['Tags', 'Encargos', 'Observações'].includes(label);
  const icon = Icon && <Icon sx={{ fontSize: 23, color: secondary, flexShrink: 0 }} />;
  return (
    <Box role="group" aria-label={label} sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 'var(--transaction-label-height)', mb: 0.375 }}>
        <Typography data-transaction-field-label sx={{ color: secondary, fontSize: '0.75rem' }}>{label}</Typography>
        {action}
      </Box>
      <Box sx={{ display: 'flex', alignItems: label === 'Observações' ? 'flex-start' : 'center', gap: 1.5 }}>
        {outside && <Box sx={{ display: 'flex', pt: label === 'Observações' ? 0.75 : 0 }}>{icon}</Box>}
        <Box sx={{
          border, borderRadius: '9px', px: 1.25, minHeight: 'var(--transaction-control-height)',
          display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0,
          bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.025)',
          '&:focus-within': { borderColor: 'primary.main' },
          '& .MuiInputBase-root': { minWidth: 0 },
          '& .MuiSelect-select > .MuiBox-root': { minWidth: 0 },
          '& .MuiSelect-select .MuiTypography-root': { overflow: 'hidden', textOverflow: 'ellipsis' },
          '& textarea': { py: 0.5 },
        }}>
          {!outside && icon && <Box sx={{ display: 'flex', pr: label === 'Perfil' ? 1.25 : 0, borderRight: label === 'Perfil' ? border : undefined }}>{icon}</Box>}
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export function TransactionAmountField({ value, color, onChange }: {
  value: string; color: string; onChange: (value: string) => void;
}) {
  return (
    <Box data-transaction-amount>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 'var(--transaction-label-height)', mb: 0.375 }}>
        <Typography data-transaction-field-label sx={{ color: secondary, fontSize: '0.75rem' }}>Valor do lançamento</Typography>
        <HelpOutline sx={{ color: secondary, fontSize: 14 }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, border, borderRadius: '9px', px: 1.5, minHeight: 'var(--transaction-control-height)', bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.025)', '&:focus-within': { borderColor: 'primary.main' } }}>
        <Typography sx={{ fontSize: '1.2rem', borderRight: border, pr: 1.75 }}>R$</Typography>
        <TextField fullWidth required variant="standard" placeholder="0,00"
          value={value.replace(/^R\$\s*/, '')} onChange={(event) => onChange(event.target.value)}
          inputProps={{ 'aria-label': 'Valor do lançamento', inputMode: 'numeric' }}
          InputProps={{ disableUnderline: true }}
          sx={{ '& input': { color, py: 0, fontSize: '1.6rem', fontWeight: 800 } }} />
      </Box>
    </Box>
  );
}
