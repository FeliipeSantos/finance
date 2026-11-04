import { invoiceItems, invoicePaid, totalValue } from './cardDetails';
import type { DetailTransaction } from './cardDetails';
import { usePageScrollRestoration } from '../../hooks/usePageScrollRestoration';
import { useDetailSearchParams } from '../../hooks/useDetailSearchParams';
import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  TextField,
  MenuItem,
  LinearProgress,
  IconButton,
  Switch,
  Tooltip,
  Menu,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Subject as NotesIcon,
  AttachMoney as MoneyIcon,
  Payments as PaymentsIcon,
  CreditCard as CardIcon,
  AccountBalance as BankIcon,
  CalendarMonth as CalendarIcon,
  HelpOutline as HelpIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { renderBankLogoSvg } from '../../utils/bankIcons';
import BankPickerDialog from '../../components/BankPickerDialog';
import ColorPickerPopover from '../../components/ColorPickerPopover';

interface Account {
  id: string;
  name: string;
  institution: string;
  color: string;
  type: string;
  icon?: string | null;
  customIconUrl?: string | null;
}

interface CreditCard {
  id: string;
  name: string;
  bank?: string;
  brand: string;
  limitTotal: number;
  limitAvailable: number;
  limitUsed: number;
  closingDay: number;
  dueDay: number;
  color?: string;
  initialInvoice?: number;
  accountId?: string;
  isMain: boolean;
  dynamicClosing: boolean;
  dueBusinessDays: boolean;
  customIconUrl?: string;
}

const CARDS_BRANDS = ['MASTERCARD', 'VISA', 'DINERS', 'AMEX', 'ELO', 'OUTRO'];

// Única opção "padrão" oferecida no seletor de ícone do cartão, ao lado do
// tile de upload — a lista de bancos pré-carregados foi removida do seletor.
// O id 'generic' não corresponde a nenhum banco conhecido, então cai no
// fallback genérico (ícone cinza de cartão) de renderBankLogoSvg.
const GENERIC_CARD_OPTION = [{ id: 'generic', name: 'Genérico', primaryColor: '#6F768E' }];

const CARD_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#06B6D4', // Cyan/Light Blue
  '#EC4899', // Pink
  '#7E8494', // Grey
];

const MONTHS_SHORT = [
  'JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAI.', 'JUN.',
  'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'
];

const CardsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useDetailSearchParams();
  const currentMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;
  const currentYear = Number(searchParams.get('year')) || new Date().getFullYear();
  const currentMonthName = MONTHS_SHORT[currentMonth - 1] || 'JUN.';

  const [cards, setCards] = useState<CreditCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<(DetailTransaction & { type: string })[]>([]);
  const [loading, setLoading] = useState(true);
  usePageScrollRestoration(!loading);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);
  const [brand, setBrand] = useState('MASTERCARD');
  const [limit, setLimit] = useState('R$ 0,00');
  const [initialInvoice, setInitialInvoice] = useState('R$ 0,00');
  const [accountId, setAccountId] = useState('');
  const [closingDay, setClosingDay] = useState(1);
  const [dueDay, setDueDay] = useState(1);
  const [color, setColor] = useState('#3B82F6');
  const [dynamicClosing, setDynamicClosing] = useState(false);
  const [dueBusinessDays, setDueBusinessDays] = useState(false);
  const [isMain, setIsMain] = useState(false);

  // Bank Selection Dialog state
  const [bankDialogOpen, setBankDialogOpen] = useState(false);

  // Popover state for color picker
  const [colorAnchor, setColorAnchor] = useState<null | HTMLElement>(null);

  // Card Options Menu state
  const [optionsAnchor, setOptionsAnchor] = useState<null | HTMLElement>(null);
  const [selectedCardForMenu, setSelectedCardForMenu] = useState<CreditCard | null>(null);

  const formatBRL = (value: number) => {
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? '-' : ''}R$ ${formatted}`;
  };

  const maskBRL = (valStr: string) => {
    const clean = valStr.replace(/\D/g, '');
    if (!clean) return 'R$ 0,00';
    const num = parseFloat(clean) / 100;
    return formatBRL(num);
  };

  const parseBRLToFloat = (valStr: string) => {
    const clean = valStr
      .replace(/R\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cardsRes, accountsRes, txRes] = await Promise.all([
        api.get('/cards'),
        api.get('/accounts'),
        api.get('/transactions')
      ]);
      setCards(cardsRes.data);
      setTransactions(txRes.data);
      setAccounts(accountsRes.data);
    } catch (err) {
      setError('Falha ao carregar as informações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingCard(null);
    setName('');
    setBank('generic');
    setCustomIconUrl(null);
    setBrand('MASTERCARD');
    setLimit('R$ 0,00');
    setInitialInvoice('R$ 0,00');
    setAccountId('');
    setClosingDay(1);
    setDueDay(1);
    setColor('#3B82F6');
    setDynamicClosing(false);
    setDueBusinessDays(false);
    setIsMain(false);
    setOpen(true);
  };

  const handleOpenEdit = (card: CreditCard) => {
    setEditingCard(card);
    setName(card.name);
    setBank(card.bank || 'generic');
    setCustomIconUrl(card.customIconUrl || null);
    setBrand(card.brand);
    setLimit(formatBRL(card.limitTotal));
    setInitialInvoice(formatBRL(card.initialInvoice || 0));
    setAccountId(card.accountId || '');
    setClosingDay(card.closingDay);
    setDueDay(card.dueDay);
    setColor(card.color || '#3B82F6');
    setDynamicClosing(card.dynamicClosing || false);
    setDueBusinessDays(card.dueBusinessDays || false);
    setIsMain(card.isMain || false);
    setOpen(true);
  };

  useEffect(() => {
    const editCardId = searchParams.get('edit_card');
    if (loading || !editCardId) return;
    const card = cards.find((item) => item.id === editCardId);
    if (card) handleOpenEdit(card);
    setSearchParams((previous) => {
      previous.delete('edit_card');
      return previous;
    }, { replace: true });
  }, [loading, cards, searchParams, setSearchParams]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        brand,
        bank: bank || null,
        customIconUrl,
        limitTotal: parseBRLToFloat(limit),
        initialInvoice: parseBRLToFloat(initialInvoice),
        accountId: accountId || null,
        closingDay,
        dueDay,
        color,
        dynamicClosing,
        dueBusinessDays,
        isMain
      };

      if (editingCard) {
        await api.put(`/cards/${editingCard.id}`, payload);
      } else {
        await api.post('/cards', payload);
      }
      setOpen(false);
      fetchData();
    } catch (err) {
      alert('Erro ao salvar o cartão.');
    }
  };

  const handleDelete = async (cardId: string) => {
    if (window.confirm('Deseja realmente excluir este cartão?')) {
      try {
        await api.delete(`/cards/${cardId}`);
        fetchData();
      } catch (err) {
        alert('Erro ao excluir cartão.');
      }
    }
  };

  const renderBrandLogo = (brandName: string) => {
    const cleanBrand = brandName.toUpperCase();
    if (cleanBrand === 'MASTERCARD') {
      return (
        <Box display="flex" alignItems="center" sx={{ width: 26, height: 16, justifyContent: 'center' }}>
          <Box sx={{ width: 10, height: 10, bgcolor: '#EB0015', borderRadius: "50%", mr: -0.6, zIndex: 2 }} />
          <Box sx={{ width: 10, height: 10, bgcolor: '#F79E1B', borderRadius: "50%", opacity: 0.95 }} />
        </Box>
      );
    }
    if (cleanBrand === 'VISA') {
      return (
        <Box sx={{ bgcolor: '#1A1F71', width: 26, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: "2px" }}>
          <Typography sx={{ color: '#FFFFFF', fontWeight: 900, fontStyle: 'italic', fontSize: '0.45rem', letterSpacing: '0.02em' }}>
            VISA
          </Typography>
        </Box>
      );
    }
    if (cleanBrand === 'DINERS') {
      return (
        <Box sx={{ bgcolor: '#0079C1', width: 26, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: "2px" }}>
          <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.45rem' }}>
            D
          </Typography>
        </Box>
      );
    }
    if (cleanBrand === 'AMEX') {
      return (
        <Box sx={{ bgcolor: '#0070CD', width: 26, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: "2px" }}>
          <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.4rem', letterSpacing: '0.01em' }}>
            AMEX
          </Typography>
        </Box>
      );
    }
    if (cleanBrand === 'ELO') {
      return (
        <Box sx={{ bgcolor: '#000000', width: 26, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: "2px", border: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.45rem' }}>
            elo
          </Typography>
        </Box>
      );
    }
    // OUTRO
    return (
      <Box sx={{ bgcolor: 'var(--color-primary)', width: 26, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: "2px" }}>
        <CardIcon sx={{ color: '#FFFFFF', fontSize: '0.65rem' }} />
      </Box>
    );
  };

  const renderAccountIcon = (acc: Account | null) => {
    if (!acc) {
      return (
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            bgcolor: '#FFFFFF',
            color: '#13141B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <BankIcon sx={{ fontSize: '0.9rem' }} />
        </Box>
      );
    }

    const icon = (acc.icon || 'bank').toLowerCase();
    const bg = acc.color || '#3B82F6';

    if (icon === 'custom' && acc.customIconUrl) {
      return (
        <Box
          component="img"
          src={acc.customIconUrl}
          alt={`Logo de ${acc.name}`}
          sx={{ width: 24, height: 24, borderRadius: "50%", objectFit: 'cover', flexShrink: 0 }}
        />
      );
    }

    if (icon !== 'bank') {
      return (
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {renderBankLogoSvg(icon, 24)}
        </Box>
      );
    }

    // Default fallback
    return (
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          bgcolor: `${bg}15`,
          color: bg,
          border: `1px solid ${bg}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <BankIcon sx={{ fontSize: '0.9rem' }} />
      </Box>
    );
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3.5}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "var(--color-text-primary, #FFFFFF)" }}>
            Cartões de Crédito
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--color-text-secondary, #7E8494)", mt: 0.5 }}>
            Consulte limites, faturas e vencimentos de seus cartões cadastrados.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: '12px', fontWeight: 700 }}
        >
          Cadastrar Cartão
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress color="primary" />
        </Box>
      ) : cards.length === 0 ? (
        <Card sx={{ bgcolor: "var(--color-panel, #111217)", border: "1px solid var(--color-border)" }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
              Nenhum cartão de crédito cadastrado. Comece adicionando um cartão!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {[...cards]
            .sort((a, b) => (a.isMain === b.isMain ? 0 : a.isMain ? -1 : 1))
            .map((c) => {
            const invoice = invoiceItems(transactions.filter((tx) => tx.creditCardId === c.id && tx.type === 'EXPENSE'), currentMonth, currentYear);
            const partialInvoice = totalValue(invoice);
            const paidInvoice = invoicePaid(invoice);
            const usagePercent = c.limitTotal > 0 ? (c.limitUsed / c.limitTotal) * 100 : 0;
            const cardAccount = accounts.find(a => a.id === c.accountId);
            return (
              <Grid item xs={12} sm={6} md={4} key={c.id}>
                <Card sx={{
                  bgcolor: "var(--color-panel, #111217)",
                  border: "1px solid var(--color-border)",
                  borderLeft: `3px solid ${c.color || '#3B82F6'}`,
                  height: '100%',
                  background: `linear-gradient(135deg, ${(c.color || '#3B82F6')}0d 0%, var(--color-panel, #101116) 100%)`,
                  boxShadow: "0 8px 30px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.12)",
                  position: 'relative'
                }}>
                  <CardContent sx={{ p: 2.8, display: 'flex', flexDirection: 'column', gap: 2.2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ width: 38, height: 38, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {c.bank === 'custom' && c.customIconUrl ? (
                            <Box component="img" src={c.customIconUrl} sx={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                          ) : c.bank ? renderBankLogoSvg(c.bank, 38) : (
                            <Box sx={{ width: '100%', height: '100%', borderRadius: '10px', bgcolor: `${c.color || '#3B82F6'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color || '#3B82F6' }}>
                              <CardIcon fontSize="small" />
                            </Box>
                          )}
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: "var(--color-text-primary, #FFFFFF)", fontSize: '1.05rem', lineHeight: 1.2 }}>
                            {c.name}
                            {c.isMain && (
                              <Typography component="span" variant="caption" sx={{ color: 'var(--color-primary-text)', ml: 1, fontWeight: 700 }}>
                                (Principal)
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem' }}>
                            {c.brand}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ border: "1px solid var(--color-border)", borderRadius: '8px', px: 1, py: 0.25, display: 'flex', alignItems: 'center' }}>
                          {renderBrandLogo(c.brand)}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setOptionsAnchor(e.currentTarget);
                            setSelectedCardForMenu(c);
                          }}
                          sx={{ color: "var(--color-text-secondary, #6F768E)" }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ color: paidInvoice ? "var(--color-income, #4EBE87)" : "var(--color-text-secondary, #7E8494)", fontSize: '0.78rem' }}>
                        {paidInvoice ? 'Fatura Paga' : 'Fatura Parcial'}
                      </Typography>
                      <Typography sx={{ color: paidInvoice ? "var(--color-income, #4EBE87)" : "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.95rem' }}>
                        {formatBRL(partialInvoice)}
                      </Typography>
                    </Box>

                    {/* Limits breakdown */}
                    <Box display="flex" flexDirection="column" gap={0.8}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem' }}>Em aberto</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--color-expense, #E05A5A)", fontSize: '0.85rem' }}>
                          {formatBRL(c.limitUsed)}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem' }}>Limite disp.</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--color-income, #4EBE87)", fontSize: '0.85rem' }}>
                          {formatBRL(c.limitAvailable)}
                        </Typography>
                      </Box>
                      
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(usagePercent, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          mt: 0.5,
                          backgroundColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.04)",
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: c.color || '#3B82F6',
                            borderRadius: 4,
                          }
                        }}
                      />
                    </Box>

                    {/* Billing metadata */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ borderTop: "1px solid var(--color-border)", pt: 1.8 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', display: 'block' }}>Conta</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.8rem', mt: 0.25 }}>
                          {cardAccount ? cardAccount.name : 'Nenhuma'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', display: 'block' }}>Fechamento</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.8rem', mt: 0.25 }}>
                          {c.closingDay.toString().padStart(2, '0')}/{currentMonthName}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', display: 'block' }}>Vencimento</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.8rem', mt: 0.25 }}>
                          {c.dueDay.toString().padStart(2, '0')}/{currentMonthName}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Card Actions Menu */}
      <Menu
        anchorEl={optionsAnchor}
        open={Boolean(optionsAnchor)}
        onClose={() => {
          setOptionsAnchor(null);
          setSelectedCardForMenu(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: "var(--color-panel, #13141B)",
            border: "1px solid var(--color-border)",
            borderRadius: '12px',
          }
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedCardForMenu) handleOpenEdit(selectedCardForMenu);
            setOptionsAnchor(null);
          }}
          sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.85rem' }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedCardForMenu) handleDelete(selectedCardForMenu.id);
            setOptionsAnchor(null);
          }}
          sx={{ color: '#FF5252', fontSize: '0.85rem' }}
        >
          Excluir
        </MenuItem>
      </Menu>

      {/* DIALOG: Criar / Editar Cartão de Crédito */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "var(--color-panel, #13141B)",
            borderRadius: '12px',
            border: "1px solid var(--color-border)",
            boxShadow: "0px 10px 45px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.65)",
            p: 1.5,
          }
        }}
      >
        <form onSubmit={handleSave}>
          {/* Header Bar */}
          <Box display="flex" justifyContent="space-between" alignItems="center" px={1} pb={1.5} borderBottom="1px solid rgba(255,255,255,0.04)">
            <IconButton onClick={() => setOpen(false)} sx={{ color: "var(--color-text-secondary, #6F768E)", p: 0.5 }}>
              <CloseIcon />
            </IconButton>
            <Typography component="h2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontFamily: '"Inter", sans-serif' }}>
              {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
            </Typography>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: '8px',
                px: 2.5,
                py: 0.5,
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'var(--color-primary-dark)', boxShadow: 'none' }
              }}
            >
              Salvar
            </Button>
          </Box>

          <Box display="flex" flexDirection="column" mt={1.5}>
            {/* Row 1: Descrição (and Color / Brand Icon options) */}
            <Box display="flex" alignItems="center" gap={2} py={1.5} px={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <NotesIcon sx={{ color: "var(--color-text-secondary, #6F768E)" }} />
              <TextField
                fullWidth
                placeholder="Descrição"
                value={name}
                onChange={(e) => setName(e.target.value)}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "var(--color-text-primary, #FFFFFF)",
                    fontWeight: 600,
                    fontSize: '1rem',
                    fontFamily: '"Inter", sans-serif',
                  }
                }}
                required
              />

              {/* Color preview circle */}
              <Box
                onClick={(e) => setColorAnchor(e.currentTarget)}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  bgcolor: color,
                  cursor: 'pointer',
                  border: "2px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.2)",
                  flexShrink: 0,
                  transition: 'transform 0.1s',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
              />

              {/* Mini Bank Selector Indicator */}
              <Box
                onClick={() => setBankDialogOpen(true)}
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                  '&:hover': { transform: 'scale(1.15)' }
                }}
              >
                {bank === 'custom' && customIconUrl ? (
                  <Box sx={{ border: "1px solid var(--color-border)", borderRadius: "50%", width: 26, height: 26, overflow: 'hidden' }}>
                    <Box component="img" src={customIconUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                ) : bank ? (
                  <Box sx={{ border: "1px solid var(--color-border)", borderRadius: "50%", p: '1px', display: 'flex', alignItems: 'center' }}>
                    {renderBankLogoSvg(bank, 26)}
                  </Box>
                ) : (
                  <Box sx={{ border: "1px solid var(--color-border)", borderRadius: '8px', px: 0.8, py: 0.25, display: 'flex', alignItems: 'center', bgcolor: '#1A1B23', height: 26, boxSizing: 'border-box' }}>
                    {renderBrandLogo(brand)}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Row 2: Limite */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5} px={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <Box display="flex" alignItems="center" gap={2}>
                <MoneyIcon sx={{ color: "var(--color-text-secondary, #6F768E)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.9rem' }}>Limite</Typography>
              </Box>
              <TextField
                value={limit}
                onChange={(e) => setLimit(maskBRL(e.target.value))}
                variant="standard"
                inputProps={{ style: { textAlign: 'right' } }}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "var(--color-text-primary, #FFFFFF)",
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    fontFamily: '"Inter", sans-serif',
                  }
                }}
                required
              />
            </Box>

            {/* Row 3: Fatura atual */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5} px={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <Box display="flex" alignItems="center" gap={2}>
                <PaymentsIcon sx={{ color: "var(--color-text-secondary, #6F768E)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.9rem' }}>Fatura atual</Typography>
              </Box>
              <TextField
                value={initialInvoice}
                onChange={(e) => setInitialInvoice(maskBRL(e.target.value))}
                variant="standard"
                inputProps={{ style: { textAlign: 'right' } }}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "var(--color-text-primary, #FFFFFF)",
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    fontFamily: '"Inter", sans-serif',
                  }
                }}
                required
              />
            </Box>

            {/* Row 4: Bandeira */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5} px={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <Box display="flex" alignItems="center" gap={2}>
                <CardIcon sx={{ color: "var(--color-text-secondary, #6F768E)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.9rem' }}>Bandeira</Typography>
              </Box>
              <TextField
                select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                variant="standard"
                SelectProps={{
                  renderValue: (val) => {
                    const bName = val as string;
                    const labelMap: Record<string, string> = {
                      MASTERCARD: 'MasterCard',
                      VISA: 'VISA',
                      DINERS: 'Diners Club',
                      AMEX: 'Amex',
                      ELO: 'Elo',
                      OUTRO: 'Outro'
                    };
                    return (
                      <Box display="flex" alignItems="center" gap={1.2} justifyContent="flex-end">
                        {renderBrandLogo(bName)}
                        <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 600 }}>{labelMap[bName] || bName}</Typography>
                      </Box>
                    );
                  }
                }}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "var(--color-text-primary, #FFFFFF)",
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textAlign: 'right',
                  }
                }}
                sx={{ minWidth: 160 }}
              >
                {CARDS_BRANDS.map(b => {
                  const labelMap: Record<string, string> = {
                    MASTERCARD: 'MasterCard',
                    VISA: 'VISA',
                    DINERS: 'Diners Club',
                    AMEX: 'Amex',
                    ELO: 'Elo',
                    OUTRO: 'Outro'
                  };
                  return (
                    <MenuItem key={b} value={b}>
                      <Box display="flex" alignItems="center" gap={1.2}>
                        {renderBrandLogo(b)}
                        <Typography fontSize="0.9rem">{labelMap[b]}</Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>
            </Box>

            {/* Row 5: Conta (Associated bank checking account) */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5} px={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <Box display="flex" alignItems="center" gap={2}>
                <BankIcon sx={{ color: "var(--color-text-secondary, #6F768E)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.9rem' }}>Conta</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <TextField
                  select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  variant="standard"
                  SelectProps={{
                    renderValue: (val) => {
                      const selectedAcc = accounts.find(a => a.id === val);
                      return (
                        <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                          {renderAccountIcon(selectedAcc || null)}
                          <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 600 }}>
                            {selectedAcc ? selectedAcc.name : 'Nenhuma'}
                          </Typography>
                        </Box>
                      );
                    }
                  }}
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      color: "var(--color-text-primary, #FFFFFF)",
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textAlign: 'right',
                    }
                  }}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">
                    <Box display="flex" alignItems="center" gap={1.2}>
                      {renderAccountIcon(null)}
                      <Typography fontSize="0.9rem">Nenhuma</Typography>
                    </Box>
                  </MenuItem>
                  {accounts.map(acc => (
                    <MenuItem key={acc.id} value={acc.id}>
                      <Box display="flex" alignItems="center" gap={1.2}>
                        {renderAccountIcon(acc)}
                        <Typography fontSize="0.9rem">{acc.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
                <Tooltip title="Vincule uma conta para débito de fatura">
                  <HelpIcon sx={{ color: "var(--color-text-secondary, #6F768E)", fontSize: '1rem', cursor: 'pointer' }} />
                </Tooltip>
              </Box>
            </Box>

            {/* Row 6: Fecha dia */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5} px={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <Box display="flex" alignItems="center" gap={2}>
                <CalendarIcon sx={{ color: "var(--color-text-secondary, #6F768E)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.9rem' }}>Fecha dia</Typography>
              </Box>
              <TextField
                select
                value={closingDay}
                onChange={(e) => setClosingDay(parseInt(e.target.value))}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "var(--color-text-primary, #FFFFFF)",
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textAlign: 'right',
                  }
                }}
                sx={{ minWidth: 60 }}
              >
                {Array.from({ length: 31 }, (_, i) => {
                  const dayVal = i + 1;
                  const dayStr = dayVal.toString().padStart(2, '0');
                  return <MenuItem key={dayVal} value={dayVal}>{dayStr}</MenuItem>;
                })}
              </TextField>
            </Box>

            {/* Row 7: Fechamento dinâmico (Sub-row indented) */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.25} pl={5.25} pr={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 500, fontSize: '0.85rem' }}>Fechamento dinâmico</Typography>
              <Switch
                checked={dynamicClosing}
                onChange={(e) => setDynamicClosing(e.target.checked)}
                size="small"
                color="primary"
              />
            </Box>

            {/* Row 8: Vence dia */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5} px={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <Box display="flex" alignItems="center" gap={2}>
                <CalendarIcon sx={{ color: "var(--color-text-secondary, #6F768E)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.9rem' }}>Vence dia</Typography>
              </Box>
              <TextField
                select
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value))}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "var(--color-text-primary, #FFFFFF)",
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textAlign: 'right',
                  }
                }}
                sx={{ minWidth: 60 }}
              >
                {Array.from({ length: 31 }, (_, i) => {
                  const dayVal = i + 1;
                  const dayStr = dayVal.toString().padStart(2, '0');
                  return <MenuItem key={dayVal} value={dayVal}>{dayStr}</MenuItem>;
                })}
              </TextField>
            </Box>

            {/* Row 9: Vencimento em dias úteis (Sub-row indented) */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.25} pl={5.25} pr={1} borderBottom="1px solid rgba(255,255,255,0.04)">
              <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 500, fontSize: '0.85rem' }}>Vencimento em dias úteis</Typography>
              <Switch
                checked={dueBusinessDays}
                onChange={(e) => setDueBusinessDays(e.target.checked)}
                size="small"
                color="primary"
              />
            </Box>

            {/* Row 10: Cartão principal */}
            <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5} px={1}>
              <Box display="flex" alignItems="center" gap={2}>
                <CardIcon sx={{ color: "var(--color-text-secondary, #6F768E)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.9rem' }}>Cartão principal</Typography>
              </Box>
              <Switch
                checked={isMain}
                onChange={(e) => setIsMain(e.target.checked)}
                size="small"
                color="primary"
              />
            </Box>
          </Box>
        </form>
      </Dialog>

      {/* Color choices popover */}
      <ColorPickerPopover
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        value={color}
        onChange={setColor}
        presets={CARD_COLORS}
      />

      <BankPickerDialog
        open={bankDialogOpen}
        onClose={() => setBankDialogOpen(false)}
        value={bank}
        extraOptions={GENERIC_CARD_OPTION}
        customIconUrl={customIconUrl || undefined}
        onSelect={(bankId) => {
          setBank(bankId);
          setCustomIconUrl(null);
        }}
        onUploadImage={(dataUri) => {
          setCustomIconUrl(dataUri);
          setBank('custom');
        }}
      />
    </Box>
  );
};

export default CardsPage;
