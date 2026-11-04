import { useDetailSearchParams } from '../../hooks/useDetailSearchParams';
import { accountMonthSummary } from './accountMonthSummary';
import { roundCurrency } from '../../utils/currency';
import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import { usePageScrollRestoration } from '../../hooks/usePageScrollRestoration';
import { useAuth } from '../auth/AuthContext';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  TextField,
  MenuItem,
  Switch,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  AccountBalance as AccountIcon,
  Calculate as CalculateIcon,
  Tag as TagIcon,
  Description as DescriptionIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon,
  DoNotDisturb as DoNotDisturbIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { SPECIAL_ACCOUNT_OPTIONS, renderBankLogoSvg } from '../../utils/bankIcons';
import BankPickerDialog from '../../components/BankPickerDialog';
import { getCategoryIcon } from '../../utils/categoryIcons';

interface Account {
  id: string;
  name: string;
  institution: string;
  balanceInitial: number;
  balanceCurrent: number;
  color: string;
  type: string;
  isActive: boolean;
  overdraft: number;
  accountNumber?: string;
  additionalData?: string;
  isDefault: boolean;
  showInResume: boolean;
  isInvestment: boolean;
  ignoreInTotals: boolean;
  accountGroup: string;
  icon: string;
  customIconUrl?: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
  icon?: string;
  parentCategoryId?: string;
}

interface Transaction {
  id: string;
  accountId?: string;
  destinationAccountId?: string;
  creditCardId?: string;
  effectiveDate?: string;
  dueDate?: string;
  value: number;
  date: string;
  type: 'REVENUE' | 'EXPENSE' | 'TRANSFER';
  description: string;
  effective?: boolean;
}

const ACCOUNT_TYPES: Record<string, string> = {
  CHECKING: 'Conta Corrente',
  SAVINGS: 'Poupança',
  DIGITAL_WALLET: 'Carteira Digital',
  INVESTMENT: 'Conta Investimentos',
  CASH: 'Dinheiro em Espécie',
};

// Única opção "padrão" oferecida no seletor de ícone, ao lado do tile de
// upload — a lista de bancos pré-carregados foi removida do seletor.
const GENERIC_ACCOUNT_OPTION = SPECIAL_ACCOUNT_OPTIONS.filter((o) => o.id === 'bank');

const AccountsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useDetailSearchParams();
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
  const year = Number(searchParams.get('year')) || new Date().getFullYear();
  const [cards, setCards] = useState<{ id: string; accountId?: string | null }[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountCategories, setAccountCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  usePageScrollRestoration(!loading);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('R$ 0,00');
  const [overdraft, setOverdraft] = useState('R$ 0,00');
  const [type, setType] = useState('Conta Corrente');
  const [accountGroup, setAccountGroup] = useState('Nenhum');
  const [accountNumber, setAccountNumber] = useState('');
  const [additionalData, setAdditionalData] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showInResume, setShowInResume] = useState(true);
  const [isInvestment, setIsInvestment] = useState(false);
  const [ignoreInTotals, setIgnoreInTotals] = useState(false);
  const [color, setColor] = useState('#820AD1');
  const [icon, setIcon] = useState('bank');
  const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);

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

  // Bank/Icon Selector Dialog
  const [bankDialogOpen, setBankDialogOpen] = useState(false);

  // Actions Menu State
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedAccountForMenu, setSelectedAccountForMenu] = useState<Account | null>(null);

  const fetchAccountsAndTransactions = async () => {
    try {
      setLoading(true);
      const [accRes, txRes, catRes, cardRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/transactions'),
        api.get('/categories'),
        api.get('/cards'),
      ]);
      setAccounts(accRes.data);
      setCards(cardRes.data);
      setTransactions(txRes.data);
      const filteredCats = (catRes.data || []).filter(
        (c: Category) => c.type === 'ACCOUNTS' && !c.parentCategoryId
      );
      setAccountCategories(filteredCats);
    } catch (err) {
      setError('Falha ao carregar contas e movimentações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndTransactions();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setInitialBalance('R$ 0,00');
    setOverdraft('R$ 0,00');
    setType('Conta Corrente');
    setAccountGroup('Nenhum');
    setAccountNumber('');
    setAdditionalData('');
    setIsDefault(false);
    setShowInResume(true);
    setIsInvestment(false);
    setIgnoreInTotals(false);
    setColor('#7E8494');
    setIcon('bank');
    setCustomIconUrl(null);
    setOpen(true);
  };

  const handleOpenEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setInitialBalance(formatBRL(acc.balanceInitial));
    setOverdraft(formatBRL(acc.overdraft || 0));
    setType(acc.type);
    setAccountGroup(acc.accountGroup || 'Nenhum');
    setAccountNumber(acc.accountNumber || '');
    setAdditionalData(acc.additionalData || '');
    setIsDefault(acc.isDefault);
    setShowInResume(acc.showInResume);
    setIsInvestment(acc.isInvestment);
    setIgnoreInTotals(acc.ignoreInTotals);
    setColor(acc.color);
    setIcon(acc.icon || 'bank');
    setCustomIconUrl(acc.customIconUrl || null);
    setOpen(true);
    setMenuAnchor(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        institution: name, // Default institution to description name
        balanceInitial: parseBRLToFloat(initialBalance),
        color,
        type,
        overdraft: parseBRLToFloat(overdraft),
        accountNumber,
        additionalData,
        isDefault,
        showInResume,
        isInvestment,
        ignoreInTotals,
        accountGroup,
        icon,
        customIconUrl,
      };

      if (editingAccount) {
        await api.put(`/accounts/${editingAccount.id}`, payload);
      } else {
        await api.post('/accounts', payload);
      }
      setOpen(false);
      fetchAccountsAndTransactions();
    } catch (err) {
      alert('Erro ao salvar conta bancária.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta conta? Todas as transações relacionadas serão afetadas.')) return;
    try {
      await api.delete(`/accounts/${id}`);
      setMenuAnchor(null);
      fetchAccountsAndTransactions();
    } catch (err) {
      alert('Erro ao excluir conta.');
    }
  };

  const summaries = new Map(accounts.map((account) => [account.id, accountMonthSummary(account, transactions, cards, month, year)]));
  const includedAccounts = accounts.filter((account) => !account.ignoreInTotals);
  const totalReceitas = roundCurrency(includedAccounts.reduce((sum, acc) => sum + summaries.get(acc.id)!.revenues, 0));
  const totalDespesas = roundCurrency(includedAccounts.reduce((sum, acc) => sum + summaries.get(acc.id)!.expenses, 0));
  const totalSaldo = roundCurrency(includedAccounts.reduce((sum, acc) => sum + summaries.get(acc.id)!.balance, 0));
  const totalPrevisto = roundCurrency(includedAccounts.reduce((sum, acc) => sum + summaries.get(acc.id)!.forecast, 0));

  // Logo rendering helper
  const renderAccountLogo = (accIcon: string, accColor: string, accCustomIconUrl?: string) => {
    const normIcon = (accIcon || 'bank').toLowerCase();

    if (normIcon === 'custom' && accCustomIconUrl) {
      return (
        <Box
          component="img"
          src={accCustomIconUrl}
          sx={{ width: 34, height: 34, borderRadius: "50%", objectFit: 'cover', flexShrink: 0 }}
        />
      );
    }

    if (!normIcon || normIcon === 'bank') {
      return (
        <Box sx={{ bgcolor: `${accColor}15`, color: accColor, width: 34, height: 34, borderRadius: "50%", display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${accColor}25` }}>
          <AccountIcon sx={{ fontSize: '1.1rem' }} />
        </Box>
      );
    }

    return (
      <Box sx={{ width: 34, height: 34, borderRadius: "50%", overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderBankLogoSvg(normIcon, 34)}
      </Box>
    );
  };

  const getCategoryColor = (catTypeName: string) => {
    const found = accountCategories.find((c) => c.name === catTypeName);
    if (found && found.color) return found.color;
    
    // Fallback/Legacy colors
    const name = catTypeName.toLowerCase();
    if (name.includes('corrente') || catTypeName === 'CHECKING') return '#4EBE87';
    if (name.includes('poupança') || catTypeName === 'SAVINGS') return '#FFCA28';
    if (name.includes('carteira') || catTypeName === 'DIGITAL_WALLET') return '#26C6DA';
    if (name.includes('investimento') || catTypeName === 'INVESTMENT') return '#42A5F5';
    return '#66BB6A';
  };

  const getAccountTypeIcon = (catTypeName: string) => {
    const found = accountCategories.find((c) => c.name === catTypeName);
    if (found?.icon) return getCategoryIcon(found.icon);
    return <AccountIcon sx={{ fontSize: '1rem' }} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  const formatCurrency = (val: number) => {
    const sign = val < -0.005 ? '-' : '';
    return `${sign}R$ ${Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Box sx={{ pb: 10 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3.5}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "var(--color-text-primary, #FFFFFF)" }}>
            Contas Bancárias
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--color-text-secondary, #7E8494)", mt: 0.5 }}>
            Visualize e configure suas contas correntes, poupanças e investimentos.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
          sx={{ borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1 }}
        >
          Nova Conta
        </Button>
      </Box>

      {accounts.length === 0 ? (
        <Paper sx={{ bgcolor: "var(--color-panel, #111217)", border: "1px solid var(--color-border)", py: 6, textAlign: 'center', borderRadius: '12px' }}>
          <Typography variant="body1" sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
            Nenhuma conta bancária cadastrada. Comece criando sua primeira conta!
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} tabIndex={0} role="region" aria-label="Tabela de contas bancárias" sx={{ bgcolor: "var(--color-panel, #111217)", border: "1px solid var(--color-border)", borderRadius: '12px', overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, '&:focus-visible': { outline: '2px solid var(--color-primary-text)', outlineOffset: 2 } }}>
          <Table aria-label="Contas bancárias" sx={{ tableLayout: 'fixed', minWidth: 1400, '& th, & td': { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } }}>
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <TableHead>
              <TableRow sx={{ borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" }}>
                <TableCell sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Descrição</TableCell>
                <TableCell align="right" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Saldo inicial</TableCell>
                <TableCell align="right" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Receitas</TableCell>
                <TableCell align="right" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Despesas</TableCell>
                <TableCell align="right" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Transf. cred.</TableCell>
                <TableCell align="right" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Transf. deb.</TableCell>
                <TableCell align="right" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Saldo</TableCell>
                <TableCell align="right" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Previsto</TableCell>
                <TableCell align="center" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((acc) => {
                const { revenues: receitas, expenses: despesas, transfersIn: transfCred, transfersOut: transfDeb,
                  opening: saldoInicial, balance: saldo, forecast: previsto } = summaries.get(acc.id)!;

                return (
                  <TableRow key={acc.id} sx={{ '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)" }, borderBottom: "1px solid var(--color-border)" }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ display: 'flex', flexShrink: 0 }}>{renderAccountLogo(acc.icon, acc.color, acc.customIconUrl)}</Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap title={acc.name} variant="body2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)" }}>
                            {acc.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {ACCOUNT_TYPES[acc.type] || acc.type}
                            {acc.isDefault && (
                              <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(var(--color-primary-rgb), 0.15)', color: 'var(--color-primary-text)', padding: '1px 5px', borderRadius: "4px", fontWeight: 700 }}>
                                Padrão
                              </span>
                            )}
                          </Typography>
                        </Box>
                        {acc.isDefault && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: '#4EBE87', ml: 'auto' }} />}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, color: saldoInicial < 0 ? "var(--color-expense, #E05A5A)" : "var(--color-text-secondary, #7E8494)", fontWeight: 600 }}>
                      {formatCurrency(saldoInicial)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 }}>
                      {formatCurrency(receitas)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 }}>
                      {formatCurrency(despesas)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 }}>
                      {formatCurrency(transfCred)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 }}>
                      {formatCurrency(transfDeb)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, color: saldo < 0 ? "var(--color-expense, #E05A5A)" : "var(--color-income, #4EBE87)", fontWeight: 700 }}>
                      {formatCurrency(saldo)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, color: previsto < 0 ? "var(--color-expense, #E05A5A)" : "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>
                      {formatCurrency(previsto)}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <IconButton
                        size="small"
                        sx={{ color: "var(--color-text-secondary, #7E8494)" }}
                        onClick={(e) => {
                          setMenuAnchor(e.currentTarget);
                          setSelectedAccountForMenu(acc);
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Row Action Dropdown Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: 'var(--color-panel, #111217)',
            border: "1px solid var(--color-border)",
            borderRadius: '8px',
            color: "var(--color-text-primary, #FFFFFF)",
          },
        }}
      >
        <MenuItem onClick={() => selectedAccountForMenu && handleOpenEditModal(selectedAccountForMenu)}>
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => selectedAccountForMenu && handleDelete(selectedAccountForMenu.id)}
          sx={{ color: "var(--color-expense, #E05A5A)" }}
        >
          Excluir
        </MenuItem>
      </Menu>

      {/* DIALOG: Nova Conta / Editar Conta (Matches Mockup Design) */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--color-surface-raised, #1E1F29)',
            backgroundImage: 'none',
            borderRadius: '24px',
            p: 1.5,
            border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
            boxShadow: "0px 8px 32px rgba(var(--color-shadow-rgb, 0, 0, 0), 0.4)",
          },
        }}
      >
        <form onSubmit={handleSave}>
          <Box display="flex" justifyContent="space-between" alignItems="center" px={1.5} pt={1.5} pb={1}>
            <IconButton onClick={() => setOpen(false)} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
              <CloseIcon />
            </IconButton>
            <Box textAlign="center" flexGrow={1}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "var(--color-text-primary, #FFFFFF)", fontSize: '1.15rem', lineHeight: 1.2 }}>
                {editingAccount ? 'Editar Conta' : 'Nova Conta'}
              </Typography>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem' }}>
                {user?.fullName || 'Felipe'}
              </Typography>
            </Box>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                textTransform: 'none',
                px: 3.2,
                py: 0.6,
                boxShadow: 'none',
                '&:hover': { bgcolor: 'var(--color-primary-dark)', boxShadow: 'none' },
              }}
            >
              Salvar
            </Button>
          </Box>

          <DialogContent sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Field: Descrição */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: 14, height: 2, bgcolor: "var(--color-text-secondary, #7E8494)", position: 'relative', '&::before, &::after': { content: '""', position: 'absolute', width: 14, height: 2, bgcolor: "var(--color-text-secondary, #7E8494)" }, '&::before': { top: -4 }, '&::after': { top: 4 } }} />
              </Box>
              <TextField
                fullWidth
                variant="standard"
                placeholder="Descrição"
                value={name}
                onChange={(e) => setName(e.target.value)}
                InputProps={{
                  disableUnderline: false,
                  style: { color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 600 },
                }}
                sx={{
                  '& .MuiInput-underline:before': { borderBottomColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)" },
                  '& .MuiInput-underline:after': { borderBottomColor: 'var(--color-primary)' },
                }}
                required
              />
              <IconButton aria-label="Selecionar banco"
                onClick={() => setBankDialogOpen(true)}
                sx={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  p: 0,
                  '&:hover': { opacity: 0.85 },
                }}
              >
                {renderAccountLogo(icon, color, customIconUrl || undefined)}
              </IconButton>
            </Box>

            {/* Field: Saldo inicial */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', color: "var(--color-text-secondary, #7E8494)" }}>
                <Box sx={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--color-text-secondary, #7E8494)", display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>$</Box>
              </Box>
              <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.92rem', fontWeight: 500, flexGrow: 1 }}>Saldo inicial</Typography>
              <TextField
                variant="standard"
                placeholder="R$ 0,00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(maskBRL(e.target.value))}
                InputProps={{
                  disableUnderline: false,
                  style: { color: "var(--color-text-primary, #FFFFFF)", fontSize: '1.05rem', fontWeight: 700, textAlign: 'right' },
                }}
                inputProps={{
                  style: { textAlign: 'right', width: 120 },
                }}
                sx={{
                  '& .MuiInput-underline:before': { borderBottomColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)" },
                  '& .MuiInput-underline:after': { borderBottomColor: 'var(--color-primary)' },
                }}
                required
              />
              <Box sx={{ width: 34, height: 34, bgcolor: 'var(--color-surface-2)', border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)", borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: "var(--color-text-secondary, #7E8494)", flexShrink: 0 }}>
                <CalculateIcon fontSize="small" sx={{ fontSize: '1rem' }} />
              </Box>
            </Box>

            {/* Field: Cheque especial */}
            <Box display="flex" alignItems="center" gap={2} mb={3.5}>
              <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', color: "var(--color-text-secondary, #7E8494)" }}>
                <DescriptionIcon sx={{ fontSize: '1.25rem' }} />
              </Box>
              <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.92rem', fontWeight: 500, flexGrow: 1 }}>Cheque especial</Typography>
              <TextField
                variant="standard"
                placeholder="R$ 0,00"
                value={overdraft}
                onChange={(e) => setOverdraft(maskBRL(e.target.value))}
                InputProps={{
                  disableUnderline: false,
                  style: { color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 600, textAlign: 'right' },
                }}
                inputProps={{
                  style: { textAlign: 'right', width: 120 },
                }}
                sx={{
                  '& .MuiInput-underline:before': { borderBottomColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)" },
                  '& .MuiInput-underline:after': { borderBottomColor: 'var(--color-primary)' },
                }}
              />
              <Box sx={{ width: 34, flexShrink: 0 }} /> {/* Spacer */}
            </Box>

            {/* Field: Categoria */}
            <Box mb={3}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
                Categoria
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    bgcolor: `${getCategoryColor(type)}15`,
                    color: getCategoryColor(type),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getAccountTypeIcon(type)}
                </Box>
                <TextField
                  select
                  fullWidth
                  variant="standard"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  InputProps={{
                    disableUnderline: false,
                    style: { color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.92rem' },
                  }}
                  sx={{
                    '& .MuiInput-underline:before': { borderBottomColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)" },
                    '& .MuiInput-underline:after': { borderBottomColor: 'var(--color-primary)' },
                  }}
                >
                  {accountCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                  {/* Fallback menu items for compatibility with legacy data */}
                  {type && !accountCategories.find(c => c.name === type) && (
                    <MenuItem value={type}>
                      {type === 'CHECKING' ? 'Conta Corrente' : type === 'SAVINGS' ? 'Poupança' : type}
                    </MenuItem>
                  )}
                </TextField>
              </Box>
            </Box>

            {/* Field: Agrupar em */}
            <Box mb={3}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
                Agrupar em
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.04)",
                    color: "var(--color-text-primary, #FFFFFF)",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AccountIcon sx={{ fontSize: '1rem' }} />
                </Box>
                <TextField
                  select
                  fullWidth
                  variant="standard"
                  value={accountGroup}
                  onChange={(e) => setAccountGroup(e.target.value)}
                  InputProps={{
                    disableUnderline: false,
                    style: { color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.92rem' },
                  }}
                  sx={{
                    '& .MuiInput-underline:before': { borderBottomColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)" },
                    '& .MuiInput-underline:after': { borderBottomColor: 'var(--color-primary)' },
                  }}
                >
                  <MenuItem value="Nenhum">Nenhum</MenuItem>
                  <MenuItem value="Contas Bancárias">Contas Bancárias</MenuItem>
                  <MenuItem value="Investimentos">Investimentos</MenuItem>
                  <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                  <MenuItem value="Outros">Outros</MenuItem>
                </TextField>
              </Box>
            </Box>

            {/* Field: Número da conta */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', color: "var(--color-text-secondary, #7E8494)" }}>
                <TagIcon sx={{ fontSize: '1.25rem' }} />
              </Box>
              <TextField
                fullWidth
                variant="standard"
                placeholder="Número da conta"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                InputProps={{
                  disableUnderline: false,
                  style: { color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.92rem' },
                }}
                sx={{
                  '& .MuiInput-underline:before': { borderBottomColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)" },
                  '& .MuiInput-underline:after': { borderBottomColor: 'var(--color-primary)' },
                }}
              />
            </Box>

            {/* Field: Dados adicionais */}
            <Box display="flex" alignItems="center" gap={2} mb={4}>
              <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', color: "var(--color-text-secondary, #7E8494)" }}>
                <DescriptionIcon sx={{ fontSize: '1.25rem' }} />
              </Box>
              <TextField
                fullWidth
                variant="standard"
                placeholder="Dados adicionais"
                value={additionalData}
                onChange={(e) => setAdditionalData(e.target.value)}
                InputProps={{
                  disableUnderline: false,
                  style: { color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.92rem' },
                }}
                sx={{
                  '& .MuiInput-underline:before': { borderBottomColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)" },
                  '& .MuiInput-underline:after': { borderBottomColor: 'var(--color-primary)' },
                }}
              />
            </Box>

            {/* Toggle: Padrão para ser descontado */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <AccountIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.25rem' }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>Padrão para ser descontado</Typography>
              </Box>
              <Switch
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary-text)' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--color-primary)' },
                }}
              />
            </Box>

            {/* Toggle: Exibir na tela de Resumo */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <DashboardIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.25rem' }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>Exibir na tela de Resumo</Typography>
              </Box>
              <Switch
                checked={showInResume}
                onChange={(e) => setShowInResume(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary-text)' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--color-primary)' },
                }}
              />
            </Box>

            {/* Toggle: Conta para investimentos */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUpIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.25rem' }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>Conta para investimentos</Typography>
              </Box>
              <Switch
                checked={isInvestment}
                onChange={(e) => setIsInvestment(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary-text)' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--color-primary)' },
                }}
              />
            </Box>

            {/* Toggle: Ignorar nos totais */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={2}>
                <DoNotDisturbIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.25rem' }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>Ignorar nos totais</Typography>
              </Box>
              <Switch
                checked={ignoreInTotals}
                onChange={(e) => setIgnoreInTotals(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-primary-text)' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--color-primary)' },
                }}
              />
            </Box>
          </DialogContent>
        </form>
      </Dialog>

      <BankPickerDialog
        open={bankDialogOpen}
        onClose={() => setBankDialogOpen(false)}
        value={icon}
        extraOptions={GENERIC_ACCOUNT_OPTION}
        customIconUrl={customIconUrl || undefined}
        onSelect={(bankId) => {
          setIcon(bankId);
          setCustomIconUrl(null);
        }}
        onUploadImage={(dataUri) => {
          setCustomIconUrl(dataUri);
          setIcon('custom');
        }}
      />

      {/* Bottom summary bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          left: { xs: 16, md: 'calc(var(--total-sidebar-width, 100px) + 16px)' },
          right: 16,
          bgcolor: "var(--color-panel, #13141B)",
          border: "1px solid var(--color-border)",
          borderRadius: '12px',
          boxShadow: "var(--shadow-panel)",
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          zIndex: 1000,
          transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Box aria-label="Totais das contas" sx={{
          display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 210px)', sm: 'repeat(4, 210px)' },
          alignItems: 'center', gap: 3, maxWidth: '100%', overflowX: 'auto',
          '& > div': { minWidth: 0 },
          '& .MuiTypography-root': { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', overflowX: 'auto' },
          '& > div > svg, & > div > div': { flexShrink: 0 },
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <TrendingUpIcon sx={{ color: "var(--color-income, #4EBE87)", fontSize: '1.1rem' }} />
            <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600 }}>
              Receitas: <strong style={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>{formatCurrency(totalReceitas)}</strong>
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <TrendingDownIcon sx={{ color: "var(--color-expense, #E05A5A)", fontSize: '1.1rem' }} />
            <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600 }}>
              Despesas: <strong style={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>{formatCurrency(totalDespesas)}</strong>
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <AccountIcon sx={{ color: 'var(--color-primary-text)', fontSize: '1.1rem' }} />
            <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600 }}>
              Saldo: <strong style={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>{formatCurrency(totalSaldo)}</strong>
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <AccessTimeIcon sx={{ color: "var(--color-text-secondary, #6F768E)", fontSize: '1.1rem' }} />
            <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600 }}>
              Previsto: <strong style={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>{formatCurrency(totalPrevisto)}</strong>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AccountsPage;
