import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Box, Button, Alert, Link, CircularProgress, Stack } from '@mui/material';
import { isAxiosError } from 'axios';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password, mfaRequired ? otpToken : undefined);

      if (result.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      navigate('/');
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data && (err.response.data.detail || err.response.data.message)) {
        setError(err.response.data.detail || err.response.data.message);
      } else {
        setError('Ocorreu um erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="login" busy={loading}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {!mfaRequired ? (
            <>
              <AuthField label="E-mail" type="email" placeholder="seu@email.com" autoComplete="username"
                value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} />
              <AuthField label="Senha" type="password" placeholder="Sua senha" autoComplete="current-password"
                value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} />
            </>
          ) : (
            <>
              <Alert severity="info" sx={{ borderRadius: '8px' }}>Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.</Alert>
              <AuthField key="otp" label="Código de autenticação" placeholder="000000" autoComplete="one-time-code"
                value={otpToken} onChange={(event) => setOtpToken(event.target.value)}
                inputProps={{ maxLength: 6, minLength: 6, pattern: '[0-9]{6}', inputMode: 'numeric' }}
                required autoFocus disabled={loading} />
            </>
          )}
        </Stack>
        <Button type="submit" fullWidth variant="contained" color="primary" size="large" disabled={loading}
          sx={{ mt: 4, height: 50, borderRadius: '8px', fontSize: '.95rem' }}>
          {loading ? <CircularProgress size={22} color="inherit" /> : mfaRequired ? 'Verificar código' : 'Entrar'}
        </Button>
      </Box>
      {mfaRequired && (
        <Box sx={{ mt: 2.5, textAlign: 'center' }}>
          <Link component="button" type="button" disabled={loading} variant="body2"
            onClick={() => { setMfaRequired(false); setOtpToken(''); setError(null); }}
            sx={{ color: 'text.secondary', textDecoration: 'none' }}>Voltar para credenciais</Link>
        </Box>
      )}
    </AuthLayout>
  );
};

export default Login;
