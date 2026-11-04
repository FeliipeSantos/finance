import { useQuery } from '@tanstack/react-query';
import { portalApi } from '../modules/portal/portalApi';

export interface BrandingSettings {
  name: string;
  iconData: string | null;
  faviconData: string | null;
}

export const defaultBranding: BrandingSettings = { name: 'Finance', iconData: null, faviconData: null };
export const brandingQueryKey = ['platform-branding'];

export function useBranding() {
  const query = useQuery({
    queryKey: brandingQueryKey,
    queryFn: async ({ signal }) => (await portalApi.get<BrandingSettings>('/branding', { signal })).data,
    staleTime: 30_000,
  });
  return { ...query, branding: query.data ?? defaultBranding };
}
