import RepeatConfigDialog from '../../components/RepeatConfigDialog';
import RecurrenceDialog from '../../components/RecurrenceDialog';
import { TransactionField, TransactionAmountField, transactionPaperSx, transactionHeaderSx, transactionContentSx, transactionColumnsSx, transactionPanelSx, transactionHeadingSx } from '../../components/TransactionFormLayout';
import { buildSummaryCharts } from './summaryCharts';
import CardBrandLogo from '../../components/CardBrandLogo';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../../config/api';
import { roundCurrency } from '../../utils/currency';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Switch,
  Avatar,
  LinearProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  CreditCard as CardIcon,
  MoreHoriz as OptionsIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  SaveOutlined as SaveIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as ClockIcon,
  Lock as LockIcon,
  Edit as EditIcon,
  EventBusy as EventBusyIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingDown as ExpenseTypeIcon,
  TrendingUp as RevenueTypeIcon,
  SwapHoriz as TransferTypeIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getCategoryIcon } from '../../utils/categoryIcons';
import CategoryIconPickerDialog from '../../components/CategoryIconPickerDialog';
import ColorPickerPopover from '../../components/ColorPickerPopover';
import BankLogo from '../../components/BankLogo';
import CardStatementDialog from '../../components/CardStatementDialog';
import TransactionsPage from '../transactions/TransactionsPage';
import { usePageScrollRestoration } from '../../hooks/usePageScrollRestoration';
import { getFirstOpenInvoice, getInvoiceOptions, getInvoicePeriod, isInvoiceClosed, nextMonth as nextInvoiceMonth } from '../../utils/cardInvoice';
import { editableTransactionDescription } from '../../utils/transactionDescription';

interface Account {
  id: string;
  name: string;
  institution: string;
  balanceInitial: number;
  balanceCurrent: number;
  color: string;
  type: string;
  active: boolean;
  isDefault?: boolean;
  ignoreInTotals?: boolean;
  createdAt?: string;
  icon?: string;
  customIconUrl?: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  parentCategoryId?: string;
  color?: string;
  icon?: string;
}

interface CreditCard {
  id: string;
  accountId?: string | null;
  name: string;
  bank: string;
  brand: string;
  limitTotal: number;
  limitAvailable: number;
  limitUsed: number;
  closingDay: number;
  dueDay: number;
  isMain?: boolean;
  customIconUrl?: string;
}

interface Goal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  status: string; // ACTIVE, COMPLETED, ABANDONED
}

interface Budget {
  id: string;
  categoryId: string;
  categoryIds?: string[];
  categoryName: string;
  limitValue: number;
  currentValue: number;
  month: number;
  year: number;
  displayOrder?: number;
  name?: string | null;
  color?: string | null;
  icon?: string | null;
  settings?: { showOnSummary?: boolean; [key: string]: unknown };
}

interface Installment {
  installmentNumber: number;
  totalInstallments: number;
  value: number;
  status: string;
}

interface Transaction {
  id: string;
  recurrenceGroupId?: string;
  accountId?: string;
  destinationAccountId?: string;
  categoryId: string;
  creditCardId?: string;
  value: number;
  date: string;
  type: 'REVENUE' | 'EXPENSE' | 'TRANSFER';
  description: string;
  notes?: string;
  tags?: string;
  effective: boolean;
  effectiveDate?: string;
  dueDate?: string;
  installments?: Installment[];
}

const AVAILABLE_COLORS = [
  { value: '#EC407A', label: 'Rosa' },
  { value: '#5C6BC0', label: 'Azul Escuro' },
  { value: '#26A69A', label: 'Verde Água' },
  { value: '#26C6DA', label: 'Azul Claro' },
  { value: '#42A5F5', label: 'Azul' },
  { value: '#AB47BC', label: 'Roxo' },
  { value: '#66BB6A', label: 'Verde' },
  { value: '#FFCA28', label: 'Amarelo' },
  { value: '#7E57C2', label: 'Roxo Escuro' },
  { value: '#7E8494', label: 'Cinza' },
];

const CARD_WEEKDAYS_SHORT = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

