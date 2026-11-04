import { Box } from '@mui/material';
import { AccountBalance } from '@mui/icons-material';
import { useState } from 'react';
import { normalizeBankId, renderBankLogoSvg } from '../utils/bankIcons';

interface BankLogoProps {
  icon?: string | null;
  customIconUrl?: string | null;
  name: string;
  color?: string;
  size?: number;
}

export default function BankLogo({ icon, customIconUrl, name, color = '#7E8494', size = 24 }: BankLogoProps) {
  const normalizedIcon = normalizeBankId(icon || 'generic');
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const showCustomImage = normalizedIcon === 'custom' && customIconUrl && customIconUrl !== failedImage;

  return (
    <Box
      role="img"
      aria-label={`Logo de ${name}`}
      sx={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', '& > svg': { display: 'block', width: '100%', height: '100%' } }}
    >
      {showCustomImage ? (
        <Box component="img" src={customIconUrl} alt="" onError={() => setFailedImage(customIconUrl)} sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      ) : normalizedIcon === 'bank' ? (
        <Box sx={{ width: '100%', height: '100%', bgcolor: `${color}15`, color, border: `1px solid ${color}25`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AccountBalance sx={{ fontSize: size * 0.6 }} />
        </Box>
      ) : (
        renderBankLogoSvg(normalizedIcon, size)
      )}
    </Box>
  );
}
