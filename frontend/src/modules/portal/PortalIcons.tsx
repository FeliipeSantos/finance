import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Stack, Typography,
} from '@mui/material';
import { AddPhotoAlternateOutlined, DeleteOutline, ImageOutlined, Refresh } from '@mui/icons-material';
import { portalApi } from './portalApi';
import { resizeImageToDataUri } from '../../utils/imageUpload';

interface SharedIcon { id: string; imageData: string; createdAt: string }

export default function PortalIcons({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [icons, setIcons] = useState<SharedIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState('');
  const [fileName, setFileName] = useState('');
  const [removing, setRemoving] = useState<SharedIcon | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback((err: unknown) => {
    if (axios.isCancel(err)) return;
    if (axios.isAxiosError(err) && err.response?.status === 401) { onExpired(); return; }
    const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
    setError(typeof detail === 'string' ? detail : 'Não foi possível atualizar a biblioteca. Tente novamente.');
  }, [onExpired]);

  const load = useCallback((signal?: AbortSignal) => portalApi.get<SharedIcon[]>('/shared-icons', {
    headers: { Authorization: `Bearer ${token}` }, signal,
  }).then(({ data }) => setIcons(data)).catch(handleError).finally(() => {
    if (!signal?.aborted) setLoading(false);
  }), [token, handleError]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selectFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setSuccess('');
    if (!file.type.startsWith('image/')) { setError('Selecione um arquivo de imagem.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Selecione uma imagem de até 10 MB.'); return; }
    setBusy(true);
    try {
      setPreview(await resizeImageToDataUri(file));
      setFileName(file.name);
    } catch {
      setError('Não foi possível abrir essa imagem. Escolha outro arquivo.');
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await portalApi.post<SharedIcon>('/shared-icons', { imageData: preview }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIcons((previous) => previous.some((icon) => icon.id === data.id) ? previous : [...previous, data]);
      setPreview('');
      setSuccess('Ícone disponível para todos os usuários nos seletores de contas e cartões.');
    } catch (err) { handleError(err); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!removing || busy) return;
    setBusy(true);
    setError('');
    try {
      await portalApi.delete(`/shared-icons/${removing.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setIcons((previous) => previous.filter((icon) => icon.id !== removing.id));
      setRemoving(null);
      setSuccess('Ícone removido da biblioteca compartilhada.');
    } catch (err) { handleError(err); } finally { setBusy(false); }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), .07)", borderRadius: '12px' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5">Ícones compartilhados</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Imagens disponíveis para todos os usuários ao escolher o ícone de uma conta ou cartão.</Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center" flexShrink={0}>
          <Button startIcon={<Refresh />} disabled={loading || busy} onClick={() => { setLoading(true); setError(''); void load(); }}>Atualizar</Button>
          <Button variant="contained" startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <AddPhotoAlternateOutlined />} disabled={busy} onClick={() => inputRef.current?.click()}>Adicionar imagem</Button>
        </Stack>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Esta biblioteca é administrada pelo Portal e permanece disponível mesmo após resetar ou excluir uma conta.</Typography>
      {error && !preview && !removing && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
      {loading ? <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress aria-label="Carregando ícones" /></Box> : icons.length ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 2 }}>
          {icons.map((icon, index) => (
            <Box key={icon.id} sx={{ p: 2, bgcolor: 'var(--color-page, #0C0D12)', borderRadius: '12px', textAlign: 'center' }}>
              <Box component="img" src={icon.imageData} alt={`Ícone compartilhado ${index + 1}`} sx={{ width: 64, height: 64, objectFit: 'contain', borderRadius: '12px', mb: 1 }} />
              <Typography variant="caption" display="block" color="text.secondary">{new Date(icon.createdAt).toLocaleDateString('pt-BR')}</Typography>
              <Button size="small" color="error" startIcon={<DeleteOutline />} disabled={busy} aria-label={`Remover ícone compartilhado ${index + 1}`} onClick={() => { setRemoving(icon); setError(''); setSuccess(''); }}>Remover</Button>
            </Box>
          ))}
        </Box>
      ) : <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}><ImageOutlined sx={{ fontSize: 44, mb: 1 }} /><Typography>Nenhum ícone compartilhado cadastrado.</Typography><Typography variant="body2">Adicione a primeira imagem para disponibilizá-la a todos.</Typography></Box>}
      <input ref={inputRef} type="file" accept="image/*" aria-label="Selecionar imagem compartilhada" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void selectFile(file); }} />
      <Dialog open={Boolean(preview)} onClose={() => { if (!busy) setPreview(''); }} fullWidth maxWidth="xs" aria-labelledby="shared-icon-upload-title">
        <DialogTitle id="shared-icon-upload-title">Adicionar ícone compartilhado</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {preview && <Box component="img" src={preview} alt="Prévia da imagem selecionada" sx={{ width: 128, height: 128, display: 'block', mx: 'auto', mb: 2, borderRadius: '12px' }} />}
          <Typography sx={{ overflowWrap: 'anywhere', mb: 1 }}>{fileName}</Typography>
          <Typography color="text.secondary">Todos os usuários poderão selecionar esta imagem para suas contas e cartões.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}><Button disabled={busy} onClick={() => setPreview('')}>Cancelar</Button><Button disabled={busy} variant="contained" onClick={() => void save()}>{busy ? 'Salvando…' : 'Adicionar à biblioteca'}</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(removing)} onClose={() => { if (!busy) setRemoving(null); }} fullWidth maxWidth="xs" aria-labelledby="shared-icon-delete-title">
        <DialogTitle id="shared-icon-delete-title">Remover ícone compartilhado?</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {removing && <Box component="img" src={removing.imageData} alt="Ícone a remover" sx={{ width: 80, height: 80, display: 'block', mx: 'auto', mb: 2 }} />}
          <Typography>O ícone deixará de aparecer na biblioteca de todos os usuários. As imagens já aplicadas às contas e cartões serão mantidas.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}><Button disabled={busy} onClick={() => setRemoving(null)}>Cancelar</Button><Button color="error" variant="contained" disabled={busy} onClick={() => void remove()}>{busy ? 'Removendo…' : 'Remover da biblioteca'}</Button></DialogActions>
      </Dialog>
    </Paper>
  );
}
