import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import {
  AppBar,
  Avatar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  InputAdornment,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Remove as RemoveIcon,
  SwapVert as SwapIcon,
  Category as CategoryIcon,
  Percent as PercentIcon,
  Sync as SyncIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';

import BrandLogo from './BrandLogo';
import { useBranding } from '../hooks/useBranding';
import EditProfileDialog from './EditProfileDialog';
import { useColorMode } from '../theme/colorMode';
import { APP_VERSION } from '../config/version';

// ── Layout dimensions ──────────────────────────────────────────
const COLLAPSED_SIDEBAR_WIDTH = 68;
const EXPANDED_SIDEBAR_WIDTH  = 240;
const APPBAR_HEIGHT           = 68;

// ── Shared UI kit colors ─────────────────────────────────────
const BG          = "var(--color-page, #0F1016)";
const ICON_BG     = "var(--color-sidebar)";
const NAV_BG      = "var(--color-sidebar)";
const ACTIVE_BG   = 'var(--color-primary-soft)';
const ICON_ACTIVE = 'var(--color-primary-text)';
const ICON_MUTED  = "var(--color-text-secondary, #6F768E)";
const TEXT_ACTIVE = "var(--color-text-primary, #FFFFFF)";
const TEXT_MUTED  = "var(--color-text-secondary, #6F768E)";

// ── Nav items grouped by sections ─────────────────────────────
interface MenuItemType {
  text: string;
  icon: React.ReactNode;
  path: string;
}

interface MenuSectionType {
  title: string | null;
  items: MenuItemType[];
  /** Exibe um traço separador logo após esta seção. */
  divider?: boolean;
}

const menuSections: MenuSectionType[] = [
  {
    title: null,
    items: [
      { text: 'Resumo',             icon: <DashboardIcon fontSize="small" />, path: '/' },
      { text: 'Transações',         icon: <SwapIcon fontSize="small" />,      path: '/transacoes' },
    ],
    divider: true,
  },
  {
    title: null,
    items: [
      { text: 'Contas',             icon: <BankIcon fontSize="small" />,      path: '/contas' },
      { text: 'Cartões de crédito',  icon: <CardIcon fontSize="small" />,      path: '/cartoes' },
    ]
  },
  {
    title: null,
    items: [
      { text: 'Categorias',         icon: <CategoryIcon fontSize="small" />,   path: '/categorias' },
      { text: 'Orçamentos',         icon: <PercentIcon fontSize="small" />,    path: '/orcamentos' },
    ],
    divider: true,
  },
  {
    title: null,
    items: [
      { text: 'Sincronizar',        icon: <SyncIcon fontSize="small" />,       path: '#sync' },
      { text: 'Modo claro',         icon: <LightModeIcon fontSize="small" />,  path: '#theme' },
    ]
  }
];

// ─────────────────────────────────────────────────────────────
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const Layout: React.FC = () => {
  const { branding } = useBranding();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const transactionSearch = searchParams.get('q') || '';
  const updateTransactionSearch = (value: string) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set('q', value);
      else next.delete('q');
      return next;
    }, { replace: true, state: location.state });
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const { mode, toggleMode: handleToggleTheme } = useColorMode();
  const isLightMode = mode === 'light';

  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1500);
  };

  const getMenuIcon = (item: MenuItemType) => {
    if (item.text === 'Sincronizar') {
      return (
        <SyncIcon
          fontSize="small"
          sx={{
            animation: isSyncing ? 'spin 1.5s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            }
          }}
        />
      );
    }
    if (item.text === 'Modo claro' || item.text === 'Modo escuro') {
      return isLightMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />;
    }
    return item.icon;
  };

  const getMenuText = (item: MenuItemType) => {
    if (item.text === 'Modo claro' || item.text === 'Modo escuro') {
      return isLightMode ? 'Modo escuro' : 'Modo claro';
    }
    return item.text;
  };

  const currentMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;
  const currentYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();

  const SIDEBAR_WIDTH = isExpanded ? EXPANDED_SIDEBAR_WIDTH : COLLAPSED_SIDEBAR_WIDTH;
  const TOTAL_SIDEBAR = SIDEBAR_WIDTH + 32; // sidebar width + 16px left + 16px right margins

  React.useEffect(() => {
    document.documentElement.style.setProperty('--total-sidebar-width', `${TOTAL_SIDEBAR}px`);
  }, [TOTAL_SIDEBAR]);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSearchParams((prev) => {
      prev.set('month', newMonth.toString());
      prev.set('year', newYear.toString());
      return prev;
    }, { replace: true, state: location.state });
  };

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSearchParams((prev) => {
      prev.set('month', newMonth.toString());
      prev.set('year', newYear.toString());
      return prev;
    }, { replace: true, state: location.state });
  };

  const isQuickAddDisabled = ['/contas', '/cartoes', '/categorias'].includes(location.pathname);

  const handleOpenAddMenu = (event: React.MouseEvent<HTMLElement>) => {
    if (isQuickAddDisabled) return;
    setAddMenuAnchor(event.currentTarget);
  };

  const handleCloseAddMenu = () => {
    setAddMenuAnchor(null);
  };

  const handleSelectAddOption = (type: string) => {
    setAddMenuAnchor(null);
    setSearchParams((prev) => {
      prev.set('new_tx', 'true');
      prev.set('tx_type', type);
      return prev;
    });
  };

  // ── Collapsible Sidebar Content ──────────────────────────────
  const SidebarContent = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: { xs: 'calc(100vh - 32px)', md: `calc(100vh - ${APPBAR_HEIGHT + 24}px)` },
        mt: { xs: 2, md: `${APPBAR_HEIGHT + 8}px` },
        mb: 2,
        ml: 2,
        mr: 2,
        borderRadius: '24px',
        bgcolor: isExpanded ? NAV_BG : ICON_BG,
        display: 'flex',
        flexDirection: 'column',
        pt: 3,
        pb: 3,
        border: "1px solid var(--color-border)",
        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {isExpanded ? (
        <>
          {/* Spacer to separate header from menu */}
          <Box sx={{ height: 16 }} />

          {/* Nav list */}
          <List sx={{ px: 1.25, py: 0, flexGrow: 1, overflowY: 'auto', overscrollBehaviorY: 'contain', '&::-webkit-scrollbar': { width: 0 } }}>
            {menuSections.map((section, secIdx) => (
              <React.Fragment key={secIdx}>
                {section.title && (
                  <Typography
                    sx={{
                      color: "var(--color-text-secondary, #4E5366)",
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      px: 1.75,
                      mt: 2.5,
                      mb: 0.75,
                      letterSpacing: '0.12em',
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    {section.title}
                  </Typography>
                )}
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const itemText = getMenuText(item);
                  const itemIcon = getMenuIcon(item);
                  return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                      <ListItemButton
                        aria-label={itemText}
                        aria-pressed={item.path === '#theme' ? isLightMode : undefined}
                        onClick={() => {
                          if (item.path === '#sync') {
                            handleSync();
                          } else if (item.path === '#theme') {
                            handleToggleTheme();
                          } else {
                            navigate(item.path);
                          }
                          setMobileOpen(false);
                        }}
                        sx={{
                          borderRadius: '12px',
                          py: 0.75,
                          px: 1.5,
                          bgcolor: isActive ? ACTIVE_BG : 'transparent',
                          transition: 'all 0.18s ease',
                          '&:hover': {
                            bgcolor: isActive ? ACTIVE_BG : "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.04)",
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isActive ? ICON_ACTIVE : ICON_MUTED,
                            minWidth: 32,
                            transition: 'color 0.18s',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {itemIcon}
                        </ListItemIcon>
                        <ListItemText
                          primary={itemText}
                          primaryTypographyProps={{
                            fontSize: '0.825rem',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? TEXT_ACTIVE : TEXT_MUTED,
                            noWrap: true,
                            fontFamily: '"Inter", sans-serif',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
                {section.divider && (
                  <Box sx={{ my: 1.5, mx: 1.5, borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" }} />
                )}
              </React.Fragment>
            ))}
          </List>


        </>
      ) : (
        <>
          {/* Spacer to separate header from menu */}
          <Box sx={{ height: 16 }} />

          {/* Centered Icons List */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%', overflowY: 'auto', overscrollBehaviorY: 'contain', '&::-webkit-scrollbar': { width: 0 } }}>
            {menuSections.map((section, secIdx) => (
              <React.Fragment key={secIdx}>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const itemText = getMenuText(item);
                  const itemIcon = getMenuIcon(item);
                  return (
                    <Tooltip key={item.path} title={itemText} placement="right" arrow>
                      <IconButton
                        aria-label={itemText}
                        aria-pressed={item.path === '#theme' ? isLightMode : undefined}
                        onClick={() => {
                          if (item.path === '#sync') {
                            handleSync();
                          } else if (item.path === '#theme') {
                            handleToggleTheme();
                          } else {
                            navigate(item.path);
                          }
                          setMobileOpen(false);
                        }}
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: '12px',
                          color: isActive ? ICON_ACTIVE : ICON_MUTED,
                          bgcolor: isActive ? ACTIVE_BG : 'transparent',
                          transition: 'all 0.18s ease',
                          '&:hover': {
                            bgcolor: isActive ? ACTIVE_BG : "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                            color: isActive ? ICON_ACTIVE : "var(--color-text-primary, #EEEEF5)",
                          },
                        }}
                      >
                        {itemIcon}
                      </IconButton>
                    </Tooltip>
                  );
                })}
                {section.divider && (
                  <Box sx={{ my: 1, width: '60%', borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" }} />
                )}
              </React.Fragment>
            ))}
          </Box>


        </>
      )}
      <Typography
        component="p"
        aria-label={`Versão ${APP_VERSION}`}
        sx={{
          color: TEXT_MUTED,
          fontSize: isExpanded ? '.7rem' : '.62rem',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          mt: 'auto',
          pt: 1.5,
          mb: 0,
        }}
      >
        {isExpanded ? `Versão ${APP_VERSION}` : `v${APP_VERSION}`}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: BG }}>
      <CssBaseline />

      {/* ── Desktop: fixed collapsible sidebar ── */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 1100,
          width: TOTAL_SIDEBAR,
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {SidebarContent}
      </Box>

      {/* ── Mobile: temporary drawer ── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: TOTAL_SIDEBAR,
            border: 0,
            bgcolor: 'transparent',
            backgroundImage: 'none',
            transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      >
        {SidebarContent}
      </Drawer>

      {/* ── Top AppBar ── */}
      <AppBar
        position="fixed"
        sx={{
          left: 0,
          width: '100%',
          bgcolor: BG,
          borderBottom: "1px solid var(--color-border)",
          boxShadow: 'none',
          zIndex: 1200,
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${APPBAR_HEIGHT}px !important`,
            px: { xs: 2, md: 3 },
            gap: 2,
          }}
        >
          {/* Mobile hamburger */}
          <IconButton
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' }, color: TEXT_MUTED }}
          >
            <MenuIcon />
          </IconButton>

          {/* Desktop Hamburger trigger */}
          <IconButton
            aria-label={isExpanded ? 'Recolher menu' : 'Expandir menu'}
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, color: TEXT_MUTED, mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo and name next to hamburger trigger */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mr: 2, minWidth: 0 }}>
            <BrandLogo size={24} />
            <Typography
              variant="h6"
              title={branding.name}
              sx={{
                fontWeight: 800,
                fontSize: '0.95rem',
                color: "var(--color-text-primary, #FFFFFF)",
                letterSpacing: '0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: 140, sm: 320 },
              }}
            >
              {branding.name}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {location.pathname === '/transacoes' && (
            <TextField
              size="small"
              placeholder="Pesquisar"
              value={transactionSearch}
              onChange={(event) => updateTransactionSearch(event.target.value)}
              inputProps={{ 'aria-label': 'Pesquisar transações' }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: TEXT_MUTED }} fontSize="small" /></InputAdornment>,
                endAdornment: transactionSearch ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Limpar pesquisa" onClick={() => updateTransactionSearch('')}>
                      <CloseIcon fontSize="small" sx={{ color: TEXT_MUTED }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
              sx={{
                width: { xs: 140, md: 240 }, minWidth: 120, maxWidth: 340,
                bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.03)", borderRadius: '8px',
                '& .MuiOutlinedInput-root': { borderRadius: '8px' },
                '& fieldset': { border: "1px solid var(--color-border)" },
              }}
            />
          )}

          {/* Month Navigator moved next to the blue + button */}
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
            <IconButton size="small" onClick={handlePrevMonth} sx={{ color: TEXT_MUTED, p: 0.5 }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, px: 1, color: "var(--color-text-primary, #FFFFFF)", minWidth: 60, textAlign: 'center' }}>
              {MONTHS[currentMonth - 1]}
            </Typography>
            <IconButton size="small" onClick={handleNextMonth} sx={{ color: TEXT_MUTED, p: 0.5 }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Circular Quick Add button */}
          <Tooltip title={isQuickAddDisabled ? 'Indisponível nesta tela' : 'Registrar Transação'}>
            <span>
              <IconButton
                onClick={handleOpenAddMenu}
                aria-label="Novo lançamento"
                aria-haspopup="menu"
                aria-expanded={Boolean(addMenuAnchor)}
                aria-controls={addMenuAnchor ? 'new-transaction-menu' : undefined}
                disabled={isQuickAddDisabled}
                sx={{
                  color: '#FFFFFF',
                  bgcolor: 'var(--color-primary)',
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  '&:hover': { bgcolor: 'var(--color-primary-dark)' },
                  '&.Mui-disabled': {
                    color: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.3)",
                    bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                  },
                  mr: 1.5,
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {/* Quick Insert Menu Dropdown */}
          <Menu
            id="new-transaction-menu" anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={handleCloseAddMenu}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: {
              mt: 1.5, width: 296, maxWidth: 'calc(100vw - 32px)', p: 0,
              borderRadius: '8px', bgcolor: 'var(--color-panel, #13141B)', backgroundImage: 'none',
              border: '1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)',
              boxShadow: '0 10px 35px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.3)',
            } }}
            MenuListProps={{ 'aria-label': 'Novo lançamento', sx: { p: 1.75, display: 'flex', flexDirection: 'column', gap: 1 } }}>
            {[
              { type: 'EXPENSE', label: 'Despesa', icon: <RemoveIcon />, color: 'var(--color-expense, #E05A5A)' },
              { type: 'EXPENSE_CARD', label: 'Despesa cartão', icon: <CardIcon />, color: 'var(--color-primary-text)' },
              { type: 'REVENUE', label: 'Receita', icon: <AddIcon />, color: 'var(--color-income, #4EBE87)' },
              { type: 'TRANSFER', label: 'Transferência', icon: <SwapIcon />, color: 'var(--color-warning, #F4A261)' },
            ].map((option) => (
              <MenuItem key={option.type} onClick={() => handleSelectAddOption(option.type)} sx={{
                display: 'flex', alignItems: 'center', gap: 2.25, minHeight: 54, py: 0.625, px: 1,
                borderRadius: '12px', border: '1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)',
                color: 'var(--color-text-primary, #FFFFFF)', transition: 'background-color 0.15s ease',
                '&:hover, &.Mui-focusVisible': { bgcolor: 'rgba(var(--color-primary-rgb), 0.12)' },
              }}>
                <Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: '12px', bgcolor: 'rgba(var(--color-primary-rgb), 0.06)', color: option.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 24 } }}>{option.icon}</Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{option.label}</Typography>
              </MenuItem>
            ))}
          </Menu>

          {/* User widget profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Space/Pill widget */}
            <Box
              id="user-menu-button"
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
                transition: 'all 0.18s',
                '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)" },
              }}
            >
              {user?.avatarUrl ? (
                <Avatar src={user.avatarUrl} sx={{ width: 24, height: 24, flexShrink: 0 }} />
              ) : (
                /* Dead-face icon custom circle — shown until the user sets a profile photo */
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: '#5B6B7C', // Slate grey background
                    color: "var(--color-page, #0F1016)",   // Dark charcoal color for stroke
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Left eye 'X' */}
                    <line x1="7.5" y1="8.5" x2="11.5" y2="12.5" />
                    <line x1="11.5" y1="8.5" x2="7.5" y2="12.5" />

                    {/* Right eye 'X' */}
                    <line x1="12.5" y1="8.5" x2="16.5" y2="12.5" />
                    <line x1="16.5" y1="8.5" x2="12.5" y2="12.5" />

                    {/* Sad mouth curve */}
                    <path d="M 8 16.5 Q 12 13.5 16 16.5" />
                  </svg>
                </Box>
              )}

              <Typography
                variant="body2"
                sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.825rem', display: { xs: 'none', sm: 'block' } }}
              >
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

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          ml: { md: `${TOTAL_SIDEBAR}px` },
          mt: `${APPBAR_HEIGHT}px`,
          p: { xs: 2, md: 3 },
          minHeight: `calc(100vh - ${APPBAR_HEIGHT}px)`,
          bgcolor: BG,
          transition: 'margin-left 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
