import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBranding } from '../hooks/useBranding';
import { roundedFaviconDataUri } from '../utils/imageUpload';

export default function BrandingMetadata() {
  const { branding } = useBranding();
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pathname === '/portal' ? `Portal.${branding.name} | Administração` : branding.name;
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = roundedFaviconDataUri(branding.faviconData);
    favicon.type = 'image/svg+xml';
  }, [branding.name, branding.faviconData, pathname]);
  return null;
}
