import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Container, Dialog,
  DialogActions, DialogContent, DialogTitle, InputAdornment, Link,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography, Tabs, Tab,
} from '@mui/material';
import {
  DeleteOutline, GroupsOutlined, KeyOutlined,
  Logout, Refresh, RestartAlt, Search, ShieldOutlined,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import PortalIcons from './PortalIcons';
import PortalBranding from './PortalBranding';
import BrandLogo from '../../components/BrandLogo';
import { useBranding } from '../../hooks/useBranding';
import { portalApi } from './portalApi';
import AuthLayout from '../auth/AuthLayout';
import AuthField from '../auth/AuthField';

// The portal session is separate from the customer's Finance session.
const sessionKey = 'finance.portal.token';

interface PortalUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  mfaEnabled: boolean;
  accountsCount: number;
  cardsCount: number;
  transactionsCount: number;
}

const panelSx = { bgcolor: "var(--color-panel, #15161D)", border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), .07)", borderRadius: '12px' };

function errorMessage(error: unknown, fallback: string) {
  const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
  return typeof detail === 'string' ? detail : fallback;
}

export default function PortalPage() {
  const { branding } = useBranding();
  const [token, setToken] = useState(() => sessionStorage.getItem(sessionKey));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(Boolean(token));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [action, setAction] = useState<{ type: 'reset' | 'delete' | 'password'; user: PortalUser } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [actionError, setActionError] = useState('');
  const [tab, setTab] = useState<'accounts' | 'icons' | 'branding'>('accounts');

  const logout = useCallback(() => {
    sessionStorage.removeItem(sessionKey);
    setToken(null);
    setUsers([]);
    setAction(null);
    setSuccess('');
    setPassword('');
    setTab('accounts');
  }, []);

  const onExpired = useCallback(() => {
    logout();
    setError('Sua sessão expirou. Entre novamente no portal.');
  }, [logout]);

  const loadUsers = useCallback((signal?: AbortSignal) => {
    if (!token) return;
    return portalApi.get<PortalUser[]>('/users', {
      headers: { Authorization: `Bearer ${token}` }, signal,
    }).then((response) => {
      setUsers(response.data);
    }).catch((err: unknown) => {
      if (axios.isCancel(err)) return;
      if (axios.isAxiosError(err) && err.response?.status === 401) logout();
      setError(errorMessage(err, 'Não foi possível carregar as contas. Tente atualizar a lista.'));
    }).finally(() => {
      if (!signal?.aborted) setLoading(false);
    });
  }, [token, logout]);

  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await portalApi.post<{ token: string }>('/login', { username, password });
      sessionStorage.setItem(sessionKey, response.data.token);
      setLoading(true);
      setToken(response.data.token);
      setPassword('');
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setBusy(false);
    }
  };

  const executeAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!action || confirmation.trim() !== action.user.email || busy
      || (action.type === 'password' && (newPassword.length < 6 || newPassword !== confirmNewPassword))) return;
    setBusy(true);
    setActionError('');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const data = action.type === 'password'
      ? { confirmationEmail: confirmation.trim(), newPassword }
      : { confirmationEmail: confirmation.trim() };
    try {
      const response = action.type === 'reset'
        ? await portalApi.post(`/users/${action.user.id}/reset`, data, config)
        : action.type === 'password'
          ? await portalApi.post(`/users/${action.user.id}/password`, data, config)
          : await portalApi.delete(`/users/${action.user.id}`, { ...config, data });
      setAction(null);
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccess(response.data.message);
      setLoading(true);
      setError('');
      await loadUsers();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
        setError('Sua sessão expirou. Entre novamente no portal.');
      } else {
        setActionError(errorMessage(err, 'Não foi possível concluir a ação. Tente novamente.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const filtered = users.filter((user) => `${user.fullName} ${user.email}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR').trim()));
  const brand = (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <BrandLogo size={38} />
      <Typography fontWeight={800} fontSize={{ xs: 18, sm: 22 }} sx={{ overflowWrap: 'anywhere' }}>Portal<Box component="span" sx={{ color: '#60A5FA' }}>.{branding.name}</Box></Typography>
    </Stack>
  );

  if (!token) return (
    <AuthLayout mode="portal" busy={busy}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}
      <Box component="form" onSubmit={login}>
        <Stack spacing={3}>
          <AuthField label="Usuário" placeholder="Seu usuário" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required disabled={busy} />
          <AuthField label="Senha" type="password" placeholder="Sua senha" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} />
        </Stack>
        <Button type="submit" fullWidth variant="contained" size="large" disabled={busy}
          sx={{ mt: 4, height: 50, borderRadius: '8px', fontSize: '.95rem' }}>
          {busy ? <CircularProgress size={22} color="inherit" /> : 'Entrar no portal'}
        </Button>
      </Box>
    </AuthLayout>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--color-page, #0C0D12)', color: 'text.primary' }}>
      <Box component="header" sx={{ borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), .07)" }}>
        <Container maxWidth="xl" sx={{ py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          {brand}
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip icon={<ShieldOutlined />} label="Administrador" variant="outlined" />
            <Button startIcon={<Logout />} onClick={() => { logout(); setError(''); }} disabled={busy} sx={{ color: 'text.secondary' }}>Sair</Button>
          </Stack>
        </Container>
      </Box>
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="overline" sx={{ color: '#60A5FA', letterSpacing: 2 }}>ADMINISTRAÇÃO</Typography>
            <Typography variant="h3" sx={{ my: 1 }}>Gerenciador de contas</Typography>
            <Typography color="text.secondary">Gerencie os usuários, os ícones compartilhados e a identidade da plataforma {branding.name}.</Typography>
          </Box>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => { setLoading(true); setError(''); void loadUsers(); }} disabled={loading || busy}>Atualizar lista</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 3 }}>{success}</Alert>}
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Seções do portal" sx={{ mb: 3 }}>
          <Tab value="accounts" label="Contas" id="portal-accounts-tab" aria-controls="portal-accounts-panel" />
          <Tab value="icons" label="Ícones compartilhados" id="portal-icons-tab" aria-controls="portal-icons-panel" />
          <Tab value="branding" label="Plataforma" id="portal-branding-tab" aria-controls="portal-branding-panel" />
        </Tabs>
        {tab === 'branding' ? <Box role="tabpanel" id="portal-branding-panel" aria-labelledby="portal-branding-tab"><PortalBranding token={token} onExpired={onExpired} /></Box> : tab === 'icons' ? <Box role="tabpanel" id="portal-icons-panel" aria-labelledby="portal-icons-tab"><PortalIcons token={token} onExpired={onExpired} /></Box> : <Box role="tabpanel" id="portal-accounts-panel" aria-labelledby="portal-accounts-tab">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
          <Paper sx={{ ...panelSx, p: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Avatar variant="rounded" sx={{ bgcolor: '#60A5FA16', color: '#60A5FA', width: 48, height: 48 }}><GroupsOutlined /></Avatar>
            <Box><Typography color="text.secondary" variant="body2">Contas cadastradas</Typography><Typography variant="h4" sx={{ mt: .5 }}>{loading ? '—' : users.length.toLocaleString('pt-BR')}</Typography></Box>
          </Paper>
        </Box>
        <Paper sx={{ ...panelSx, overflow: 'hidden' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2} sx={{ p: 3 }}>
            <Typography variant="h6">Todas as contas <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>({filtered.length})</Box></Typography>
            <TextField size="small" placeholder="Buscar por nome ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ width: { xs: '100%', sm: 340 } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Buscar contas' } }} />
          </Stack>
          <TableContainer>
            <Table aria-label="Contas cadastradas" sx={{ minWidth: 850 }}>
              <TableHead sx={{ bgcolor: '#FFFFFF03' }}><TableRow>
                {['Usuário', 'Cadastro', 'Contas', 'Cartões', 'Lançamentos', 'Ações'].map((label) => <TableCell key={label} sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{label}</TableCell>)}
              </TableRow></TableHead>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={28} aria-label="Carregando contas" /></TableCell></TableRow> : filtered.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell><Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: '#3B82F619', color: '#93BBFC' }}>{user.fullName.charAt(0).toUpperCase()}</Avatar>
                      <Box><Typography fontWeight={600}>{user.fullName}</Typography><Typography variant="body2" color="text.secondary">{user.email}</Typography>{user.mfaEnabled && <Chip label="MFA ativo" size="small" sx={{ mt: .5, height: 20 }} />}</Box>
                    </Stack></TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{user.accountsCount}</TableCell><TableCell>{user.cardsCount}</TableCell><TableCell>{user.transactionsCount}</TableCell>
                    <TableCell><Stack direction="row" spacing={1}>
                      <Button size="small" startIcon={<RestartAlt />} aria-label={`Resetar dados de ${user.email}`} disabled={busy} onClick={() => { setAction({ type: 'reset', user }); setConfirmation(''); setActionError(''); }}>Resetar</Button>
                      <Button size="small" startIcon={<KeyOutlined />} aria-label={`Redefinir senha de ${user.email}`} disabled={busy} onClick={() => { setAction({ type: 'password', user }); setConfirmation(''); setNewPassword(''); setConfirmNewPassword(''); setActionError(''); }}>Redefinir senha</Button>
                      <Button size="small" color="error" startIcon={<DeleteOutline />} aria-label={`Excluir conta de ${user.email}`} disabled={busy} onClick={() => { setAction({ type: 'delete', user }); setConfirmation(''); setActionError(''); }}>Excluir</Button>
                    </Stack></TableCell>
                  </TableRow>
                ))}
                {!loading && !filtered.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>{search ? 'Nenhuma conta encontrada para essa busca.' : 'Nenhuma conta cadastrada.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        </Box>}
        <Link component={RouterLink} to="/" sx={{ display: 'inline-block', mt: 3, color: 'text.secondary' }}>Abrir {branding.name}</Link>
      </Container>
      <Dialog open={Boolean(action)} onClose={() => { if (!busy) setAction(null); }} fullWidth maxWidth="sm" aria-labelledby="portal-action-title">
        <Box component="form" onSubmit={executeAction}>
          <DialogTitle id="portal-action-title">{action?.type === 'reset' ? 'Resetar dados financeiros' : action?.type === 'password' ? 'Redefinir senha' : 'Excluir conta'}</DialogTitle>
          <DialogContent>
            <Typography fontWeight={700}>{action?.user.fullName}</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>{action?.user.email}</Typography>
            <Alert severity={action?.type === 'reset' ? 'warning' : action?.type === 'password' ? 'info' : 'error'} sx={{ mb: 3 }}>
              {action?.type === 'reset'
                ? 'Os lançamentos, contas financeiras, cartões e demais dados financeiros serão apagados. As categorias padrão serão restauradas. O perfil, a senha e o MFA serão mantidos. Esta ação não pode ser desfeita.'
                : action?.type === 'password'
                  ? 'Defina uma nova senha para esta conta. O usuário poderá entrar com a nova senha sem precisar informar a senha antiga.'
                  : `O usuário e todos os seus dados serão excluídos. Ele perderá o acesso ao ${branding.name}. Esta ação não pode ser desfeita.`}
            </Alert>
            {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
            {action?.type === 'password' && <Stack spacing={2} sx={{ mb: 2 }}>
              <TextField fullWidth autoFocus label="Nova senha" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={busy} autoComplete="new-password" inputProps={{ minLength: 6, maxLength: 128 }} helperText="Mínimo de 6 caracteres" required />
              <TextField fullWidth label="Confirmar nova senha" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} disabled={busy} autoComplete="new-password" error={Boolean(confirmNewPassword && newPassword !== confirmNewPassword)} helperText={confirmNewPassword && newPassword !== confirmNewPassword ? 'As senhas não coincidem.' : undefined} inputProps={{ minLength: 6, maxLength: 128 }} required />
            </Stack>}
            <TextField fullWidth autoFocus={action?.type !== 'password'} label="Digite o e-mail da conta para confirmar" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" required />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setAction(null)} disabled={busy}>Cancelar</Button>
            <Button type="submit" variant="contained" color={action?.type === 'reset' ? 'warning' : action?.type === 'password' ? 'primary' : 'error'} disabled={busy || confirmation.trim() !== action?.user.email || (action?.type === 'password' && (newPassword.length < 6 || newPassword !== confirmNewPassword))} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>{action?.type === 'reset' ? 'Resetar dados' : action?.type === 'password' ? 'Salvar nova senha' : 'Excluir definitivamente'}</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
