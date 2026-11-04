import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import {
  AppBar,
  Avatar,
  Box,
  CssBaseline,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import EditProfileDialog from './EditProfileDialog';

const BG = "var(--color-page, #0F1016)";
const APPBAR_HEIGHT = 68;
const TEXT_MUTED = "var(--color-text-secondary, #6F768E)";

interface AddMenuOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  onClick: () => void;
}

interface FocusedLayoutProps {
  title: string;
  children: React.ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showMonthNav?: boolean;
  monthLabel?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onAdd?: () => void;
  addMenuOptions?: AddMenuOption[];
}

// Tela cheia acessada a partir de um indicador do Resumo (Receitas, Despesas,
// Transferências, Contas, Faturas) — mesmo AppBar/Toolbar do Layout global
// (mesmas cores, altura e alinhamento à direita), só que sem sidebar e com
// voltar + título no lugar do menu/logo. Isso é o que garante o mesmo padrão
// visual do resto do sistema em vez de um cabeçalho inventado à parte.
const FocusedLayout: React.FC<FocusedLayoutProps> = ({
  title,
  children,
  showSearch,
  searchValue,
  onSearchChange,
  showMonthNav,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onAdd,
  addMenuOptions,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

  // O rodapé fixo de algumas telas (ex.: Contas, Transações) usa essa
  // variável para não ficar por baixo da sidebar — aqui não há sidebar, então
  // fica só uma margem pequena e consistente com o resto do layout.
  useEffect(() => {
    const previous = document.documentElement.style.getPropertyValue('--total-sidebar-width');
    document.documentElement.style.setProperty('--total-sidebar-width', '16px');
    return () => { document.documentElement.style.setProperty('--total-sidebar-width', previous); };
  }, []);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          left: 0,
          width: '100%',
          bgcolor: BG,
          borderBottom: "1px solid var(--color-border)",
          boxShadow: 'none',
          zIndex: 1200,
        }}
      >
        <Toolbar sx={{ minHeight: `${APPBAR_HEIGHT}px !important`, px: { xs: 2, md: 3 }, gap: 2 }}>
          <IconButton aria-label="Voltar ao resumo" onClick={() => navigate(-1)} sx={{ color: "var(--color-text-primary, #FFFFFF)" }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: "var(--color-text-primary, #FFFFFF)", mr: 1, whiteSpace: 'nowrap' }}>
            {title}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {showSearch && (
            <TextField
              size="small"
              placeholder="Pesquisar"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: TEXT_MUTED }} fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchValue ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => onSearchChange?.('')}>
                      <CloseIcon fontSize="small" sx={{ color: TEXT_MUTED }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
              sx={{
                mr: 1.5,
                minWidth: 190,
                maxWidth: 340,
                bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)",
                borderRadius: '8px',
                '& .MuiOutlinedInput-root': { borderRadius: '8px' },
                '& fieldset': { border: "1px solid var(--color-border)" },
              }}
            />
          )}

          {showMonthNav && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)",
                borderRadius: '8px',
                px: 0.5,
                py: 0.25,
                gap: 0.5,
                border: "1px solid var(--color-border)",
                mr: 1.5,
              }}
            >
              <IconButton size="small" onClick={onPrevMonth} sx={{ color: TEXT_MUTED, p: 0.5 }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, px: 1, color: "var(--color-text-primary, #FFFFFF)", minWidth: 60, textAlign: 'center' }}>
                {monthLabel}
              </Typography>
              <IconButton size="small" onClick={onNextMonth} sx={{ color: TEXT_MUTED, p: 0.5 }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {addMenuOptions && addMenuOptions.length > 0 ? (
            <>
              <Tooltip title="Adicionar">
                <IconButton
                  onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                  sx={{ color: '#FFFFFF', bgcolor: 'var(--color-primary)', borderRadius: "50%", width: 36, height: 36, '&:hover': { bgcolor: 'var(--color-primary-dark)' }, mr: { xs: 0, sm: 1.5 } }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={() => setAddMenuAnchor(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{ sx: { mt: 1.5, minWidth: 230, borderRadius: '12px', bgcolor: "var(--color-panel, #13141B)", border: "1px solid var(--color-border)", boxShadow: "0px 10px 45px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.65)", p: 0.75 } }}>
                {addMenuOptions.map((option) => (
                  <MenuItem key={option.key} onClick={() => { setAddMenuAnchor(null); option.onClick(); }}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, px: 2, borderRadius: '12px', color: "var(--color-text-primary, #FFFFFF)", '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.04)" } }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: "50%", bgcolor: "var(--color-surface-raised, #1E1F28)", display: 'flex', alignItems: 'center', justifyContent: 'center', color: option.iconColor }}>{option.icon}</Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}>{option.label}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : onAdd && (
            <Tooltip title="Adicionar">
              <IconButton
                onClick={onAdd}
                sx={{ color: '#FFFFFF', bgcolor: 'var(--color-primary)', borderRadius: "50%", width: 36, height: 36, '&:hover': { bgcolor: 'var(--color-primary-dark)' }, mr: { xs: 0, sm: 1.5 } }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)",
                border: "1px solid var(--color-border)",
                '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)" },
              }}
            >
              {user?.avatarUrl && (
                <Avatar src={user.avatarUrl} sx={{ width: 24, height: 24, flexShrink: 0 }} />
              )}
              <Typography variant="body2" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.825rem', display: { xs: 'none', sm: 'block' } }}>
                {user?.fullName?.split(' ')[0] || 'Felipe'}
              </Typography>
              <ArrowDownIcon sx={{ fontSize: '0.9rem', color: TEXT_MUTED }} />
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { mt: 1, minWidth: 180, borderRadius: '12px' } }}
          >
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setProfileDialogOpen(true);
              }}
              sx={{ gap: 1.5 }}
            >
              <AccountCircleIcon fontSize="small" sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: "var(--color-text-primary, #FFFFFF)" }}>Perfil</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ gap: 1.5 }}>
              <LogoutIcon fontSize="small" sx={{ color: '#FF5252' }} />
              <Typography color="error" variant="body2" sx={{ fontWeight: 500 }}>Sair</Typography>
            </MenuItem>
          </Menu>

          <EditProfileDialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} />
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ mt: `${APPBAR_HEIGHT}px`, p: { xs: 2, md: 3 }, minHeight: `calc(100vh - ${APPBAR_HEIGHT}px)`, bgcolor: BG }}>
        {children}
      </Box>
    </Box>
  );
};

export default FocusedLayout;