const formatCardDateWithWeekday = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}, ${CARD_WEEKDAYS_SHORT[date.getDay()]}`;

const Resume: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [_goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Menu de ações (Editar/Excluir) da tabela de Cartões de crédito
  const [cardActionsAnchor, setCardActionsAnchor] = useState<null | HTMLElement>(null);
  const [cardActionsTarget, setCardActionsTarget] = useState<string | null>(null);

  // Dialog open/close states
  const [accountOpen, setAccountOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [summaryComposer, setSummaryComposer] = useState<{
    type: 'REVENUE' | 'EXPENSE' | 'TRANSFER';
    cardId?: string;
    dueDate?: string;
    isCardExpense: boolean;
    refund?: boolean;
  } | null>(null);
  const [isCardExpense, setIsCardExpense] = useState(false);

  // Custom Date/Time picker states
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [tempHour, setTempHour] = useState(() => new Date().getHours());
  const [tempMinute, setTempMinute] = useState(() => new Date().getMinutes());
  const [timePickerMode, setTimePickerMode] = useState<'HOURS' | 'MINUTES'>('HOURS');
  const [timePickerViewMode, setTimePickerViewMode] = useState<'DIAL' | 'KEYBOARD'>('DIAL');
  const [focusedField, setFocusedField] = useState<'HOURS' | 'MINUTES' | null>(null);
  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const [rawHourStr, setRawHourStr] = useState(() => String(new Date().getHours()).padStart(2, '0'));
  const [rawMinuteStr, setRawMinuteStr] = useState(() => String(new Date().getMinutes()).padStart(2, '0'));
  const [txTimeVal, setTxTimeVal] = useState(() => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  });

  useEffect(() => {
    if (focusedField !== 'HOURS') {
      setRawHourStr(tempHour.toString().padStart(2, '0'));
    }
  }, [tempHour, focusedField]);

  useEffect(() => {
    if (focusedField !== 'MINUTES') {
      setRawMinuteStr(tempMinute.toString().padStart(2, '0'));
    }
  }, [tempMinute, focusedField]);

  // Form states: Account
  const [accName, setAccName] = useState('');
  const [accInstitution, setAccInstitution] = useState('');
  const [accInitialBalance, setAccInitialBalance] = useState('R$ 0,00');
  const [accColor, setAccColor] = useState('#a3e2d7');
  const [accType, setAccType] = useState('CHECKING');

  // Form states: Credit Card
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [cardBrand, setCardBrand] = useState('VISA');
  const [cardLimit, setCardLimit] = useState('R$ 0,00');
  const [cardClosingDay, setCardClosingDay] = useState(5);
  const [cardDueDay, setCardDueDay] = useState(10);

  // Form states: Budget
  const [bgCategoryId, setBgCategoryId] = useState('');
  const [bgLimit, setBgLimit] = useState('R$ 0,00');
  const [bgMonth, setBgMonth] = useState(new Date().getMonth() + 1);
  const [bgYear, setBgYear] = useState(new Date().getFullYear());

  // Form states: Goal
  const [goalName, setGoalName] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTarget, setGoalTarget] = useState('R$ 0,00');
  const [goalCurrent, setGoalCurrent] = useState('R$ 0,00');
  const [goalDeadline, setGoalDeadline] = useState('');

  // Form states: Transaction
  const [txDesc, setTxDesc] = useState('');
  const [descriptionSuggestionsOpen, setDescriptionSuggestionsOpen] = useState(false);
  const [txValue, setTxValue] = useState('R$ 0,00');

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
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDueDate, setTxDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'REVENUE' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [txAccountId, setTxAccountId] = useState('');
  const [txDestAccountId, setTxDestAccountId] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txSubcategoryId, setTxSubcategoryId] = useState('');
  const [txCardId, setTxCardId] = useState('');
  const linkedCardAccountId = txType === 'EXPENSE' && txCardId ? cards.find((card) => card.id === txCardId)?.accountId : undefined;
  const selectedTxAccountId = linkedCardAccountId || txAccountId;
  const [txNotes, setTxNotes] = useState('');
  const [txTags, setTxTags] = useState('');
  const [txEffective, setTxEffective] = useState(true);
  const [txEffectiveDate, setTxEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [datePickerTarget, setDatePickerTarget] = useState<'VENCIMENTO' | 'EFETIVACAO' | 'LANCAMENTO'>('VENCIMENTO');
  const isEditing = false;

  // Recurrence states
  const [recurrenceType, setRecurrenceType] = useState<'NP' | 'PARCELADA' | 'FIXA'>('NP');
  const [startInstallment, setStartInstallment] = useState<number>(1);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [periodicity, setPeriodicity] = useState<string>('mensal');
  const [valueType, setValueType] = useState<'total' | 'parcela'>('total');
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [repeatConfigDialogOpen, setRepeatConfigDialogOpen] = useState(false);

  // Quick creation dialog states
  const [quickCatOpen, setQuickCatOpen] = useState(false);
  const [quickSubOpen, setQuickSubOpen] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatColor, setQuickCatColor] = useState('#7E8494');
  const [quickCatIcon, setQuickCatIcon] = useState('HelpIcon');
  const [quickSubName, setQuickSubName] = useState('');
  const [quickSubColor, setQuickSubColor] = useState('#7E8494');
  const [quickSubIcon, setQuickSubIcon] = useState('HelpIcon');
  const [quickIconPickerOpen, setQuickIconPickerOpen] = useState(false);
  const [quickColorAnchor, setQuickColorAnchor] = useState<null | HTMLElement>(null);

  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: quickCatName,
        type: txType,
        color: quickCatColor,
        icon: quickCatIcon || 'CategoryIcon',
      };
      const res = await api.post('/categories', payload);
      setCategories((prev) => [...prev, res.data]);
      setTxCategoryId(res.data.id);
      setTxSubcategoryId('');
      setQuickCatName('');
      setQuickCatOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar categoria rápida.');
    }
  };

  const handleQuickCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txCategoryId) return;
    try {
      const parent = categories.find(c => c.id === txCategoryId);
      const payload = {
        name: quickSubName,
        type: txType,
        parentCategoryId: txCategoryId,
        color: quickSubColor || parent?.color || "var(--color-text-secondary, #7E8494)",
        icon: quickSubIcon || 'SubcategoryIcon',
      };
      const res = await api.post('/categories', payload);
      setCategories((prev) => [...prev, res.data]);
      setTxSubcategoryId(res.data.id);
      setQuickSubName('');
      setQuickSubOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar subcategoria rápida.');
    }
  };

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [accRes, catRes, txRes, cardRes, goalRes, budgetRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
        api.get('/transactions'),
        api.get('/cards'),
        api.get('/goals'),
        api.get('/budgets'),
      ]);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setTransactions(txRes.data);
      setCards(cardRes.data);
      setGoals(goalRes.data);
      setBudgets(budgetRes.data);
    } catch (err) {
      setError('Falha ao carregar dados do resumo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const refresh = () => { void fetchData(true); };
    window.addEventListener('summary:refresh', refresh);
    return () => window.removeEventListener('summary:refresh', refresh);
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/accounts', {
        name: accName,
        institution: accInstitution,
        balanceInitial: parseBRLToFloat(accInitialBalance),
        color: accColor,
        type: accType,
      });
      setAccountOpen(false);
      setAccName('');
      setAccInstitution('');
      setAccInitialBalance('R$ 0,00');
      setAccColor('#4ECDC4');
      setAccType('CHECKING');
      fetchData();
    } catch (err) {
      alert('Erro ao criar conta.');
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cards', {
        name: cardName,
        bank: cardBank,
        brand: cardBrand,
        limitTotal: parseBRLToFloat(cardLimit),
        closingDay: cardClosingDay,
        dueDay: cardDueDay,
      });
      setCardOpen(false);
      setCardName('');
      setCardBank('');
      setCardBrand('VISA');
      setCardLimit('R$ 0,00');
      fetchData();
    } catch (err) {
      alert('Erro ao cadastrar cartão.');
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/budgets', {
        categoryId: bgCategoryId,
        limitValue: parseBRLToFloat(bgLimit),
        month: bgMonth,
        year: bgYear,
      });
      setBudgetOpen(false);
      setBgCategoryId('');
      setBgLimit('R$ 0,00');
      fetchData();
    } catch (err) {
      alert('Erro ao criar orçamento.');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/goals', {
        name: goalName,
        description: goalDesc,
        targetValue: parseBRLToFloat(goalTarget),
        currentValue: parseBRLToFloat(goalCurrent),
        deadline: goalDeadline || null,
        status: 'ACTIVE',
      });
      setGoalOpen(false);
      setGoalName('');
      setGoalDesc('');
      setGoalTarget('R$ 0,00');
      setGoalCurrent('R$ 0,00');
      setGoalDeadline('');
      fetchData();
    } catch (err) {
      alert('Erro ao criar meta.');
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/transactions', {
        description: txDesc,
        value: parseBRLToFloat(txValue),
        date: txDate,
        type: txType,
        accountId: selectedTxAccountId || null,
        destinationAccountId: txType === 'TRANSFER' ? txDestAccountId : null,
        categoryId: txSubcategoryId || txCategoryId || null,
        creditCardId: txType === 'EXPENSE' && txCardId ? txCardId : null,
        notes: txNotes,
        tags: txTags,
        dueDate: txDueDate || null,
        installmentsCount: recurrenceType === 'PARCELADA' ? installmentsCount : null,
        effective: txEffective,
        effectiveDate: txEffective ? txEffectiveDate : null,
        recurrenceType: recurrenceType,
        startInstallment: recurrenceType === 'PARCELADA' ? startInstallment : null,
        periodicity: recurrenceType === 'PARCELADA' ? periodicity : null,
        valueType: recurrenceType === 'PARCELADA' ? valueType : null,
      });
      handleCloseTransactionModal();
      setTxDesc('');
      setTxValue('R$ 0,00');
      setTxDate(new Date().toISOString().split('T')[0]);
      setTxType('EXPENSE');
      setTxAccountId('');
      setTxDestAccountId('');
      setTxCategoryId('');
      setTxSubcategoryId('');
      setTxCardId('');
      setTxNotes('');
      setTxTags('');
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTxTimeVal(`${hrs}:${mins}`);
      setTempHour(now.getHours());
      setTempMinute(now.getMinutes());
      setRawHourStr(hrs);
      setRawMinuteStr(mins);
      setTxEffective(true);
      setTxEffectiveDate(new Date().toISOString().split('T')[0]);
      setTxDueDate(new Date().toISOString().split('T')[0]);
      setRecurrenceType('NP');
      setStartInstallment(1);
      setInstallmentsCount(2);
      setPeriodicity('mensal');
      setValueType('total');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao registrar transação.');
    }
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;
  const queryYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
  const openDetail = (target: string) => {
    const [pathname, search = ''] = target.split('?');
    const params = new URLSearchParams(search);
    if (!params.has('month')) params.set('month', String(queryMonth));
    if (!params.has('year')) params.set('year', String(queryYear));
    navigate(`${pathname}?${params}`, { state: { backgroundLocation: location } });
  };

  // Sync global header transaction parameter with modal trigger
  useEffect(() => {
    if (searchParams.get('new_tx') === 'true') {
      if (loading) return;
      setTransactionOpen(false);
      setDescriptionSuggestionsOpen(false);
      const typeParam = searchParams.get('tx_type');
      let targetType: 'REVENUE' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE';
      let targetCardId = '';
      let isCard = false;
      let targetDueDate = new Date().toISOString().split('T')[0];

      if (typeParam === 'REVENUE') {
        targetType = 'REVENUE';
      } else if (typeParam === 'TRANSFER') {
        targetType = 'TRANSFER';
      } else if (typeParam === 'EXPENSE_CARD') {
        targetType = 'EXPENSE';
        isCard = true;
        const mainCard = cards.find((c) => c.isMain) || cards[0];
        if (mainCard) {
          targetCardId = mainCard.id;
          targetDueDate = getFirstOpenInvoice(mainCard, new Date()).dueDateISO;
        }
      } else if (typeParam === 'EXPENSE') {
        targetType = 'EXPENSE';
      }

      setSummaryComposer({
        type: targetType,
        cardId: targetCardId || undefined,
        dueDate: targetDueDate,
        isCardExpense: isCard,
        refund: isCard && searchParams.get('refund') === 'true',
      });

      setTxType(targetType);
      setTxCardId(targetCardId);
      setIsCardExpense(isCard);

      // Pre-select account/dest
      const defaultAccount = accounts.find((acc) => acc.isDefault) || accounts[0];
      if (defaultAccount) setTxAccountId(defaultAccount.id);
      if (targetType === 'TRANSFER') {
        const otherAccount = accounts.find((acc) => acc.id !== defaultAccount?.id) || accounts[1];
        if (otherAccount) setTxDestAccountId(otherAccount.id);
      } else if (defaultAccount) {
        setTxDestAccountId(defaultAccount.id);
      }

      // Pre-select first category matching the type (top-level only, same filter used by the category dropdown)
      const filteredCats = categories.filter(
        (cat) => (targetType === 'TRANSFER' || cat.type === targetType) && !cat.parentCategoryId
      );
      if (filteredCats.length > 0) {
        const needsNewCategory = !txCategoryId || !filteredCats.some(c => c.id === txCategoryId);
        const activeCategoryId = needsNewCategory ? filteredCats[0].id : txCategoryId;
        if (needsNewCategory) {
          setTxCategoryId(activeCategoryId);
        }
        const validSubcategories = categories.filter((c) => c.parentCategoryId === activeCategoryId);
        if (needsNewCategory || !validSubcategories.some(c => c.id === txSubcategoryId)) {
          setTxSubcategoryId(validSubcategories[0]?.id || '');
        }
      }

      setTxDate(new Date().toISOString().split('T')[0]);
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTxTimeVal(`${hrs}:${mins}`);
      setTempHour(now.getHours());
      setTempMinute(now.getMinutes());
      setRawHourStr(hrs);
      setRawMinuteStr(mins);
      // Despesa de cartão só é efetivada quando a fatura é paga (por isso o
      // controle "Efetivada" nem aparece nesse fluxo) — até lá, o mês em que
      // ela aparece é definido pela Fatura escolhida (dueDate), não por uma
      // data de efetivação.
      setTxEffective(!isCard);
      setTxEffectiveDate(new Date().toISOString().split('T')[0]);
      setTxDueDate(targetDueDate);
      setRecurrenceType('NP');
      setStartInstallment(1);
      setInstallmentsCount(2);
      setPeriodicity('mensal');
      setValueType('total');
    } else {
      setTransactionOpen(false);
      setSummaryComposer(null);
    }
  }, [searchParams, cards, accounts, categories, loading]);

  // Dynamic values filtered by the Month/Year navigator
  const isBeforeQueryMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const [y, m] = dateStr.split('-').map(Number);
    if (y < queryYear) return true;
    if (y === queryYear && m < queryMonth) return true;
    return false;
  };

  const isDuringQueryMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const [y, m] = dateStr.split('-').map(Number);
    return y === queryYear && m === queryMonth;
  };

  const getActiveDate = (t: Transaction) => t.effective && t.effectiveDate ? t.effectiveDate : (t.dueDate || t.date);

  const filteredTransactions = transactions.filter((t) => isDuringQueryMonth(getActiveDate(t)));

  const totalIncome = roundCurrency(filteredTransactions
    .filter((t) => t.type === 'REVENUE')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0));

  const totalExpense = roundCurrency(filteredTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0));
  const totalTransfers = roundCurrency(filteredTransactions
    .filter((t) => t.type === 'TRANSFER')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0));
  const totalFaturas = roundCurrency(cards.reduce((acc, curr) => acc + Number(curr.limitUsed || 0), 0));

  const isAccountActiveInQueryMonth = (createdAtStr?: string) => {
    if (!createdAtStr) return true;
    const [datePart] = createdAtStr.split('T');
    const [y, m] = datePart.split('-').map(Number);
    if (y < queryYear) return true;
    if (y === queryYear && m <= queryMonth) return true;
    return false;
  };

  const activeAccounts = accounts.filter((a) => !a.ignoreInTotals);
  const startingBalance = roundCurrency(activeAccounts
    .filter((a) => isAccountActiveInQueryMonth(a.createdAt))
    .reduce((sum, a) => sum + Number(a.balanceInitial || 0), 0));

  // Cumulative sums for previous months and current month
  let deltaBefore = 0;
  let deltaEffectiveBefore = 0;
  transactions.forEach((t) => {
    if (t.accountId) {
      const acc = accounts.find((a) => a.id === t.accountId);
      if (acc?.ignoreInTotals) return;
      if (!isAccountActiveInQueryMonth(acc?.createdAt)) return;
    }
    const actDate = getActiveDate(t);
    if (isBeforeQueryMonth(actDate)) {
      const val = Number(t.value || 0);
      if (t.type === 'REVENUE') {
        deltaBefore += val;
        deltaEffectiveBefore += val;
      } else if (t.type === 'EXPENSE') {
        deltaBefore -= val;
        deltaEffectiveBefore -= val;
      }
    }
  });

  let deltaDuring = 0;
  let deltaEffectiveDuring = 0;
  transactions.forEach((t) => {
    if (t.accountId) {
      const acc = accounts.find((a) => a.id === t.accountId);
      if (acc?.ignoreInTotals) return;
      if (!isAccountActiveInQueryMonth(acc?.createdAt)) return;
    }
    const actDate = getActiveDate(t);
    if (isDuringQueryMonth(actDate)) {
      const val = Number(t.value || 0);
      if (t.type === 'REVENUE') {
        deltaDuring += val;
        if (t.effective) deltaEffectiveDuring += val;
      } else if (t.type === 'EXPENSE') {
        deltaDuring -= val;
        if (t.effective) deltaEffectiveDuring -= val;
      }
    }
  });

  const initialBalance = roundCurrency(startingBalance + deltaBefore);
  const forecastBalance = roundCurrency(initialBalance + deltaDuring);
  const totalBalance = roundCurrency(startingBalance + deltaEffectiveBefore + deltaEffectiveDuring);

  // Previous Month calculations for indicators
  const getPrevMonthYear = () => {
    let pm = queryMonth - 1;
    let py = queryYear;
    if (pm === 0) {
      pm = 12;
      py = queryYear - 1;
    }
    return { prevMonth: pm, prevYear: py };
  };
  const { prevMonth, prevYear } = getPrevMonthYear();

  const isPrevMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const [y, m] = dateStr.split('-').map(Number);
    return y === prevYear && m === prevMonth;
  };

  const prevMonthTransactions = transactions.filter((t) => isPrevMonth(getActiveDate(t)));

  const prevMonthIncome = roundCurrency(prevMonthTransactions
    .filter((t) => t.type === 'REVENUE')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0));

  const prevMonthExpense = roundCurrency(prevMonthTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0));

  const prevMonthTransfers = roundCurrency(prevMonthTransactions
    .filter((t) => t.type === 'TRANSFER')
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0));

  // Delta before previous month to find starting balance of previous month
  const isBeforePrevMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const [y, m] = dateStr.split('-').map(Number);
    if (y < prevYear) return true;
    if (y === prevYear && m < prevMonth) return true;
    return false;
  };

  let deltaEffectiveBeforePrev = 0;
  transactions.forEach((t) => {
    if (t.accountId) {
      const acc = accounts.find((a) => a.id === t.accountId);
      if (acc?.ignoreInTotals) return;
      if (!isAccountActiveInQueryMonth(acc?.createdAt)) return;
    }
    if (isBeforePrevMonth(t.date)) {
      const val = Number(t.value || 0);
      if (t.type === 'REVENUE') deltaEffectiveBeforePrev += val;
      if (t.type === 'EXPENSE') deltaEffectiveBeforePrev -= val;
    }
  });

  const prevStartingBalance = roundCurrency(activeAccounts
    .filter((a) => {
      if (!a.createdAt) return true;
      const [datePart] = a.createdAt.split('T');
      const [y, m] = datePart.split('-').map(Number);
      if (y < prevYear) return true;
      if (y === prevYear && m <= prevMonth) return true;
      return false;
    })
    .reduce((sum, a) => sum + Number(a.balanceInitial || 0), 0));

  let deltaEffectiveDuringPrev = 0;
  prevMonthTransactions.forEach((t) => {
    if (t.accountId) {
      const acc = accounts.find((a) => a.id === t.accountId);
      if (acc?.ignoreInTotals) return;
    }
    const val = Number(t.value || 0);
    if (t.type === 'REVENUE' && t.effective) deltaEffectiveDuringPrev += val;
    if (t.type === 'EXPENSE' && t.effective) deltaEffectiveDuringPrev -= val;
  });

  const prevMonthBalance = roundCurrency(prevStartingBalance + deltaEffectiveBeforePrev + deltaEffectiveDuringPrev);

  // Percentage badge generation helpers
  const getPercentageBadge = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { text: '0% vs. mês anterior', direction: 'up' as const, type: 'blue' as const };
      return { text: '100% vs. mês anterior', direction: 'up' as const, type: 'green' as const };
    }
    const pct = ((current - previous) / previous) * 100;
    const direction = pct >= 0 ? ('up' as const) : ('down' as const);
    const type = pct >= 0 ? ('green' as const) : ('red' as const);
    return {
      text: `${Math.abs(Math.round(pct))}% vs. mês anterior`,
      direction,
      type
    };
  };

  const getExpensePercentageBadge = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { text: '0% vs. mês anterior', direction: 'down' as const, type: 'green' as const };
      return { text: '100% vs. mês anterior', direction: 'up' as const, type: 'red' as const };
    }
    const pct = ((current - previous) / previous) * 100;
    const direction = pct >= 0 ? ('up' as const) : ('down' as const);
    const type = pct >= 0 ? ('red' as const) : ('green' as const);
    return {
      text: `${Math.abs(Math.round(pct))}% vs. mês anterior`,
      direction,
      type
    };
  };

  const getBalancePercentageBadge = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { text: '0% vs. mês anterior', direction: 'up' as const, type: 'blue' as const };
      return { text: '100% vs. mês anterior', direction: 'up' as const, type: 'green' as const };
    }
    const pct = ((current - previous) / previous) * 100;
    const direction = pct >= 0 ? ('up' as const) : ('down' as const);
    const type = pct >= 0 ? ('green' as const) : ('red' as const);
    return {
      text: `${Math.abs(Math.round(pct))}% vs. mês anterior`,
      direction,
      type
    };
  };

  const comparisonBalance = prevStartingBalance === 0 ? initialBalance : prevMonthBalance;
  const balanceBadge = getBalancePercentageBadge(totalBalance, comparisonBalance);
  const incomeBadge = getPercentageBadge(totalIncome, prevMonthIncome);
  const expenseBadge = getExpensePercentageBadge(totalExpense, prevMonthExpense);
  const movementsBadge = getPercentageBadge(totalTransfers, prevMonthTransfers);

  const summaryCharts = buildSummaryCharts(transactions, categories, queryMonth, queryYear);
  const summaryExpenseBudgets = budgets
    .filter((budget) => budget.month === queryMonth
      && budget.year === queryYear
      && budget.settings?.showOnSummary === true
      && categories.find((category) => category.id === budget.categoryId)?.type === 'EXPENSE')
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      || (a.name || a.categoryName).localeCompare(b.name || b.categoryName, 'pt-BR'));
  const summaryBudgetTotals = summaryExpenseBudgets.reduce((total, budget) => ({
    limit: total.limit + Number(budget.limitValue || 0),
    current: total.current + Number(budget.currentValue || 0),
  }), { limit: 0, current: 0 });
  const summaryBudgetUtilization = summaryBudgetTotals.limit > 0
    ? summaryBudgetTotals.current / summaryBudgetTotals.limit * 100
    : 0;

  const getAccountSummary = () => {
    return activeAccounts.map((acc) => {
      // Calculate Starting Balance (prior transactions)
      let deltaBefore = 0;
      transactions.forEach((t) => {
        const actDate = getActiveDate(t);
        if (isBeforeQueryMonth(actDate)) {
          const val = Number(t.value || 0);
          if (t.accountId === acc.id) {
            if (t.type === 'REVENUE') deltaBefore += val;
            else if (t.type === 'EXPENSE') deltaBefore -= val;
            else if (t.type === 'TRANSFER') deltaBefore -= val;
          }
          if (t.destinationAccountId === acc.id && t.type === 'TRANSFER') {
            deltaBefore += val;
          }
        }
      });
      const startingBal = Number(acc.balanceInitial || 0) + deltaBefore;

      let receitas = 0;
      let despesas = 0;
      let transfersOut = 0;
      let transfersIn = 0;

      let receitasEffective = 0;
      let despesasEffective = 0;
      let transfersOutEffective = 0;
      let transfersInEffective = 0;

      transactions.forEach((t) => {
        const actDate = getActiveDate(t);
        if (isDuringQueryMonth(actDate)) {
          const val = Number(t.value || 0);
          if (t.accountId === acc.id) {
            if (t.type === 'REVENUE') {
              receitas += val;
              if (t.effective) receitasEffective += val;
            } else if (t.type === 'EXPENSE') {
              despesas += val;
              if (t.effective) despesasEffective += val;
            } else if (t.type === 'TRANSFER') {
              transfersOut += val;
              if (t.effective) transfersOutEffective += val;
            }
          }
          if (t.destinationAccountId === acc.id && t.type === 'TRANSFER') {
            transfersIn += val;
            if (t.effective) transfersInEffective += val;
          }
        }
      });

      // Saldo (Effective Ending Balance of this month)
      const saldo = startingBal + receitasEffective - despesasEffective - transfersOutEffective + transfersInEffective;

      // Previsto (Forecasted Ending Balance of this month)
      const previsto = startingBal + receitas - despesas - transfersOut + transfersIn;

      return {
        id: acc.id,
        name: acc.name,
        institution: acc.institution,
        color: acc.color,
        icon: acc.icon,
        customIconUrl: acc.customIconUrl,
        receitas: roundCurrency(receitas),
        despesas: roundCurrency(despesas),
        saldo: roundCurrency(saldo),
        previsto: roundCurrency(previsto)
      };
    });
  };
  const accountSummary = getAccountSummary();

  // Fatura = a fatura com vencimento no mês/ano exibido no dashboard (queryMonth/
  // queryYear); Próxima = a fatura seguinte, ainda em formação. O status
  // (fechada/aberta) compara a data de fechamento dessa fatura com a data real
  // de hoje, não com o mês selecionado no dashboard.
  const getCardSummary = () => {
    const today = new Date();
    const invoiceSummary = (cardId: string, dueMonth: number, dueYear: number) => {
      const invoiceTransactions = transactions
          .filter((t) => t.creditCardId === cardId)
          .filter((t) => {
            const [y, m] = getActiveDate(t).split('-').map(Number);
            return y === dueYear && m === dueMonth;
          });
      return {
        total: roundCurrency(invoiceTransactions.reduce((sum, t) => sum + Number(t.value || 0), 0)),
        paid: invoiceTransactions.length > 0 && invoiceTransactions.every((t) => t.effective),
      };
    };

    return cards.map((c) => {
      const { closingDate, dueDate } = getInvoicePeriod(c, queryMonth, queryYear);
      const { month: nextMonthNum, year: nextYearNum } = nextInvoiceMonth(queryMonth, queryYear);
      const currentInvoice = invoiceSummary(c.id, queryMonth, queryYear);

      return {
        id: c.id,
        name: c.name,
        bank: c.bank,
        brand: c.brand,
        customIconUrl: c.customIconUrl,
        closingDate,
        dueDate,
        closed: isInvoiceClosed(closingDate, today),
        paid: currentInvoice.paid,
        fatura: currentInvoice.total,
        proxima: invoiceSummary(c.id, nextMonthNum, nextYearNum).total,
      };
    });
  };
  const cardSummary = getCardSummary();
  usePageScrollRestoration(!loading);
  const [statementTarget, setStatementTarget] = useState<{ card: CreditCard; month: number; year: number } | null>(null);
  const [statementComposer, setStatementComposer] = useState<{ cardId: string; dueDate: string; refund: boolean; transactionId?: string } | null>(null);

  const openCardStatement = (cardId: string, next = false) => {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    const period = next ? nextInvoiceMonth(queryMonth, queryYear) : { month: queryMonth, year: queryYear };
    setStatementTarget({ card, ...period });
  };

  const addFromStatement = (dueDate: string, refund = false) => {
    if (!statementTarget) return;
    setStatementComposer({ cardId: statementTarget.card.id, dueDate, refund });
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Deseja realmente excluir este cartão?')) return;
    try {
      await api.delete(`/cards/${cardId}`);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch {
      alert('Erro ao excluir cartão.');
    }
  };

  const handleCloseTransactionModal = () => {
    setTransactionOpen(false);
    setDescriptionSuggestionsOpen(false);
    setSearchParams((prev) => {
      prev.delete('new_tx');
      prev.delete('tx_type');
      return prev;
    });
  };

  const handleCloseSummaryComposer = () => {
    setSummaryComposer(null);
    setSearchParams((prev) => {
      prev.delete('new_tx');
      prev.delete('tx_type');
      prev.delete('card_id');
      prev.delete('invoice_due_date');
      prev.delete('refund');
      return prev;
    }, { replace: true });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // ── Custom Sub-Components ──────────────────────────────────
  const MiniMetricCard = ({ value, label, icon, iconBg, iconColor, badgeText, badgeDirection, valueColor = 'text.primary', badgeType = 'blue', onClick }: any) => {
    const isUp = badgeDirection === 'up';
    let badgeBgColor = 'rgba(var(--color-primary-rgb), 0.1)';
    let badgeTxtColor = 'var(--color-primary-text)';
    if (badgeType === 'green') {
      badgeBgColor = 'rgba(78, 190, 135, 0.1)';
      badgeTxtColor = 'var(--color-income, #4EBE87)';
    } else if (badgeType === 'red') {
      badgeBgColor = 'rgba(224, 90, 90, 0.1)';
      badgeTxtColor = 'var(--color-expense, #E05A5A)';
    } else if (badgeType === 'yellow') {
      badgeBgColor = 'rgba(244, 162, 97, 0.1)';
      badgeTxtColor = 'var(--color-warning, #F4A261)';
    }

    return (
      <Card
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={label}
        onKeyDown={(event) => {
          if (onClick && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onClick();
          }
        }}
        sx={{
          minWidth: 0,
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
          height: '100%',
          bgcolor: "var(--color-panel, #111217)",
          border: "1px solid var(--color-border)",
          cursor: onClick ? 'pointer' : 'default',
          transition: 'border-color 0.15s ease',
          '&:hover': onClick ? { borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.12)" } : undefined,
        }}
      >
        <CardContent sx={{ p: { xs: 1.75, sm: 2 }, '&:last-child': { pb: 2 }, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: iconBg, color: iconColor, width: 48, height: 48 }}>
              {icon}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: valueColor, fontSize: '1.25rem', lineHeight: 1.2, overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--color-text-secondary, #7E8494)", display: 'block', fontSize: '0.78rem', fontWeight: 500, mt: 0.25 }}>
                {label}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: badgeBgColor, color: badgeTxtColor, borderRadius: '6px', px: 1, py: 0.25, fontSize: '0.68rem', fontWeight: 600 }}>
              {isUp ? '↗' : '↘'} {badgeText}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const getThemeColor = () => {
    if (txType === 'REVENUE') return '#4EBE87';
    if (txType === 'TRANSFER') return '#F4A261';
    if (isCardExpense) return '#394BBF';
    return '#E05A5A';
  };

  const normalizeDescription = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const similarTransactions = txDesc.trim().length >= 2
    ? transactions
      .filter((transaction) => transaction.type === txType
        && (txType !== 'EXPENSE' || Number(transaction.value) >= 0)
        && transaction.description?.trim())
      .map((transaction) => {
        const query = normalizeDescription(txDesc);
        const description = normalizeDescription(editableTransactionDescription(transaction.description));
        const queryWords = query.split(' ').filter((word) => word.length >= 2);
        const matchingWords = queryWords.filter((word) => description.includes(word)).length;
        const isSimilar = description.includes(query) || query.includes(description)
          || (queryWords.length > 0 && matchingWords / queryWords.length >= 0.6);
        return { transaction, isSimilar, matchingWords };
      })
      .filter((item) => item.isSimilar)
      .sort((a, b) => b.matchingWords - a.matchingWords || (b.transaction.date || '').localeCompare(a.transaction.date || ''))
      .slice(0, 8)
      .map((item) => item.transaction)
    : [];

  const applyTransactionTemplate = (transaction: Transaction) => {
    setTxDesc(editableTransactionDescription(transaction.description));
    setTxValue(formatBRL(Math.abs(Number(transaction.value) || 0)));

    const linkedAccountId = cards.find((card) => card.id === transaction.creditCardId)?.accountId;
    const accountId = linkedAccountId || transaction.accountId;
    if (accountId && accounts.some((account) => account.id === accountId)) setTxAccountId(accountId);
    if (txType === 'TRANSFER' && transaction.destinationAccountId
      && accounts.some((account) => account.id === transaction.destinationAccountId)) {
      setTxDestAccountId(transaction.destinationAccountId);
    }

    const category = categories.find((item) => item.id === transaction.categoryId);
    if (category) {
      if (category.parentCategoryId) {
        setTxCategoryId(category.parentCategoryId);
        setTxSubcategoryId(category.id);
      } else {
        setTxCategoryId(category.id);
        setTxSubcategoryId('');
      }
    }
    if (isCardExpense && transaction.creditCardId
      && cards.some((card) => card.id === transaction.creditCardId)) {
      setTxCardId(transaction.creditCardId);
    }
    setTxNotes(transaction.notes || '');
    setTxTags(transaction.tags || '');
    setTxEffective(transaction.effective ?? true);
  };

  const renderDescriptionInput = () => (
    <Autocomplete
      fullWidth
      options={similarTransactions}
      value={null}
      inputValue={txDesc}
      open={descriptionSuggestionsOpen && txDesc.trim().length >= 2 && similarTransactions.length > 0}
      filterOptions={(options) => options}
      getOptionLabel={(option) => editableTransactionDescription(option.description)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setTxDesc(value);
          setDescriptionSuggestionsOpen(reason === 'input' && value.trim().length >= 2);
        }
      }}
      onClose={() => setDescriptionSuggestionsOpen(false)}
      onChange={(_, transaction) => {
        if (transaction && transaction.type === txType
          && (txType !== 'EXPENSE' || Number(transaction.value) >= 0)) {
          applyTransactionTemplate(transaction);
          setDescriptionSuggestionsOpen(false);
        }
      }}
      slotProps={{ popper: { sx: { zIndex: 1501 } } }}
      sx={{ flex: 1, minWidth: 0, width: '100%' }}
      noOptionsText="Nenhum lançamento parecido encontrado"
      renderOption={(props, transaction) => {
        const category = categories.find((item) => item.id === transaction.categoryId);
        const parent = category?.parentCategoryId
          ? categories.find((item) => item.id === category.parentCategoryId)
          : undefined;
        const linkedAccountId = cards.find((card) => card.id === transaction.creditCardId)?.accountId;
        const account = accounts.find((item) => item.id === (linkedAccountId || transaction.accountId));
        return (
          <Box component="li" {...props} key={transaction.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: 'var(--color-text-primary, #FFFFFF)', fontSize: '0.9rem' }} noWrap>
                {editableTransactionDescription(transaction.description)}
              </Typography>
              <Typography sx={{ color: 'var(--color-text-secondary, #7E8494)', fontSize: '0.75rem' }} noWrap>
                {[parent ? `${parent.name} · ${category?.name}` : category?.name, account?.name].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
            <Typography sx={{ color: 'var(--color-text-secondary, #7E8494)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {formatBRL(Math.abs(Number(transaction.value) || 0))}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth
          placeholder="Descrição"
          required
          variant="standard"
          InputProps={{ ...params.InputProps, disableUnderline: true }}
          sx={{ width: '100%', '& .MuiInputBase-root': { width: '100%', minWidth: 0 }, '& input': { color: 'var(--color-text-primary, #FFFFFF)', fontSize: '0.95rem' } }}
        />
      )}
    />
  );

  const renderFieldBox = (label: string, content: React.ReactNode, extra?: React.ReactNode) => (
    <TransactionField label={label} action={extra}>{content}</TransactionField>
  );

  const renderToggleRow = (icon: React.ReactNode, label: string, checked: boolean, onChange: (checked: boolean) => void) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon}
        <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>{label}</Typography>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} inputProps={{ 'aria-label': label }} />
    </Box>
  );

  const formatDateToPtBr = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatSelectedDatePtBr = (d: Date) => {
    if (!d || isNaN(d.getTime())) return '';
    const weekdays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const monthsShort = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const dayName = weekdays[d.getDay()];
    const dayNum = d.getDate();
    const monthName = monthsShort[d.getMonth()];
    
    const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return `${dayCapitalized}., ${dayNum} de ${monthName}.`;
  };

  const getDaysInMonthGrid = (viewDate: Date) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const daysGrid = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysGrid.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysGrid.push(new Date(year, month, i));
    }
    return daysGrid;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    if (!d1 || !d2) return false;
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const handleClockInteraction = (clientX: number, clientY: number, currentTarget: SVGSVGElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const clickX = clientX - rect.left - 110;
    const clickY = clientY - rect.top - 110;

    let angleRad = Math.atan2(clickY, clickX);
    let angleDeg = (angleRad * 180) / Math.PI;
    let normalized = angleDeg + 90;
    if (normalized < 0) normalized += 360;

    if (timePickerMode === 'HOURS') {
      const distance = Math.sqrt(clickX * clickX + clickY * clickY);
      const position = Math.round(normalized / 30) % 12;
      const isInner = distance < 68;
      
      let hour;
      if (isInner) {
        hour = position === 0 ? 0 : position + 12;
      } else {
        hour = position === 0 ? 12 : position;
      }
      setTempHour(hour);
    } else {
      const minute = Math.round(normalized / 6) % 60;
      setTempMinute(minute);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDraggingTime(true);
    handleClockInteraction(e.clientX, e.clientY, e.currentTarget);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDraggingTime) {
      handleClockInteraction(e.clientX, e.clientY, e.currentTarget);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingTime(false);
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    setIsDraggingTime(true);
    if (e.touches && e.touches[0]) {
      handleClockInteraction(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (isDraggingTime && e.touches && e.touches[0]) {
      handleClockInteraction(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    }
  };

  const handleTouchEnd = () => {
    setIsDraggingTime(false);
  };

  const monthsFull = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))', lg: 'minmax(280px, 2fr) repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
          <Card
            component="button"
            type="button"
            onClick={() => openDetail('/detalhe/contas')}
            aria-label="Ver saldo nas contas"
            title={balanceBadge.text}
            sx={{
              gridColumn: { xs: '1 / -1', lg: 'auto' }, minWidth: 0, width: '100%', p: 0,
              display: 'flex', flexDirection: 'column', color: 'text.primary', fontFamily: 'inherit',
              background: 'var(--color-panel)', backgroundImage: 'none',
              borderColor: 'var(--color-border)', borderRadius: '12px',
              textAlign: 'inherit', cursor: 'pointer',
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
              '&:hover': { borderColor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.12)' },
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
            }}
          >
            <Box sx={{ flex: 1, width: '100%', textAlign: 'center', px: 2, py: 2.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', lg: '2rem' }, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere', lineHeight: 1.25 }}>
                R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Saldo atual</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderTop: '1px solid var(--color-border)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, px: 1.5, py: 2, borderRight: '1px solid var(--color-border)' }}>
                <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 26, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 700, color: initialBalance < 0 ? 'error.main' : 'text.primary', fontSize: '1rem', overflowWrap: 'anywhere' }}>
                    R$ {initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Inicial</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, px: 1.5, py: 2 }}>
                <ClockIcon sx={{ color: 'text.secondary', fontSize: 26, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', overflowWrap: 'anywhere' }}>
                    R$ {forecastBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Previsto</Typography>
                </Box>
              </Box>
            </Box>
          </Card>
          <MiniMetricCard
                  label="Total recebido"
                  value={`R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  valueColor="success.main"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4EBE87" strokeWidth="3" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  }
                  iconBg="rgba(78, 190, 135, 0.1)"
                  iconColor="#4EBE87"
                  badgeText={incomeBadge.text}
                  badgeDirection={incomeBadge.direction}
                  badgeType={incomeBadge.type}
                  onClick={() => openDetail('/detalhe/receitas')}
                />
