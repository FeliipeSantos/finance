import React, { useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { useAuth } from '../modules/auth/AuthContext';

const AVATAR_UPLOAD_SIZE = 256;

// Redimensiona/recorta a imagem escolhida num quadrado (cover), mantendo o
// data URI salvo pequeno independente do tamanho do arquivo original — mesma
// abordagem usada em BankPickerDialog para ícones de contas/cartões.
const resizeImageToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_UPLOAD_SIZE;
        canvas.height = AVATAR_UPLOAD_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas não suportado'));
          return;
        }
        const scale = Math.max(AVATAR_UPLOAD_SIZE / img.width, AVATAR_UPLOAD_SIZE / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        ctx.drawImage(img, (AVATAR_UPLOAD_SIZE - drawWidth) / 2, (AVATAR_UPLOAD_SIZE - drawHeight) / 2, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: string; message?: string } } }).response;
    // FastAPI's HTTPException serializes as {"detail": "..."} — "message" is
    // kept as a fallback in case a handler ever returns that shape instead.
    if (response?.data?.detail) return response.data.detail;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
};

const inputSx = {
  '& .MuiInputBase-root': { color: "var(--color-text-primary, #FFFFFF)" },
  '& .MuiInputLabel-root': { color: "var(--color-text-secondary, #7E8494)" },
  '& .MuiFilledInput-root': {
    bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)",
    borderRadius: '12px',
    '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" },
    '&.Mui-focused': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" },
  },
};

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ open, onClose }) => {
  const { user, updateProfile, changePassword } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(undefined);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Reinicializa o formulário com os dados atuais do usuário sempre que o
  // diálogo transiciona de fechado para aberto — ajuste feito durante o
  // render (não em um efeito) seguindo o padrão do próprio React para
  // "resetar estado quando uma prop muda".
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen && user) {
    setWasOpen(true);
    setFullName(user.fullName || '');
    setAvatarUrl(user.avatarUrl ?? null);
    setProfileError('');
    setProfileSuccess('');
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const initials = (user?.fullName ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Selecione um arquivo de imagem.');
      return;
    }
    try {
      const dataUri = await resizeImageToDataUri(file);
      setAvatarUrl(dataUri);
    } catch {
      setProfileError('Não foi possível processar a imagem selecionada.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);
    try {
      await updateProfile({ fullName, avatarUrl });
      setProfileSuccess('Perfil atualizado com sucesso.');
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Erro ao atualizar perfil.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação não coincide com a nova senha.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(getErrorMessage(err, 'Erro ao alterar senha.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "var(--color-panel, #13141B)",
          borderRadius: '12px',
          border: "1px solid var(--color-border)",
          boxShadow: "0px 10px 45px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.65)",
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" px={2.5} py={2} borderBottom="1px solid rgba(255,255,255,0.04)">
        <Typography sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '1.05rem' }}>
          Perfil
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "var(--color-text-secondary, #6F768E)" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Avatar */}
        <Box display="flex" justifyContent="center">
          <Box position="relative" width={96} height={96}>
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 96,
                height: 96,
                bgcolor: 'rgba(var(--color-primary-rgb),0.15)',
                color: 'var(--color-primary-text)',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {!avatarUrl && initials}
            </Avatar>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              title="Trocar foto de perfil"
              sx={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                bgcolor: 'var(--color-primary)',
                color: '#FFFFFF',
                width: 32,
                height: 32,
                border: "2px solid var(--color-panel, #13141B)",
                '&:hover': { bgcolor: 'var(--color-primary-dark)' },
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </Box>
        </Box>

        {/* Profile form */}
        <Box component="form" onSubmit={handleSaveProfile} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Nome"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            variant="filled"
            fullWidth
            required
            sx={inputSx}
          />
          <TextField
            label="E-mail"
            value={user?.email || ''}
            variant="filled"
            fullWidth
            disabled
            sx={inputSx}
          />

          {profileError && (
            <Typography variant="caption" sx={{ color: "var(--color-expense, #E05A5A)" }}>{profileError}</Typography>
          )}
          {profileSuccess && (
            <Typography variant="caption" sx={{ color: "var(--color-income, #4EBE87)" }}>{profileSuccess}</Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={savingProfile}
            sx={{
              bgcolor: 'var(--color-primary)',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              py: 1,
              '&:hover': { bgcolor: 'var(--color-primary-dark)' },
            }}
          >
            {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
          </Button>
        </Box>

        <Divider sx={{ borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)" }} />

        {/* Password section — collapsed behind a single toggle button */}
        {!showPasswordForm ? (
          <Button
            onClick={() => setShowPasswordForm(true)}
            variant="outlined"
            sx={{
              borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.15)",
              color: "var(--color-text-primary, #FFFFFF)",
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              py: 1,
              '&:hover': { borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.3)", bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)" },
            }}
          >
            Trocar senha
          </Button>
        ) : (
          <Box component="form" onSubmit={handleSavePassword} display="flex" flexDirection="column" gap={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>
                Trocar senha
              </Typography>
              <Typography
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                variant="caption"
                sx={{ color: "var(--color-text-secondary, #7E8494)", cursor: 'pointer', '&:hover': { color: "var(--color-text-primary, #FFFFFF)" } }}
              >
                Cancelar
              </Typography>
            </Box>
            <TextField
              label="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              variant="filled"
              fullWidth
              required
              sx={inputSx}
            />
            <TextField
              label="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              variant="filled"
              fullWidth
              required
              sx={inputSx}
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              variant="filled"
              fullWidth
              required
              sx={inputSx}
            />

            {passwordError && (
              <Typography variant="caption" sx={{ color: "var(--color-expense, #E05A5A)" }}>{passwordError}</Typography>
            )}
            {passwordSuccess && (
              <Typography variant="caption" sx={{ color: "var(--color-income, #4EBE87)" }}>{passwordSuccess}</Typography>
            )}

            <Button
              type="submit"
              variant="outlined"
              disabled={savingPassword}
              sx={{
                borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.15)",
                color: "var(--color-text-primary, #FFFFFF)",
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                py: 1,
                '&:hover': { borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.3)", bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)" },
              }}
            >
              {savingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default EditProfileDialog;
