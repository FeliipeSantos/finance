import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { brandingQueryKey, useBranding } from '../../hooks/useBranding';
import type { BrandingSettings } from '../../hooks/useBranding';
import { resizeImageToDataUri, roundedFaviconDataUri } from '../../utils/imageUpload';
import { portalApi } from './portalApi';
import BrandLogo from '../../components/BrandLogo';

interface Props { token: string; onExpired: () => void }

export default function PortalBranding(props: Props) {
  const query = useBranding();
  if (query.isPending) return <CircularProgress aria-label="Carregando identidade da plataforma" />;
  if (query.isError) return <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Tentar novamente</Button>}>Não foi possível carregar a identidade da plataforma.</Alert>;
  return <BrandingForm {...props} initial={query.branding} />;
}

function BrandingForm({ token, onExpired, initial }: Props & { initial: BrandingSettings }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectImage = async (field: 'iconData' | 'faviconData', file?: File) => {
    if (!file || busy) return;
    setError('');
    setSuccess('');
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(file.type)) {
      setError('Selecione uma imagem PNG, JPEG, WebP ou ICO.'); return;
    }
    if (file.size > 10 * 1024 * 1024) { setError('Selecione uma imagem de até 10 MB.'); return; }
    setBusy(true);
    try {
      const data = await resizeImageToDataUri(file, 'contain', true);
      setDraft((previous) => ({ ...previous, [field]: data }));
    } catch { setError('Não foi possível abrir essa imagem. Escolha outro arquivo.'); }
    finally { setBusy(false); }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await portalApi.put<BrandingSettings>('/branding', draft, { headers: { Authorization: `Bearer ${token}` } });
      await queryClient.cancelQueries({ queryKey: brandingQueryKey });
      queryClient.setQueryData(brandingQueryKey, data);
      setDraft(data);
      setSuccess('Identidade da plataforma atualizada para todos os usuários.');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) { onExpired(); return; }
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Não foi possível salvar. Tente novamente.');
    } finally { setBusy(false); }
  };

  return (
    <Paper component="form" onSubmit={save} sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px', border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), .07)" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5">Identidade da plataforma</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Personalize o nome e as imagens exibidos para todos os usuários.</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        <TextField label="Nome da plataforma" placeholder="Finance" value={draft.name} disabled={busy}
          onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setSuccess(''); }}
          inputProps={{ maxLength: 80 }} helperText="Se ficar vazio, o nome padrão será Finance." fullWidth />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          {(['iconData', 'faviconData'] as const).map((field) => {
            const label = field === 'iconData' ? 'Ícone da plataforma' : 'Favicon';
            return <Box key={field} sx={{ flex: 1, minWidth: 0, p: 2.5, border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), .12)", borderRadius: '12px' }}>
              <Typography fontWeight={700}>{label}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{field === 'iconData' ? 'Exibido no login, no portal e no menu.' : 'Exibido na aba do navegador.'}</Typography>
              <Box sx={{ my: 2, height: 80, display: 'flex', alignItems: 'center' }}>
                {field === 'iconData' ? <BrandLogo size={64} imageData={draft.iconData} /> : <Box component="img" src={roundedFaviconDataUri(draft.faviconData)} alt="Prévia: Favicon" sx={{ width: 32, height: 32, objectFit: 'contain', borderRadius: '20%' }} />}
              </Box>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button component="label" variant="outlined" disabled={busy}>
                  {draft[field] ? 'Trocar imagem' : 'Adicionar imagem'}
                  <input type="file" hidden aria-label={label} accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico" disabled={busy}
                    onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void selectImage(field, file); }} />
                </Button>
                <Button disabled={busy || !draft[field]} onClick={() => { setDraft({ ...draft, [field]: null }); setSuccess(''); }}>Usar padrão</Button>
              </Stack>
            </Box>;
          })}
        </Stack>
        <Typography variant="body2" color="text.secondary">PNG, JPEG, WebP ou ICO, até 10 MB. Sem imagem personalizada, será usado o ícone padrão.</Typography>
        <Box><Button type="submit" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}>Salvar alterações</Button></Box>
      </Stack>
    </Paper>
  );
}
