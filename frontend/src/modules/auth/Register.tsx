import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Box, Button, Alert, CircularProgress, Stack } from '@mui/material';
import { isAxiosError } from 'axios';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (!firstName.trim()) {
      setError('Informe seu nome');
      return;
    }

    setLoading(true);
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      await register(fullName, email, password);
      navigate('/');
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data && (err.response.data.detail || err.response.data.message)) {
        setError(err.response.data.detail || err.response.data.message);
      } else {
        setError('Ocorreu um erro ao criar a conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="register" busy={loading}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
            <AuthField label="Nome" placeholder="Nome" autoComplete="given-name"
              value={firstName} onChange={(event) => setFirstName(event.target.value)} required disabled={loading} />
            <AuthField label="Sobrenome" placeholder="Sobrenome" autoComplete="family-name"
              value={lastName} onChange={(event) => setLastName(event.target.value)} disabled={loading} />
          </Box>
          <AuthField label="E-mail" type="email" placeholder="seu@email.com" autoComplete="email"
            value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} />
          <AuthField label="Senha" type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password"
            inputProps={{ minLength: 6 }} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} />
        </Stack>
        <Button type="submit" fullWidth variant="contained" color="primary" size="large" disabled={loading}
          sx={{ mt: 2.5, height: 50, borderRadius: '8px', fontSize: '.95rem' }}>
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Criar conta'}
        </Button>
      </Box>
    </AuthLayout>
  );
};

export default Register;