<MiniMetricCard
                  label="Total gasto"
                  value={`R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  valueColor="error.main"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E05A5A" strokeWidth="3" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  }
                  iconBg="rgba(224, 90, 90, 0.1)"
                  iconColor="#E05A5A"
                  badgeText={expenseBadge.text}
                  badgeDirection={expenseBadge.direction}
                  badgeType={expenseBadge.type}
                  onClick={() => openDetail('/detalhe/despesas')}
                />
<MiniMetricCard
                  label="Total movimentações"
                  value={`R$ ${totalTransfers.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  valueColor="warning.main"
                  icon={<TransferTypeIcon sx={{ fontSize: 28, transform: 'rotate(90deg)' }} />}
                  iconBg="rgba(244, 162, 97, 0.1)"
                  iconColor="#F4A261"
                  badgeText={movementsBadge.text}
                  badgeDirection={movementsBadge.direction}
                  badgeType={movementsBadge.type}
                  onClick={() => openDetail('/detalhe/transferencias')}
                />
<MiniMetricCard
                  label="Total faturas"
                  value={`R$ ${totalFaturas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  valueColor="var(--color-primary-text)"
                  icon={<CardIcon sx={{ fontSize: 26 }} />}
                  iconBg="rgba(var(--color-primary-rgb), 0.1)"
                  iconColor="var(--color-primary-text)"
                  badgeText="0% vs. mês anterior"
                  badgeDirection="up"
                  badgeType="blue"
                  onClick={() => openDetail('/detalhe/faturas')}
                />
        </Box>

        {summaryExpenseBudgets.length > 0 && (
          <Card component="section" aria-label="Orçamentos de despesas" sx={{
            minWidth: 0,
            borderRadius: '12px',
            bgcolor: 'var(--color-panel, #111217)',
            borderColor: 'var(--color-border)',
          }}>
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--color-text-primary, #FFFFFF)' }}>
                  Orçamentos de despesas
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {summaryExpenseBudgets.map((budget) => {
                  const category = categories.find((item) => item.id === budget.categoryId);
                  const label = budget.name || budget.categoryName || category?.name || 'Orçamento';
                  const color = budget.color || category?.color || '#8F91A8';
                  const spent = Number(budget.currentValue || 0);
                  const limit = Number(budget.limitValue || 0);
                  const remaining = limit - spent;
                  const utilization = limit > 0 ? spent / limit * 100 : 0;
                  const icon = budget.icon || category?.icon;
                  return (
                    <Box key={budget.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Avatar sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        bgcolor: color.startsWith('#') ? `${color}30` : 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)',
                        color,
                      }}>
                        {icon ? getCategoryIcon(icon, label) : <OptionsIcon />}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" noWrap title={label} sx={{ minWidth: 0, fontWeight: 600 }}>{label}</Typography>
                          <Typography variant="body2" sx={{
                            whiteSpace: 'nowrap',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.8rem',
                            color: remaining < 0 ? 'var(--color-expense, #E05A5A)' : 'var(--color-income, #4EBE87)',
                          }}>
                            {formatBRL(remaining)}
                          </Typography>
                        </Box>
                        <Box
                          role="progressbar"
                          aria-label={`Utilização do orçamento ${label}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(utilization)}
                          sx={{
                            height: 12,
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: 8,
                            bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)',
                          }}
                        >
                          <Box sx={{
                            position: 'absolute', inset: '0 auto 0 0',
                            width: `${Math.max(0, Math.min(utilization, 100))}%`,
                            borderRadius: 8,
                            bgcolor: color,
                            opacity: 0.88,
                            transition: 'width 0.25s ease',
                          }} />
                          <Typography variant="caption" sx={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                            px: 0.75,
                            color: 'var(--color-text-primary, #FFFFFF)',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            textShadow: '0 1px 2px rgba(0,0,0,.35)',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {Math.round(utilization)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Box sx={{ mt: 1.75, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.025)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography>
                  <Typography sx={{
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                    color: summaryBudgetTotals.limit - summaryBudgetTotals.current < 0
                      ? 'var(--color-expense, #E05A5A)'
                      : 'var(--color-income, #4EBE87)',
                  }}>
                    {formatBRL(summaryBudgetTotals.limit - summaryBudgetTotals.current)}
                  </Typography>
                </Box>
                <Box sx={{
                  height: 12,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 8,
                  bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.08)',
                }}>
                  <Box sx={{
                    position: 'absolute', inset: '0 auto 0 0',
                    width: `${Math.max(0, Math.min(summaryBudgetUtilization, 100))}%`,
                    borderRadius: 8,
                    bgcolor: 'var(--color-expense, #E9757B)',
                    transition: 'width 0.25s ease',
                  }} />
                  <Typography variant="caption" sx={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    px: 0.75,
                    color: 'var(--color-text-primary, #FFFFFF)',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    textShadow: '0 1px 2px rgba(0,0,0,.35)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {Math.round(summaryBudgetUtilization)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.25fr) minmax(0, 1fr)' }, gap: 2 }}>
          <Card sx={{ minWidth: 0 }}>
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Receitas e Despesas</Typography>
              <Box sx={{ display: 'flex', gap: 2.5, mt: 1.25, mb: 2 }}>
                {[{ label: 'Receitas', color: 'success.main' }, { label: 'Despesas', color: 'error.main' }].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color }} />
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ height: 190 }} role="img" aria-label="Receitas e despesas nos últimos seis meses até o mês selecionado">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryCharts.monthly} margin={{ top: 5, right: 4, left: 0, bottom: 0 }} barGap={5}>
                    <CartesianGrid stroke="rgba(var(--color-overlay-rgb, 255, 255, 255), 0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--color-text-secondary, #7E8494)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis width={56} tick={{ fill: "var(--color-text-secondary, #7E8494)", fontSize: 11 }} tickFormatter={(value: number) => value.toLocaleString('pt-BR', { notation: 'compact' })} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.025)" }} formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} contentStyle={{ background: "var(--color-surface-raised, #1D1E26)", border: "1px solid var(--color-border)", borderRadius: 10 }} />
                    <Bar dataKey="Receitas" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Despesas" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 0 }}>
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Ranking de Despesas</Typography>
              <Box sx={{ height: 230, overflowY: 'auto', pr: 0.5 }}>
                {summaryCharts.ranking.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Nenhuma despesa neste mês.</Typography>
                  </Box>
                ) : summaryCharts.ranking.map((category) => (
                  <Box key={category.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
                    <Avatar sx={{ width: 42, height: 42, bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.04)", color: category.color || 'text.secondary' }}>
                      {category.icon ? getCategoryIcon(category.icon) : <OptionsIcon />}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.75, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                        <Typography variant="body2" noWrap title={category.name} sx={{ flex: 1, minWidth: 60 }}>{category.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          R$ {category.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 34, textAlign: 'right' }}>{Math.round(category.percent)}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={category.percent} aria-label={category.name} sx={{ height: 9, borderRadius: 6, '& .MuiLinearProgress-bar': { borderRadius: 6, bgcolor: category.color || 'text.secondary' } }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

          {/* Row 3: Table summary of Accounts */}
          <Card>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)" }}>
                  Contas
                </Typography>
              </Box>
              {accountSummary.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nenhuma conta cadastrada.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small" aria-label="Resumo das contas" sx={{ tableLayout: 'fixed', minWidth: 660, '& th, & td': { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } }}>
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '18%' }} />
                    </colgroup>
                    <TableHead>
                      <TableRow sx={{ '& th': { borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 } }}>
                        <TableCell>Descrição</TableCell>
                        <TableCell align="right">Receitas</TableCell>
                        <TableCell align="right">Despesas</TableCell>
                        <TableCell align="right">Saldo</TableCell>
                        <TableCell align="right">Previsto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {accountSummary.map((row) => (
                        <TableRow key={row.id} sx={{ '& td': { borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", py: 1.2 } }}>
                          <TableCell sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                              <BankLogo icon={row.icon || row.institution} customIconUrl={row.customIconUrl} name={row.name} color={row.color} size={32} />
                              <Typography noWrap title={row.name} sx={{ minWidth: 0, color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>
                                {row.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ color: row.receitas > 0 ? "var(--color-income, #4EBE87)" : "var(--color-text-secondary, #7E8494)", fontSize: '0.9rem' }}>
                            <Button
                              onClick={() => openDetail(`/detalhe/receitas?${new URLSearchParams({ month: String(queryMonth), year: String(queryYear), account_id: row.id })}`)}
                              aria-label={`Ver receitas de ${row.name}`}
                              sx={{ minWidth: 0, p: 0, color: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', textTransform: 'none', '&:hover': { bgcolor: 'transparent', opacity: 0.8 } }}
                            >
                              R$ {row.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Button>
                          </TableCell>
                          <TableCell align="right" sx={{ color: row.despesas > 0 ? "var(--color-expense, #E05A5A)" : "var(--color-text-secondary, #7E8494)", fontSize: '0.9rem' }}>
                            <Button
                              onClick={() => openDetail(`/detalhe/despesas?${new URLSearchParams({ month: String(queryMonth), year: String(queryYear), account_id: row.id })}`)}
                              aria-label={`Ver despesas de ${row.name}`}
                              sx={{ minWidth: 0, p: 0, color: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', textTransform: 'none', '&:hover': { bgcolor: 'transparent', opacity: 0.8 } }}
                            >
                              R$ {row.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Button>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: row.saldo < 0 ? "var(--color-expense, #E05A5A)" : "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>
                            {row.saldo < 0 ? '-' : ''}R$ {Math.abs(row.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: row.previsto < 0 ? "var(--color-expense, #E05A5A)" : "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>
                            {row.previsto < 0 ? '-' : ''}R$ {Math.abs(row.previsto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total row */}
                      <TableRow sx={{ bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", '& td': { borderTop: "1px solid var(--color-border)", borderBottom: 'none', py: 1 } }}>
                        <TableCell sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.9rem' }}>
                          Total
                        </TableCell>
                        <TableCell align="right" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.9rem' }}>
                          R$ {roundCurrency(accountSummary.reduce((sum, row) => sum + row.receitas, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.9rem' }}>
                          R$ {roundCurrency(accountSummary.reduce((sum, row) => sum + row.despesas, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right" sx={{ color: roundCurrency(accountSummary.reduce((sum, row) => sum + row.saldo, 0)) < 0 ? "var(--color-expense, #E05A5A)" : "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.9rem' }}>
                          {roundCurrency(accountSummary.reduce((sum, row) => sum + row.saldo, 0)) < 0 ? '-' : ''}R$ {Math.abs(roundCurrency(accountSummary.reduce((sum, row) => sum + row.saldo, 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right" sx={{ color: roundCurrency(accountSummary.reduce((sum, row) => sum + row.previsto, 0)) < 0 ? "var(--color-expense, #E05A5A)" : "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.9rem' }}>
                          {roundCurrency(accountSummary.reduce((sum, row) => sum + row.previsto, 0)) < 0 ? '-' : ''}R$ {Math.abs(roundCurrency(accountSummary.reduce((sum, row) => sum + row.previsto, 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Row 4: Table summary of Credit Cards */}
          <Card>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)" }}>
                  Cartões de crédito
                </Typography>
              </Box>
              {cardSummary.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nenhum cartão de crédito cadastrado.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small" aria-label="Resumo dos cartões" sx={{ tableLayout: 'fixed', minWidth: 800, '& th, & td': { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } }}>
                    <colgroup>
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '17%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '8%' }} />
                    </colgroup>
                    <TableHead>
                      <TableRow sx={{ '& th': { borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 } }}>
                        <TableCell>Descrição</TableCell>
                        <TableCell>Fechamento</TableCell>
                        <TableCell>Vencimento</TableCell>
                        <TableCell align="right">Fatura</TableCell>
                        <TableCell align="right">Próxima</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cardSummary.map((row) => (
                        <TableRow
                          key={row.id}
                          tabIndex={0}
                          aria-label={`Detalhes do cartão ${row.name}`}
                          onClick={() => openDetail(`/detalhe/cartao/${row.id}?month=${queryMonth}&year=${queryYear}`)}
                          onKeyDown={(event) => {
                            if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault();
                              openDetail(`/detalhe/cartao/${row.id}?month=${queryMonth}&year=${queryYear}`);
                            }
                          }}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.025)" }, '&:focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: -2 }, '& td': { borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", py: 1.2 } }}
                        >
                          <TableCell sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                              <BankLogo icon={row.bank} customIconUrl={row.customIconUrl} name={row.name} size={32} />
                              <Typography noWrap title={row.name} sx={{ minWidth: 0, color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>
                                {row.name}
                              </Typography>
                              <CardBrandLogo brand={row.brand} />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              {row.closed && (
                                <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: 'rgba(224, 90, 90, 0.15)', color: "var(--color-expense, #E05A5A)", display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <LockIcon sx={{ fontSize: '0.75rem' }} />
                                </Box>
                              )}
                              {formatCardDateWithWeekday(row.closingDate)}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                            {formatCardDateWithWeekday(row.dueDate)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.9rem' }}>
                            <Button
                              onClick={(event) => { event.stopPropagation(); openCardStatement(row.id); }}
                              aria-label={`Ver fatura de ${row.name}`}
                              sx={{ minWidth: 0, p: 0, textTransform: 'none', gap: 0.75, '&:hover': { bgcolor: 'transparent', opacity: 0.8 } }}
                            >
                              {row.paid ? (
                                <CheckCircleIcon sx={{ fontSize: '1rem', color: "var(--color-income, #4EBE87)" }} />
                              ) : (
                                <ClockIcon sx={{ fontSize: '1rem', color: "var(--color-text-secondary, #7E8494)" }} />
                              )}
                              <Typography component="span" sx={{ color: row.paid ? "var(--color-income, #4EBE87)" : "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.9rem' }}>
                                R$ {row.fatura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </Typography>
                            </Button>
                          </TableCell>
                          <TableCell align="right" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.9rem' }}>
                            <Button
                              onClick={(event) => { event.stopPropagation(); openCardStatement(row.id, true); }}
                              aria-label={`Ver próxima fatura de ${row.name}`}
                              sx={{ minWidth: 0, p: 0, color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', '&:hover': { bgcolor: 'transparent', opacity: 0.8 } }}
                            >
                              R$ {row.proxima.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Button>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              sx={{ color: "var(--color-text-secondary, #7E8494)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCardActionsAnchor(e.currentTarget);
                                setCardActionsTarget(row.id);
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total row */}
                      <TableRow sx={{ bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", '& td': { borderTop: "1px solid var(--color-border)", borderBottom: 'none', py: 1 } }}>
                        <TableCell sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.9rem' }}>
                          Total
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell align="right" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.9rem' }}>
                          R$ {roundCurrency(cardSummary.reduce((sum, row) => sum + row.fatura, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.9rem' }}>
                          R$ {roundCurrency(cardSummary.reduce((sum, row) => sum + row.proxima, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Menu
            anchorEl={cardActionsAnchor}
            open={Boolean(cardActionsAnchor)}
            onClose={() => setCardActionsAnchor(null)}
            PaperProps={{ sx: { bgcolor: "var(--color-surface-raised, #1b1c21)", border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)", borderRadius: '12px' } }}
          >
            <MenuItem
              onClick={() => {
                setCardActionsAnchor(null);
                navigate('/cartoes');
              }}
              sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.88rem' }}
            >
              Editar
            </MenuItem>
            <MenuItem
              onClick={() => {
                const id = cardActionsTarget;
                setCardActionsAnchor(null);
                if (id) handleDeleteCard(id);
              }}
              sx={{ color: "var(--color-expense, #E05A5A)", fontSize: '0.88rem' }}
            >
              Excluir
            </MenuItem>
          </Menu>
      </Box>

      {/* DIALOG: Criar Conta */}
      <Dialog open={accountOpen} onClose={() => setAccountOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Criar Nova Conta</DialogTitle>
        <form onSubmit={handleCreateAccount}>
          <DialogContent>
            <TextField fullWidth label="Nome da Conta" value={accName} onChange={(e) => setAccName(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Instituição Financeira" value={accInstitution} onChange={(e) => setAccInstitution(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Saldo Inicial" type="text" value={accInitialBalance} onChange={(e) => setAccInitialBalance(maskBRL(e.target.value))} margin="normal" required />
            <TextField fullWidth label="Tipo de Conta" select value={accType} onChange={(e) => setAccType(e.target.value)} margin="normal">
              <MenuItem value="CHECKING">Conta Corrente</MenuItem>
              <MenuItem value="SAVINGS">Poupança</MenuItem>
              <MenuItem value="DIGITAL_WALLET">Carteira Digital</MenuItem>
              <MenuItem value="INVESTMENT">Conta Investimentos</MenuItem>
              <MenuItem value="CASH">Dinheiro em Espécie</MenuItem>
            </TextField>
            <TextField fullWidth label="Cor do Ícone (Hex)" value={accColor} onChange={(e) => setAccColor(e.target.value)} margin="normal" required />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAccountOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Criar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG: Criar Cartão de Crédito */}
      <Dialog open={cardOpen} onClose={() => setCardOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cadastrar Cartão de Crédito</DialogTitle>
        <form onSubmit={handleCreateCard}>
          <DialogContent>
            <TextField fullWidth label="Nome do Cartão" value={cardName} onChange={(e) => setCardName(e.target.value)} margin="normal" required placeholder="Ex: Cartão Roxinho" />
            <TextField fullWidth label="Banco Emissor" value={cardBank} onChange={(e) => setCardBank(e.target.value)} margin="normal" required placeholder="Ex: Nubank, Itaú" />
            <TextField fullWidth label="Bandeira" select value={cardBrand} onChange={(e) => setCardBrand(e.target.value)} margin="normal">
              <MenuItem value="VISA">Visa</MenuItem>
              <MenuItem value="MASTERCARD">Mastercard</MenuItem>
              <MenuItem value="AMEX">American Express</MenuItem>
              <MenuItem value="ELO">Elo</MenuItem>
            </TextField>
            <TextField fullWidth label="Limite Total (R$)" type="text" value={cardLimit} onChange={(e) => setCardLimit(maskBRL(e.target.value))} margin="normal" required />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Dia Fechamento" type="number" value={cardClosingDay} onChange={(e) => setCardClosingDay(parseInt(e.target.value))} margin="normal" required inputProps={{ min: 1, max: 31 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Dia Vencimento" type="number" value={cardDueDay} onChange={(e) => setCardDueDay(parseInt(e.target.value))} margin="normal" required inputProps={{ min: 1, max: 31 }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCardOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Cadastrar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG: Definir Limite de Orçamento */}
      <Dialog open={budgetOpen} onClose={() => setBudgetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Definir Limite de Orçamento</DialogTitle>
        <form onSubmit={handleCreateBudget}>
          <DialogContent>
            <TextField
              fullWidth
              label="Categoria"
              select
              value={bgCategoryId}
              onChange={(e) => setBgCategoryId(e.target.value)}
              margin="normal"
              required
            >
              {categories.filter(c => c.type === 'EXPENSE').map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="Valor Limite Mensal (R$)" type="text" value={bgLimit} onChange={(e) => setBgLimit(maskBRL(e.target.value))} margin="normal" required />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Mês" type="number" value={bgMonth} onChange={(e) => setBgMonth(parseInt(e.target.value))} margin="normal" required inputProps={{ min: 1, max: 12 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Ano" type="number" value={bgYear} onChange={(e) => setBgYear(parseInt(e.target.value))} margin="normal" required />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBudgetOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Definir</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG: Criar Nova Meta */}
      <Dialog open={goalOpen} onClose={() => setGoalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Criar Nova Meta Financeira</DialogTitle>
        <form onSubmit={handleCreateGoal}>
          <DialogContent>
            <TextField fullWidth label="Nome da Meta" value={goalName} onChange={(e) => setGoalName(e.target.value)} margin="normal" required placeholder="Ex: Comprar Notebook" />
            <TextField fullWidth label="Descrição" value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} margin="normal" multiline rows={2} />
            <TextField fullWidth label="Valor Alvo (R$)" type="text" value={goalTarget} onChange={(e) => setGoalTarget(maskBRL(e.target.value))} margin="normal" required />
            <TextField fullWidth label="Valor Inicial Acumulado" type="text" value={goalCurrent} onChange={(e) => setGoalCurrent(maskBRL(e.target.value))} margin="normal" />
            <TextField fullWidth label="Prazo Vencimento" type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} margin="normal" InputLabelProps={{ shrink: true }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGoalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Criar</Button>
          </DialogActions>
        </form>
      </Dialog>

{/* DIALOG: Criar Transação (Mobills layout matching mockup exactly) */}
<Dialog
open={transactionOpen}
onClose={handleCloseTransactionModal}
maxWidth="md"
fullWidth
PaperProps={{ sx: transactionPaperSx }}
>
<form onSubmit={handleCreateTransaction}>
{/* Header */}
<Box data-transaction-header sx={transactionHeaderSx}>
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
<Box
data-transaction-type-icon
sx={{
width: { xs: 36, sm: 46 },
height: { xs: 36, sm: 46 },
borderRadius: '12px',
flexShrink: 0,
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
bgcolor: `${getThemeColor()}26`,
color: getThemeColor(),
}}
>
{txType === 'TRANSFER'
? <TransferTypeIcon fontSize="small" />
: txType === 'REVENUE'
? <RevenueTypeIcon fontSize="small" />
: isCardExpense
? <CardIcon fontSize="small" />
: <ExpenseTypeIcon fontSize="small" />}
</Box>
<Box>
<Typography variant="h6" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: { xs: '1rem', sm: '1.5rem' }, lineHeight: 1.25 }}>
{isEditing
? (txType === 'REVENUE' ? 'Editar Receita' : txType === 'TRANSFER' ? 'Editar Transferência' : 'Editar Despesa')
: (txType === 'REVENUE' ? 'Nova Receita' : txType === 'TRANSFER' ? 'Nova Transferência' : isCardExpense ? 'Despesa cartão' : 'Nova Despesa')
}
</Typography>
<Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", display: 'block', mt: -0.2 }}>
{txType === 'TRANSFER'
? 'Transferência entre contas'
: isCardExpense
? 'Lançamento no cartão'
: 'Lançamento em conta'}
</Typography>
</Box>
</Box>
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
<Button
type="submit"
variant="contained"
startIcon={<SaveIcon />}
sx={{
borderRadius: '8px',
px: { xs: 1.5, sm: 3 },
py: 1,
fontWeight: 600,
fontSize: '0.9rem',
textTransform: 'none',
bgcolor: txType === 'REVENUE' ? '#4EBE87' : txType === 'TRANSFER' ? '#F4A261' : (isCardExpense ? 'var(--color-primary)' : '#E05A5A'),
backgroundImage: 'none',
boxShadow: 'none',
'&:hover': {
bgcolor: txType === 'REVENUE' ? '#3ea673' : txType === 'TRANSFER' ? '#e08f4c' : (isCardExpense ? 'var(--color-primary-dark)' : '#c94747'),
boxShadow: 'none'
}
}}
>
Salvar
</Button>
<IconButton aria-label="Fechar lançamento" onClick={handleCloseTransactionModal} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
<CloseIcon />
</IconButton>
</Box>
</Box>

<DialogContent data-transaction-content sx={transactionContentSx}>
{/* Valor + Descrição */}
<Box data-transaction-primary-fields sx={{ ...transactionColumnsSx, mb: 1.5 }}>
<TransactionAmountField value={txValue} color={getThemeColor()} onChange={(value) => setTxValue(maskBRL(value))} />
<Box>
{renderFieldBox('Descrição', renderDescriptionInput())}
</Box>
</Box>

<Box sx={transactionColumnsSx}>
{/* LEFT COLUMN */}
<Box sx={transactionPanelSx}>
<Typography sx={transactionHeadingSx}>
Dados do lançamento
</Typography>

{/* Perfil */}
{renderFieldBox('Perfil', (
<TextField
select
fullWidth
value={user?.id || ''}
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
>
<MenuItem value={user?.id || ''}>{user?.fullName || user?.email || 'Usuário'}</MenuItem>
</TextField>
))}

{/* Conditional Fields based on Card Expense vs Normal vs Transfer */}
{isCardExpense ? (
<>
{/* Cartão de Crédito */}
{renderFieldBox('Cartão de Crédito', (
<TextField
select
fullWidth
value={txCardId}
onChange={(e) => {
  const newCardId = e.target.value;
  setTxCardId(newCardId);
  const newCard = cards.find((c) => c.id === newCardId);
  if (newCard) setTxDueDate(getFirstOpenInvoice(newCard, new Date()).dueDateISO);
}}
required
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
>
{cards.map((c) => (
<MenuItem key={c.id} value={c.id}>
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
<BankLogo icon={c.bank} customIconUrl={c.customIconUrl} name={c.name} />
<Typography>{c.name}</Typography>
</Box>
</MenuItem>
))}
</TextField>
))}

{/* Fatura */}
{renderFieldBox('Fatura', (
<TextField
select
fullWidth
value={txDueDate}
onChange={(e) => setTxDueDate(e.target.value)}
required
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
>
{(() => {
const selectedCard = cards.find((c) => c.id === txCardId);
const options = selectedCard ? getInvoiceOptions(selectedCard, new Date(), 12, 13) : [];
if (txDueDate && !options.some((opt) => opt.dueDateISO === txDueDate)) {
const [y, m] = txDueDate.split('-').map(Number);
options.unshift({ dueDateISO: txDueDate, month: m, year: y });
}
return options.map((opt) => (
<MenuItem key={opt.dueDateISO} value={opt.dueDateISO}>
{`${monthsFull[opt.month - 1].charAt(0).toUpperCase()}${monthsFull[opt.month - 1].slice(1)}, ${opt.year}`}
</MenuItem>
));
})()}
</TextField>
))}
</>
) : txType === 'TRANSFER' ? (
<>
{/* Conta de Origem */}
{renderFieldBox('Conta de Origem', (
<TextField
select
fullWidth
value={selectedTxAccountId}
onChange={(e) => setTxAccountId(e.target.value)}
required
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
>
{accounts.map((acc) => (
<MenuItem key={acc.id} value={acc.id}>
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
<BankLogo icon={acc.icon || 'bank'} customIconUrl={acc.customIconUrl} name={acc.name} color={acc.color} />
<Typography>{acc.name}</Typography>
</Box>
</MenuItem>
))}
</TextField>
))}

{/* Conta de Destino */}
{renderFieldBox('Conta de Destino', (
<TextField
select
fullWidth
value={txDestAccountId}
onChange={(e) => setTxDestAccountId(e.target.value)}
required
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
>
{accounts.map((acc) => (
<MenuItem key={acc.id} value={acc.id}>
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
<BankLogo icon={acc.icon || 'bank'} customIconUrl={acc.customIconUrl} name={acc.name} color={acc.color} />
<Typography>{acc.name}</Typography>
</Box>
</MenuItem>
))}
</TextField>
))}
</>
) : (
renderFieldBox('Conta', (
<TextField
select
fullWidth
disabled={Boolean(linkedCardAccountId)}
value={selectedTxAccountId}
onChange={(e) => setTxAccountId(e.target.value)}
required={!isCardExpense}
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
>
{accounts.map((acc) => (
<MenuItem key={acc.id} value={acc.id}>
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
<BankLogo icon={acc.icon || 'bank'} customIconUrl={acc.customIconUrl} name={acc.name} color={acc.color} />
<Typography>{acc.name}</Typography>
</Box>
</MenuItem>
))}
</TextField>
))
)}

{/* Categoria / Subcategoria */}
{txType !== 'TRANSFER' && (
<>
<Box sx={{ display: 'flex', gap: 2 }}>
<Box sx={{ flex: 1, minWidth: 0 }}>
{renderFieldBox('Categoria', (
<TextField
select
fullWidth
value={txCategoryId}
onChange={(e) => {
const newCategoryId = e.target.value;
setTxCategoryId(newCategoryId);
const defaultSub = categories.find((c) => c.parentCategoryId === newCategoryId);
setTxSubcategoryId(defaultSub?.id || '');
}}
required
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
>
{categories
.filter((cat) => cat.type === txType && !cat.parentCategoryId)
.map((cat) => (
<MenuItem key={cat.id} value={cat.id}>
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
<Box sx={{ display: 'flex', color: cat.color || "var(--color-text-secondary, #7E8494)" }}>
{getCategoryIcon(cat.icon, cat.name)}
</Box>
{cat.name}
</Box>
</MenuItem>
))}
</TextField>
), (
<IconButton size="small" onClick={() => {
setQuickCatColor('#7E8494');
setQuickCatIcon('HelpIcon');
setQuickCatOpen(true);
}} sx={{ color: "var(--color-text-secondary, #7E8494)", p: 0.25 }}>
<AddIcon fontSize="small" />
</IconButton>
))}
</Box>
<Box sx={{ flex: 1, minWidth: 0 }}>
{renderFieldBox('Subcategoria', (
<TextField
select
fullWidth
value={txSubcategoryId || ''}
onChange={(e) => setTxSubcategoryId(e.target.value)}
disabled={!txCategoryId || categories.filter((c) => c.parentCategoryId === txCategoryId).length === 0}
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
>
{txSubcategoryId === '' && <MenuItem value="" sx={{ display: 'none' }} />}
{categories
.filter((c) => c.parentCategoryId === txCategoryId)
.map((sub) => (
<MenuItem key={sub.id} value={sub.id}>
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
<Box sx={{ display: 'flex', color: sub.color || "var(--color-text-secondary, #7E8494)" }}>
{getCategoryIcon(sub.icon, sub.name)}
</Box>
{sub.name}
</Box>
</MenuItem>
))}
</TextField>
), (
<IconButton size="small" onClick={() => {
const parent = categories.find(c => c.id === txCategoryId);
setQuickSubColor(parent?.color || '#7E8494');
setQuickSubIcon('HelpIcon');
setQuickSubOpen(true);
}} disabled={!txCategoryId} sx={{ color: "var(--color-text-secondary, #7E8494)", p: 0.25 }}>
<AddIcon fontSize="small" />
</IconButton>
))}
</Box>
</Box>
</>
)}

{/* Data de Efetivação */}
{!isCardExpense && renderFieldBox('Data de Efetivação', (
<Box
onClick={() => {
const parsed = txEffectiveDate ? new Date(txEffectiveDate + 'T12:00:00') : new Date();
setTempDate(isNaN(parsed.getTime()) ? new Date() : parsed);
setCalendarViewDate(isNaN(parsed.getTime()) ? new Date() : parsed);
setDatePickerTarget('EFETIVACAO');
setDatePickerOpen(true);
}}
sx={{ cursor: 'pointer', width: '100%' }}
>
<Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>
{formatDateToPtBr(txEffectiveDate)}
</Typography>
</Box>
))}

{/* Recorrência */}
{renderFieldBox('Recorrência', (
<Box
onClick={() => setRecurrenceDialogOpen(true)}
sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer' }}
>
<Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>
{recurrenceType === 'NP' && 'Não recorrente'}
{recurrenceType === 'FIXA' && 'Fixa mensal'}
{recurrenceType === 'PARCELADA' && 'Parcelada'}
</Typography>
<ExpandMoreIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.2rem' }} />
</Box>
))}
{recurrenceType === 'PARCELADA' && (
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: -1 }}>
<Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.78rem' }}>
{(() => {
const val = parseBRLToFloat(txValue);
const instVal = valueType === 'total' ? (val / installmentsCount) : val;
const instValStr = instVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
return `Em ${installmentsCount}x de R$ ${instValStr}`;
})()}
</Typography>
<IconButton size="small" onClick={() => setRepeatConfigDialogOpen(true)} sx={{ color: "var(--color-text-secondary, #7E8494)", '&:hover': { color: "var(--color-text-primary, #FFFFFF)" } }}>
<EditIcon sx={{ fontSize: '1rem' }} />
</IconButton>
</Box>
)}

{/* Segmented Value Type Control (Imagem 4) */}
{recurrenceType === 'PARCELADA' && (
<Box data-transaction-value-type sx={{ display: 'flex', border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)", borderRadius: '12px', overflow: 'hidden', p: '2px', bgcolor: 'rgba(0,0,0,0.15)' }}>
<Box
onClick={() => setValueType('total')}
sx={{
flex: 1,
textAlign: 'center',
py: 1,
borderRadius: "22px",
cursor: 'pointer',
bgcolor: valueType === 'total' ? getThemeColor() : 'transparent',
color: valueType === 'total' ? "var(--color-text-primary, #FFFFFF)" : "var(--color-text-secondary, #7E8494)",
fontWeight: 600,
fontSize: '0.8rem',
transition: 'all 0.2s'
}}
>
Valor total
</Box>
<Box
onClick={() => setValueType('parcela')}
sx={{
flex: 1,
textAlign: 'center',
py: 1,
borderRadius: "22px",
cursor: 'pointer',
bgcolor: valueType === 'parcela' ? getThemeColor() : 'transparent',
color: valueType === 'parcela' ? "var(--color-text-primary, #FFFFFF)" : "var(--color-text-secondary, #7E8494)",
fontWeight: 600,
fontSize: '0.8rem',
transition: 'all 0.2s'
}}
>
Valor parcela
</Box>
</Box>
)}
</Box>

{/* RIGHT COLUMN */}
<Box sx={transactionPanelSx}>
<Typography sx={transactionHeadingSx}>
Informações complementares
</Typography>

{/* Data de Lançamento + Horário */}
<Box sx={{ display: 'flex', gap: 2 }}>
<Box sx={{ flex: 1.4, minWidth: 0 }}>
{renderFieldBox('Data de lançamento', (
<Box
onClick={() => {
const parsed = txDate ? new Date(txDate + 'T12:00:00') : new Date();
setTempDate(isNaN(parsed.getTime()) ? new Date() : parsed);
setCalendarViewDate(isNaN(parsed.getTime()) ? new Date() : parsed);
setDatePickerTarget('LANCAMENTO');
setDatePickerOpen(true);
}}
sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', width: '100%' }}
>
<CalendarIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.1rem' }} />
<Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>
{formatDateToPtBr(txDate)}
</Typography>
</Box>
))}
</Box>
<Box sx={{ flex: 1, minWidth: 0 }}>
{renderFieldBox('Horário', (
<Box
onClick={() => {
const timeParts = txTimeVal.split(':');
if (timeParts.length === 2) {
setTempHour(parseInt(timeParts[0]));
setTempMinute(parseInt(timeParts[1]));
}
setTimePickerMode('HOURS');
setTimePickerViewMode('DIAL');
setTimePickerOpen(true);
}}
sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', width: '100%' }}
>
<ClockIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.1rem' }} />
<Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>
{txTimeVal}
</Typography>
</Box>
))}
</Box>
</Box>

{/* Data de Vencimento */}
{!isCardExpense && txType !== 'TRANSFER' && renderFieldBox('Data de Vencimento', (
<Box
onClick={() => {
const parsed = txDueDate ? new Date(txDueDate + 'T12:00:00') : new Date();
setTempDate(isNaN(parsed.getTime()) ? new Date() : parsed);
setCalendarViewDate(isNaN(parsed.getTime()) ? new Date() : parsed);
setDatePickerTarget('VENCIMENTO');
setDatePickerOpen(true);
}}
sx={{ cursor: 'pointer', width: '100%' }}
>
<Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>
{formatDateToPtBr(txDueDate)}
</Typography>
</Box>
))}

{/* Efetivada */}
{!isCardExpense && renderToggleRow(
<EventBusyIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.15rem' }} />,
txEffective ? 'Efetivada' : 'Pendente',
txEffective,
(checked) => {
// Alternar manualmente não mexe na Data de Efetivação — permite
// efetivar uma data futura de propósito. A data só é forçada de
// volta quando o próprio usuário escolhe uma nova data futura
// (ver DatePicker de EFETIVACAO), que aí sim desmarca automaticamente.
setTxEffective(checked);
}
)}

{/* Tags */}
{renderFieldBox('Tags', (
<>
<TextField
fullWidth
placeholder="Selecionar tags"
value={txTags}
onChange={(e) => setTxTags(e.target.value)}
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ flex: 1, '& input': { color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }, '& input::placeholder': { color: "var(--color-text-secondary, #7E8494)", opacity: 1 } }}
/>
<KeyboardArrowDownIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.2rem' }} />
</>
))}

{/* Encargos */}
{txType === 'EXPENSE' && renderFieldBox('Encargos', (
<TextField
fullWidth
value="R$ 0,00"
variant="standard"
InputProps={{ disableUnderline: true, readOnly: true }}
sx={{ '& input': { color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' } }}
/>
))}

{/* Observações */}
{renderFieldBox('Observações', (
<TextField
fullWidth
multiline
minRows={2}
maxRows={2}
placeholder="Observações e hashtags"
value={txNotes}
onChange={(e) => setTxNotes(e.target.value)}
variant="standard"
InputProps={{ disableUnderline: true }}
sx={{ '& textarea': { color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' } }}
/>
))}


</Box>
</Box>

</DialogContent>
</form>
</Dialog>

<RecurrenceDialog
        open={recurrenceDialogOpen}
        value={recurrenceType}
        onClose={() => setRecurrenceDialogOpen(false)}
        onSelect={(value) => {
          setRecurrenceType(value);
          setRecurrenceDialogOpen(false);
          if (value === 'PARCELADA') setRepeatConfigDialogOpen(true);
        }}
      />

      <RepeatConfigDialog
        open={repeatConfigDialogOpen}
        onClose={() => setRepeatConfigDialogOpen(false)}
        startInstallment={startInstallment}
        installmentsCount={installmentsCount}
        periodicity={periodicity}
        onStartInstallmentChange={setStartInstallment}
        onInstallmentsCountChange={setInstallmentsCount}
        onPeriodicityChange={setPeriodicity}
      />

      {/* DIALOG: Custom Date Picker */}
      <Dialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: "var(--color-surface-raised, #1b1c21)",
            backgroundImage: 'none',
            color: "var(--color-text-primary, #FFFFFF)",
            maxWidth: '500px',
            width: '100%',
          }
        }}
      >
        <Box sx={{ display: 'flex', minHeight: '380px', flexDirection: { xs: 'column', sm: 'row' } }}>
          {/* Left panel */}
          <Box
            sx={{
              width: { xs: '100%', sm: '210px' },
              bgcolor: "var(--color-panel, #111217)",
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRight: "1px solid var(--color-border)",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600, letterSpacing: '0.5px', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {tempDate.getFullYear()}
              </Typography>
              <Typography variant="h4" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, mt: 1, fontSize: '1.8rem', lineHeight: 1.25, wordBreak: 'break-word' }}>
                {formatSelectedDatePtBr(tempDate)}
              </Typography>
            </Box>
            <Box sx={{ mt: 4 }}>
              <IconButton size="small" sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </IconButton>
            </Box>
          </Box>

          {/* Right panel (Calendar) */}
          <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              {/* Header month / navigation */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
                  <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.95rem' }}>
                    {monthsFull[calendarViewDate.getMonth()].charAt(0).toUpperCase() + monthsFull[calendarViewDate.getMonth()].slice(1)} de {calendarViewDate.getFullYear()}
                  </Typography>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary, #7E8494)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
                    }}
                    sx={{ color: "var(--color-text-primary, #FFFFFF)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
                    }}
                    sx={{ color: "var(--color-text-primary, #FFFFFF)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </IconButton>
                </Box>
              </Box>

              {/* Days of Week Headers */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, justifyItems: 'center', mb: 1.5 }}>
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                  <Typography key={idx} variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600, fontSize: '0.75rem', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {day}
                  </Typography>
                ))}
              </Box>

              {/* Calendar Days Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, justifyItems: 'center' }}>
                {getDaysInMonthGrid(calendarViewDate).map((day, idx) => {
                  if (!day) {
                    return <Box key={`empty-${idx}`} sx={{ width: 36, height: 36 }} />;
                  }

                  const isSelected = isSameDay(day, tempDate);
                  const isToday = isSameDay(day, new Date());
                  const themeColor = getThemeColor();

                  return (
                    <Box
                      key={day.getTime()}
                      onClick={() => setTempDate(day)}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: "var(--color-text-primary, #FFFFFF)",
                        bgcolor: isSelected ? themeColor : 'transparent',
                        border: !isSelected && isToday ? `1.5px solid ${themeColor}` : 'none',
                        '&:hover': {
                          bgcolor: isSelected ? themeColor : "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)",
                        }
                      }}
                    >
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500 }}>
                        {day.getDate()}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button
                onClick={() => setDatePickerOpen(false)}
                sx={{
                  color: getThemeColor(),
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" }
                }}
              >
                CANCELAR
              </Button>
              <Button
                onClick={() => {
                  const formatted = tempDate.toISOString().split('T')[0];
                  if (datePickerTarget === 'EFETIVACAO') {
                    setTxEffectiveDate(formatted);
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (txEffective && formatted > todayStr) {
                      // Não é possível marcar como efetivada uma data futura.
                      setTxEffective(false);
                    } else if (txEffective && txDueDate && txDueDate > formatted) {
                      setTxEffective(false);
                    }
                  } else if (datePickerTarget === 'VENCIMENTO') {
                    setTxDueDate(formatted);
                    if (txEffective && txEffectiveDate && formatted > txEffectiveDate) {
                      setTxEffective(false);
                    }
                  } else {
                    setTxDate(formatted);
                  }
                  setDatePickerOpen(false);
                }}
                sx={{
                  color: getThemeColor(),
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" }
                }}
              >
                OK
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* DIALOG: Custom Time Picker */}
      <Dialog
        open={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: "var(--color-surface-raised, #1b1c21)",
            backgroundImage: 'none',
            color: "var(--color-text-primary, #FFFFFF)",
            maxWidth: timePickerViewMode === 'KEYBOARD' ? '320px' : '540px',
            width: '100%',
            transition: 'max-width 0.15s ease-out',
          }
        }}
      >
        <Box sx={{ display: 'flex', minHeight: timePickerViewMode === 'KEYBOARD' ? '220px' : '320px', flexDirection: { xs: 'column', sm: 'row' } }}>
          {/* Left panel */}
          <Box
            sx={{
              width: { xs: '100%', sm: timePickerViewMode === 'KEYBOARD' ? '100%' : '240px' },
              bgcolor: "var(--color-panel, #111217)",
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderRight: timePickerViewMode === 'KEYBOARD' ? 'none' : "1px solid var(--color-border)",
            }}
          >
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                {timePickerViewMode === 'KEYBOARD' ? 'Insira o horário' : 'Selecione o horário'}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', my: 1.5 }}>
              {timePickerViewMode === 'DIAL' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                  {/* Hours Box */}
                  <Box
                    onClick={() => setTimePickerMode('HOURS')}
                    sx={{
                      bgcolor: "var(--color-surface-raised, #1e1f25)",
                      border: '1.5px solid',
                      borderColor: timePickerMode === 'HOURS' ? getThemeColor() : 'transparent',
                      borderRadius: '8px',
                      width: '80px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Typography sx={{ fontSize: '3.2rem', fontWeight: 700, color: timePickerMode === 'HOURS' ? getThemeColor() : "var(--color-text-primary, #FFFFFF)", lineHeight: 1 }}>
                      {tempHour.toString().padStart(2, '0')}
                    </Typography>
                  </Box>

                  <Typography variant="h3" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, mx: 0.5 }}>:</Typography>

                  {/* Minutes Box */}
                  <Box
                    onClick={() => setTimePickerMode('MINUTES')}
                    sx={{
                      bgcolor: "var(--color-surface-raised, #1e1f25)",
                      border: '1.5px solid',
                      borderColor: timePickerMode === 'MINUTES' ? getThemeColor() : 'transparent',
                      borderRadius: '8px',
                      width: '80px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Typography sx={{ fontSize: '3.2rem', fontWeight: 700, color: timePickerMode === 'MINUTES' ? getThemeColor() : "var(--color-text-primary, #FFFFFF)", lineHeight: 1 }}>
                      {tempMinute.toString().padStart(2, '0')}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                /* Keyboard View Mode inputs */
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <input
                      type="text"
                      maxLength={2}
                      value={rawHourStr}
                      onFocus={() => setFocusedField('HOURS')}
                      onBlur={() => {
                        setFocusedField(null);
                        const val = parseInt(rawHourStr.replace(/[^0-9]/g, ''));
                        if (!isNaN(val) && val >= 0 && val < 24) {
                          setTempHour(val);
                          setRawHourStr(val.toString().padStart(2, '0'));
                        } else {
                          setRawHourStr(tempHour.toString().padStart(2, '0'));
                        }
                      }}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, '');
                        setRawHourStr(cleaned);
                        const val = parseInt(cleaned);
                        if (!isNaN(val) && val >= 0 && val < 24) {
                          setTempHour(val);
                        }
                      }}
                      style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: "var(--color-surface-raised, #1e1f25)",
                        color: "var(--color-text-primary, #FFFFFF)",
                        border: '1.5px solid',
                        borderColor: focusedField === 'HOURS' ? getThemeColor() : 'transparent',
                        borderRadius: '8px',
                        fontSize: '3.2rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', mt: 0.5 }}>
                      Hora
                    </Typography>
                  </Box>

                  <Typography variant="h3" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, mt: -3.5 }}>:</Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <input
                      type="text"
                      maxLength={2}
                      value={rawMinuteStr}
                      onFocus={() => setFocusedField('MINUTES')}
                      onBlur={() => {
                        setFocusedField(null);
                        const val = parseInt(rawMinuteStr.replace(/[^0-9]/g, ''));
                        if (!isNaN(val) && val >= 0 && val < 60) {
                          setTempMinute(val);
                          setRawMinuteStr(val.toString().padStart(2, '0'));
                        } else {
                          setRawMinuteStr(tempMinute.toString().padStart(2, '0'));
                        }
                      }}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, '');
                        setRawMinuteStr(cleaned);
                        const val = parseInt(cleaned);
                        if (!isNaN(val) && val >= 0 && val < 60) {
                          setTempMinute(val);
                        }
                      }}
                      style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: "var(--color-surface-raised, #1e1f25)",
                        color: "var(--color-text-primary, #FFFFFF)",
                        border: '1.5px solid',
                        borderColor: focusedField === 'MINUTES' ? getThemeColor() : 'transparent',
                        borderRadius: '8px',
                        fontSize: '3.2rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', mt: 0.5 }}>
                      Minuto
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {timePickerViewMode === 'DIAL' ? (
              <Box sx={{ mt: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => setTimePickerViewMode('KEYBOARD')}
                  sx={{ color: "var(--color-text-secondary, #7E8494)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </IconButton>
              </Box>
            ) : (
              /* Bottom buttons for Keyboard Mode */
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mt: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => setTimePickerViewMode('DIAL')}
                  sx={{ color: "var(--color-text-secondary, #7E8494)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </IconButton>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    onClick={() => setTimePickerOpen(false)}
                    sx={{
                      color: getThemeColor(),
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" }
                    }}
                  >
                    CANCELAR
                  </Button>
                  <Button
                    onClick={() => {
                      let finalHour = tempHour;
                      let finalMinute = tempMinute;
                      
                      const parsedHour = parseInt(rawHourStr.replace(/[^0-9]/g, ''));
                      if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour < 24) {
                        finalHour = parsedHour;
                      }
                      
                      const parsedMinute = parseInt(rawMinuteStr.replace(/[^0-9]/g, ''));
                      if (!isNaN(parsedMinute) && parsedMinute >= 0 && parsedMinute < 60) {
                        finalMinute = parsedMinute;
                      }
                      
                      setTempHour(finalHour);
                      setTempMinute(finalMinute);
                      setTxTimeVal(`${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`);
                      setTimePickerOpen(false);
                    }}
                    sx={{
                      color: getThemeColor(),
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" }
                    }}
                  >
                    OK
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {/* Right panel (Analog Clock face) */}
          {timePickerViewMode === 'DIAL' && (
            <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', my: 0.5 }}>
                <svg
                  width="220"
                  height="220"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <circle cx="110" cy="110" r="105" fill="rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" stroke="rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" strokeWidth="1" />
                  <circle cx="110" cy="110" r="4" fill={getThemeColor()} />

                  {(() => {
                    let angleDeg;
                    let handLength;
                    
                    if (timePickerMode === 'HOURS') {
                      const isInner = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].includes(tempHour);
                      handLength = isInner ? 54 : 82;
                      const angleVal = isInner ? (tempHour === 0 ? 0 : tempHour - 12) : (tempHour === 12 ? 0 : tempHour);
                      angleDeg = angleVal * 30 - 90;
                    } else {
                      handLength = 82;
                      angleDeg = tempMinute * 6 - 90;
                    }
                    
                    const angleRad = (angleDeg * Math.PI) / 180;
                    const handX = 110 + handLength * Math.cos(angleRad);
                    const handY = 110 + handLength * Math.sin(angleRad);

                    return (
                      <>
                        <line x1="110" y1="110" x2={handX} y2={handY} stroke={getThemeColor()} strokeWidth="2.5" />
                        <circle cx={handX} cy={handY} r="14" fill={getThemeColor()} style={{ transition: 'all 0.1s' }} />
                      </>
                    );
                  })()}

                  {timePickerMode === 'HOURS' ? (
                    <>
                      {/* Outer Circle (12, 1, 2, ... 11) */}
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hourVal, idx) => {
                        const angleDeg = idx * 30 - 90;
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const textX = 110 + 82 * Math.cos(angleRad);
                        const textY = 110 + 82 * Math.sin(angleRad);
                        const isSelected = tempHour === hourVal;

                        return (
                          <text
                            key={`outer-${hourVal}`}
                            x={textX}
                            y={textY + 4.5}
                            textAnchor="middle"
                            fill={isSelected ? '#FFFFFF' : '#B3B8C4'}
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: isSelected ? '700' : '500',
                              pointerEvents: 'none',
                            }}
                          >
                            {hourVal.toString()}
                          </text>
                        );
                      })}
                      {/* Inner Circle (00, 13, 14, ... 23) */}
                      {[0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((hourVal, idx) => {
                        const angleDeg = idx * 30 - 90;
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const textX = 110 + 54 * Math.cos(angleRad);
                        const textY = 110 + 54 * Math.sin(angleRad);
                        const isSelected = tempHour === hourVal;

                        return (
                          <text
                            key={`inner-${hourVal}`}
                            x={textX}
                            y={textY + 4}
                            textAnchor="middle"
                            fill={isSelected ? '#FFFFFF' : 'rgba(179, 184, 196, 0.6)'}
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: isSelected ? '700' : '500',
                              pointerEvents: 'none',
                            }}
                          >
                            {hourVal === 0 ? '00' : hourVal.toString()}
                          </text>
                        );
                      })}
                    </>
                  ) : (
                    [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minVal) => {
                      const angleDeg = minVal * 6 - 90;
                      const angleRad = (angleDeg * Math.PI) / 180;
                      const textX = 110 + 82 * Math.cos(angleRad);
                      const textY = 110 + 82 * Math.sin(angleRad);
                      const isSelected = tempMinute === minVal;

                      return (
                        <text
                          key={minVal}
                          x={textX}
                          y={textY + 4.5}
                          textAnchor="middle"
                          fill={isSelected ? '#FFFFFF' : '#B3B8C4'}
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: isSelected ? '700' : '500',
                            pointerEvents: 'none',
                          }}
                        >
                          {minVal.toString().padStart(2, '0')}
                        </text>
                      );
                    })
                  )}
                </svg>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, width: '100%', mt: 1 }}>
                <Button
                  onClick={() => setTimePickerOpen(false)}
                  sx={{
                    color: getThemeColor(),
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" }
                  }}
                >
                  CANCELAR
                </Button>
                <Button
                  onClick={() => {
                    setTxTimeVal(`${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`);
                    setTimePickerOpen(false);
                  }}
                  sx={{
                    color: getThemeColor(),
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" }
                  }}
                >
                  OK
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Dialog>

      {/* DIALOG: Quick Category Creation */}
      <Dialog
        open={quickCatOpen}
        onClose={() => setQuickCatOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            bgcolor: "var(--color-panel, #111217)",
            backgroundImage: 'none',
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary, #FFFFFF)",
          }
        }}
      >
        <form onSubmit={handleQuickCreateCategory}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: "1px solid var(--color-border)" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)" }}>
              Nova Categoria
            </Typography>
            <IconButton onClick={() => setQuickCatOpen(false)} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: 3 }}>
            <TextField
              label="Nome da Categoria"
              value={quickCatName}
              onChange={(e) => setQuickCatName(e.target.value)}
              required
              fullWidth
              variant="standard"
              InputLabelProps={{ style: { color: "var(--color-text-secondary, #7E8494)" } }}
              InputProps={{ disableUnderline: true }}
              sx={{
                borderBottom: "1px solid var(--color-border)",
                '& input': { color: "var(--color-text-primary, #FFFFFF)", py: 0.5 }
              }}
            />
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ borderBottom: "1px solid var(--color-border)", pb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)" }}>Cor</Typography>
              <Box
                onClick={(e) => setQuickColorAnchor(e.currentTarget)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: quickCatColor,
                  cursor: 'pointer',
                  border: "2px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.15)",
                  '&:hover': { opacity: 0.8 },
                }}
              />
            </Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ borderBottom: "1px solid var(--color-border)", pb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)" }}>Ícone</Typography>
              <IconButton
                onClick={() => setQuickIconPickerOpen(true)}
                sx={{ bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)", borderRadius: '12px', color: "var(--color-text-primary, #FFFFFF)", '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.1)" } }}
              >
                {getCategoryIcon(quickCatIcon)}
              </IconButton>
            </Box>
          </DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, px: 3, pb: 3 }}>
            <Button onClick={() => setQuickCatOpen(false)} sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600, textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                borderRadius: '8px',
                px: 3,
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: getThemeColor(),
                '&:hover': { bgcolor: getThemeColor(), opacity: 0.9 }
              }}
            >
              Salvar
            </Button>
          </Box>
        </form>
      </Dialog>

      {/* DIALOG: Quick Subcategory Creation */}
      <Dialog
        open={quickSubOpen}
        onClose={() => setQuickSubOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            bgcolor: "var(--color-panel, #111217)",
            backgroundImage: 'none',
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary, #FFFFFF)",
          }
        }}
      >
        <form onSubmit={handleQuickCreateSubcategory}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: "1px solid var(--color-border)" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)" }}>
              Nova Subcategoria
            </Typography>
            <IconButton onClick={() => setQuickSubOpen(false)} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: 3 }}>
            <TextField
              label="Nome da Subcategoria"
              value={quickSubName}
              onChange={(e) => setQuickSubName(e.target.value)}
              required
              fullWidth
              variant="standard"
              InputLabelProps={{ style: { color: "var(--color-text-secondary, #7E8494)" } }}
              InputProps={{ disableUnderline: true }}
              sx={{
                borderBottom: "1px solid var(--color-border)",
                '& input': { color: "var(--color-text-primary, #FFFFFF)", py: 0.5 }
              }}
            />
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ borderBottom: "1px solid var(--color-border)", pb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)" }}>Cor</Typography>
              <Box
                onClick={(e) => setQuickColorAnchor(e.currentTarget)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: quickSubColor,
                  cursor: 'pointer',
                  border: "2px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.15)",
                  '&:hover': { opacity: 0.8 },
                }}
              />
            </Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ borderBottom: "1px solid var(--color-border)", pb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)" }}>Ícone</Typography>
              <IconButton
                onClick={() => setQuickIconPickerOpen(true)}
                sx={{ bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)", borderRadius: '12px', color: "var(--color-text-primary, #FFFFFF)", '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.1)" } }}
              >
                {getCategoryIcon(quickSubIcon)}
              </IconButton>
            </Box>
          </DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, px: 3, pb: 3 }}>
            <Button onClick={() => setQuickSubOpen(false)} sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600, textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                borderRadius: '8px',
                px: 3,
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: getThemeColor(),
                '&:hover': { bgcolor: getThemeColor(), opacity: 0.9 }
              }}
            >
              Salvar
            </Button>
          </Box>
        </form>
      </Dialog>

      <CardStatementDialog
        key={statementTarget ? `${statementTarget.card.id}-${statementTarget.month}-${statementTarget.year}` : 'closed'}
        open={Boolean(statementTarget)}
        onClose={() => setStatementTarget(null)}
        card={statementTarget?.card || null}
        transactions={statementTarget ? transactions.filter((tx) => tx.creditCardId === statementTarget.card.id) : []}
        categories={categories}
        month={statementTarget?.month || queryMonth}
        year={statementTarget?.year || queryYear}
        onEditTransaction={(tx) => setStatementComposer({ cardId: statementTarget!.card.id, dueDate: tx.dueDate || tx.date, refund: false, transactionId: tx.id })}
        onAddExpense={(dueDate) => addFromStatement(dueDate)}
        onAddRefund={(dueDate) => addFromStatement(dueDate, true)}
      />
      {statementComposer && <TransactionsPage
        composer={statementComposer}
        onComposerClose={() => setStatementComposer(null)}
        onComposerSaved={async () => { await fetchData(true); }}
      />}
      {summaryComposer && <TransactionsPage
        key={`summary-composer-${summaryComposer.type}-${summaryComposer.cardId || 'account'}`}
        composer={summaryComposer}
        onComposerClose={handleCloseSummaryComposer}
        onComposerSaved={async () => { await fetchData(true); }}
      />}

      <CategoryIconPickerDialog
        open={quickIconPickerOpen}
        onClose={() => setQuickIconPickerOpen(false)}
        value={quickCatOpen ? quickCatIcon : quickSubIcon}
        onSelect={(iconValue) => {
          if (quickCatOpen) setQuickCatIcon(iconValue);
          else setQuickSubIcon(iconValue);
        }}
      />

      <ColorPickerPopover
        anchorEl={quickColorAnchor}
        onClose={() => setQuickColorAnchor(null)}
        value={quickCatOpen ? quickCatColor : quickSubColor}
        onChange={(c) => {
          if (quickCatOpen) setQuickCatColor(c);
          else setQuickSubColor(c);
        }}
        presets={AVAILABLE_COLORS.map((col) => col.value)}
      />
    </Box>
  );
};

export default Resume;
