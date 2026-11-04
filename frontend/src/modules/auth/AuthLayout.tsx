import type { ReactNode } from 'react';
import { Box, Link, Paper, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { useBranding } from '../../hooks/useBranding';

export default function AuthLayout({ mode, busy, children }: {
  mode: 'login' | 'register' | 'portal';
  busy: boolean;
  children: ReactNode;
}) {
  const isPortal = mode === 'portal';
  const { branding } = useBranding();
  return (
    <Box component="main" sx={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: "var(--color-page, #0F1016)", px: 2, py: { xs: 3, sm: 5 },
    }}>
      <Box sx={{ width: '100%', maxWidth: 560 }}>
        <Paper sx={{
          p: { xs: 2.5, sm: '30px' }, bgcolor: "var(--color-panel, #171821)", borderRadius: '12px',
          border: "1px solid var(--color-border)", boxShadow: "var(--shadow-panel)",
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2.5 }}>
            <Box sx={{ display: 'flex', flexShrink: 0 }}><BrandLogo size={60} /></Box>
            <Typography component="h1" sx={{
              fontWeight: 800, fontSize: isPortal ? { xs: '1.3rem', sm: '1.9rem' } : { xs: '1.85rem', sm: '2.25rem' }, letterSpacing: '-.035em',
              color: 'text.primary',
              minWidth: 0, overflowWrap: 'anywhere',
            }}>{isPortal ? `Portal.${branding.name}` : branding.name}</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', fontSize: '.92rem', mb: 3.5 }}>
            {isPortal ? `Gerencie as contas e a identidade da plataforma ${branding.name}` : 'Gerencie suas finanças pessoais de forma simples e eficiente'}
          </Typography>
          {isPortal ? (
            <Box sx={{ p: '5px', bgcolor: "var(--color-surface-raised, #1D1E26)", borderRadius: '8px', mb: 3 }}>
              <Typography component="h2" sx={{ py: 1.25, bgcolor: "var(--color-page, #0F1016)", borderRadius: "5px", textAlign: 'center', fontSize: '.9rem', fontWeight: 600 }}>Acesso administrativo</Typography>
            </Box>
          ) : <Tabs value={mode} variant="fullWidth" aria-label={`Acesso ao ${branding.name}`} sx={{
            minHeight: 50, p: '5px', bgcolor: "var(--color-surface-raised, #1D1E26)", borderRadius: '8px', mb: 3,
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': { minHeight: 40, p: 1, textTransform: 'none', fontWeight: 600, color: 'text.secondary', borderRadius: '8px' },
            '& .MuiTab-root.Mui-selected': { color: 'text.primary', bgcolor: "var(--color-page, #0F1016)" },
            '& .MuiTab-root.Mui-focusVisible': { outline: '2px solid var(--color-primary)', outlineOffset: -2 },
          }}>
            <Tab component={RouterLink} to="/login" value="login" label="Entrar" disabled={busy} />
            <Tab component={RouterLink} to="/register" value="register" label="Criar conta" disabled={busy} />
          </Tabs>}
          {children}
        </Paper>
        <Box sx={{ textAlign: 'center', mt: 2.5 }}>
          <Link component={RouterLink} to={isPortal ? '/login' : '/portal'} underline="hover" sx={{ color: 'text.secondary', fontSize: '.8rem' }}>{isPortal ? `Voltar ao ${branding.name}` : `Portal.${branding.name}`}</Link>
        </Box>
      </Box>
    </Box>
  );
}
