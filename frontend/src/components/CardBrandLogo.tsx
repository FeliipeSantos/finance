import { Box, Typography } from '@mui/material';
import { CreditCard as CardIcon } from '@mui/icons-material';

export default function CardBrandLogo({ brand }: { brand: string }) {
  const cleanBrand = (brand || '').trim().toUpperCase();
  if (cleanBrand === 'MASTERCARD') {
    return (
      <svg role="img" aria-label="Mastercard" width="32" height="20" viewBox="0 0 32 20" style={{ display: 'block', flexShrink: 0 }}>
        <circle cx="10.5" cy="10" r="9" fill="#EB001B" />
        <circle cx="21.5" cy="10" r="9" fill="#F79E1B" />
        <path d="M16 2.876A9 9 0 0 1 16 17.124A9 9 0 0 1 16 2.876Z" fill="#FF5F00" />
      </svg>
    );
  }
  if (cleanBrand === 'VISA') {
    return (
      <Box sx={{ bgcolor: '#1A1F71', width: 32, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
        <Typography sx={{ color: '#FFFFFF', fontWeight: 900, fontStyle: 'italic', fontSize: '0.75rem', letterSpacing: '0.02em' }}>
          VISA
        </Typography>
      </Box>
    );
  }
  if (cleanBrand === 'DINERS') {
    return (
      <Box sx={{ bgcolor: '#0079C1', width: 32, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
        <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem' }}>D</Typography>
      </Box>
    );
  }
  if (cleanBrand === 'AMEX') {
    return (
      <Box sx={{ bgcolor: '#0070CD', width: 32, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
        <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.01em' }}>AMEX</Typography>
      </Box>
    );
  }
  if (cleanBrand === 'ELO') {
    return (
      <Box sx={{ bgcolor: '#000000', width: 32, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem' }}>elo</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ bgcolor: 'var(--color-primary)', width: 32, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
      <CardIcon sx={{ color: '#FFFFFF', fontSize: '0.75rem' }} />
    </Box>
  );
};
