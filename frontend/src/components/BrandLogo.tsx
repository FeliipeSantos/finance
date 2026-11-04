import React from 'react';
import { useBranding } from '../hooks/useBranding';

interface BrandLogoProps {
  size?: number;
  imageData?: string | null;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, imageData }) => {
  const { branding } = useBranding();
  const icon = imageData === undefined ? branding.iconData : imageData;
  if (icon) return <img src={icon} alt={branding.name} width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0, borderRadius: '20%' }} />;
  return <img src="/platform-icon.png" alt={branding.name} width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0, borderRadius: '20%' }} />;
};

export default BrandLogo;
