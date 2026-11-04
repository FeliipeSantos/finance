import RepeatConfigDialog from '../../components/RepeatConfigDialog';
import RecurrenceDialog from '../../components/RecurrenceDialog';
import TransactionDetailsDialog from '../../components/TransactionDetailsDialog';
import TransactionDescriptionText from '../../components/TransactionDescriptionText';
import StatementView from './StatementView';
import { editableTransactionDescription, isFixedTransaction, isInstallmentTransaction, restoreTransactionDescription, transactionDescription } from '../../utils/transactionDescription';
import { TransactionField, TransactionAmountField, transactionPaperSx, transactionHeaderSx, transactionContentSx, transactionColumnsSx, transactionPanelSx, transactionHeadingSx } from '../../components/TransactionFormLayout';
import CardBrandLogo from '../../components/CardBrandLogo';
import { useDetailSearchParams } from '../../hooks/useDetailSearchParams';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../config/api';
import { useAuth } from '../auth/AuthContext';
import { roundCurrency } from '../../utils/currency';
import FocusedLayout from '../../components/FocusedLayout';
import { usePageScrollRestoration } from '../../hooks/usePageScrollRestoration';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  IconButton,
  Button,
  Dialog,
  DialogContent,
  TextField,
  MenuItem,
  Switch,
  Menu,
  Checkbox,
  FormControlLabel,
  Select,
  FormControl,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as AccountIcon,
  ArrowForwardIos as ChevronRightIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  CreditCard as CardIcon,
  Close as CloseIcon,
  SaveOutlined as SaveIcon,
  Add as AddIcon,
  EventBusy as EventBusyIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Remove as RemoveIcon,
  TrendingDown as ExpenseTypeIcon,
  TrendingUp as RevenueTypeIcon,
  SwapHoriz as TransferTypeIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { getCategoryIcon } from '../../utils/categoryIcons';
import CategoryIconPickerDialog from '../../components/CategoryIconPickerDialog';
import ColorPickerPopover from '../../components/ColorPickerPopover';
import { renderBankLogoSvg } from '../../utils/bankIcons';
import { getInvoicePeriod, isInvoiceClosed, getFirstOpenInvoice, getInvoiceOptions } from '../../utils/cardInvoice';
import CardStatementDialog from '../../components/CardStatementDialog';
import BankLogo from '../../components/BankLogo';

// ── Types & Interfaces ────────────────────────────────────────
interface Account {
  id: string;
  name: string;
  institution: string;
  balanceInitial: number;
  balanceCurrent: number;
  color: string;
  type: string;
  active: boolean;
  icon?: string | null;
  customIconUrl?: string | null;
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
  customIconUrl?: string;
  color?: string;
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
  recurrenceIndex?: number;
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
  installments?: Installment[];
  effective: boolean;
  effectiveDate?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
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

// Cada uma dessas rotas ("/detalhe/:tipo") renderiza a MESMA TransactionsPage,
// só que fora do Layout padrão (sem sidebar) e com um cabeçalho próprio
// (voltar + título) no lugar das abas — evita duplicar toda a lógica de
// listagem/filtro/modal de edição só para um recorte específico.
const FOCUSED_SCREENS: Record<string, { tab: 'REVENUE' | 'EXPENSE' | 'TRANSFER'; title: string }> = {
  receitas: { tab: 'REVENUE', title: 'Receitas' },
  despesas: { tab: 'EXPENSE', title: 'Despesas' },
  transferencias: { tab: 'TRANSFER', title: 'Transferências' },
};

interface TransactionsPageProps {
  composer?: {
    cardId?: string;
    dueDate?: string;
    refund?: boolean;
    transactionId?: string;
    type?: 'REVENUE' | 'EXPENSE' | 'TRANSFER';
    isCardExpense?: boolean;
  };
  onComposerClose?: () => void;
  onComposerSaved?: () => Promise<void>;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ composer, onComposerClose, onComposerSaved }) => {
  const { user } = useAuth();
  const composerInitialized = useRef(false);
  const navigate = useNavigate();
  const { tipo } = useParams<{ tipo?: string }>();
  const focusedConfig = tipo ? FOCUSED_SCREENS[tipo] : undefined;
  const isFocusedMode = !composer && Boolean(tipo);

  // ── States & Params ──────────────────────────────────────────
  const [searchParams, setSearchParams] = useDetailSearchParams();
  const queryMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;
  const queryYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
  const accountFilterId = searchParams.get('account_id') || '';
  const categoryParamId = searchParams.get('category_id') || '';
  const subcategoryParamId = searchParams.get('subcategory_id') || '';

  useEffect(() => {
    if (!composer && tipo && !focusedConfig) {
      navigate('/', { replace: true });
    }
  }, [tipo, focusedConfig, navigate, composer]);

  // { replace: true }: troca de mês é um ajuste de filtro, não uma navegação
  // nova — se empilhasse uma entrada de histórico por clique, o botão
  // "voltar" (navigate(-1)) desfazia mudanças de mês em vez de sair da tela.
  const handlePrevMonth = () => {
    let newMonth = queryMonth - 1;
    let newYear = queryYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSearchParams((prev) => {
      prev.set('month', String(newMonth));
      prev.set('year', String(newYear));
      return prev;
    }, { replace: true });
  };

  const handleNextMonth = () => {
    let newMonth = queryMonth + 1;
    let newYear = queryYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSearchParams((prev) => {
      prev.set('month', String(newMonth));
      prev.set('year', String(newYear));
      return prev;
    }, { replace: true });
  };

  // { replace: true }: mesmo motivo do comentário acima em handlePrevMonth/
  // handleNextMonth — abrir/fechar o modal não pode empilhar entrada de
  // histórico, senão o botão "voltar" primeiro desfaz esse estado do modal
  // em vez de sair da tela para o Resumo.
  const handleOpenFocusedAddModal = (asCard: boolean = false) => {
    setSearchParams((prev) => {
      prev.set('new_tx', 'true');
      prev.set('tx_type', asCard ? 'EXPENSE_CARD' : (focusedConfig?.tab || 'EXPENSE'));
      return prev;
    }, { replace: true });
  };

  const [focusedSearchQuery, setSearchQuery] = useState('');
  const [exportMenuAnchor, setExportMenuAnchor] = useState<HTMLElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const searchQuery = isFocusedMode ? focusedSearchQuery : searchParams.get('q') || '';
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const VALID_TABS = ['EXPENSE', 'REVENUE', 'TRANSFER', 'STATEMENT'] as const;
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'REVENUE' | 'TRANSFER' | 'STATEMENT'>(() => {
    const tabParam = searchParams.get('tab');
    return (VALID_TABS as readonly string[]).includes(tabParam || '') ? (tabParam as typeof VALID_TABS[number]) : 'EXPENSE';
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Also retain links created when category_id stored a subcategory directly.
  const selectedCategory = categories.find((category) => category.id === categoryParamId);
  const subcategoryFilterId = subcategoryParamId || (selectedCategory?.parentCategoryId ? categoryParamId : '');
  const categoryFilterId = categories.find((category) => category.id === subcategoryFilterId)?.parentCategoryId
    || selectedCategory?.parentCategoryId || categoryParamId;
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  usePageScrollRestoration(!loading && !composer);
  const [error, setError] = useState<string | null>(null);

  // Edit / Action Menu states
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [detailTransactionId, setDetailTransactionId] = useState<string | null>(null);
  const [statementTarget, setStatementTarget] = useState<{ card: CreditCard; transactions: Transaction[] } | null>(null);

  // Modal open states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCardExpense, setIsCardExpense] = useState(false);
  // Estorno = despesa de cartão com valor negativo (reduz a fatura) — mesmo
  // fluxo/campos da despesa de cartão, só inverte o sinal ao salvar.
  const [isRefundExpense, setIsRefundExpense] = useState(false);

  // Pickers States
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

  // Form Field States
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
  const [txTimeVal, setTxTimeVal] = useState(() => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  });
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recurrentDeleteOpen, setRecurrentDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteInProgress = useRef(false);
  const [reorganize, setReorganize] = useState(true);

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

  const [futureConfirmOpen, setFutureConfirmOpen] = useState(false);
  const [futureTxsToToggle, setFutureTxsToToggle] = useState<Transaction[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const statusUpdateInProgress = useRef(false);

  const getMonthName = (monthIndex: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex];
  };

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, accRes, catRes, cardRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/accounts'),
        api.get('/categories'),
        api.get('/cards'),
      ]);
      setTransactions(txRes.data);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setCards(cardRes.data);
    } catch (err) {
      setError('Falha ao carregar as transações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Time formatting sync
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

  const getTransactionAccountId = (transaction: Transaction) => (
    cards.find((card) => card.id === transaction.creditCardId)?.accountId || transaction.accountId
  );

  // Aplica os valores default de "nova transação" — usado tanto pelo efeito
  // que lê ?new_tx=... da URL (menu global / focused "+") quanto pelos
  // botões de Despesa cartão/Estorno do extrato de fatura, que abrem o modal
  // diretamente sem passar pela URL (já sabem o cartão e a fatura exatas).
  const applyNewTxDefaults = (
    targetType: 'REVENUE' | 'EXPENSE' | 'TRANSFER',
    isCard: boolean,
    targetCardId: string,
    targetDueDate: string,
    isRefund: boolean = false
  ) => {
    setIsEditing(false);
    setTxType(targetType);
    setTxCardId(targetCardId);
    setIsCardExpense(isCard);
    setIsRefundExpense(isRefund);

    // Pre-select account/dest
    const cardAccountId = isCard ? cards.find((card) => card.id === targetCardId)?.accountId : undefined;
    setTxAccountId(cardAccountId || accounts[0]?.id || '');
    if (targetType === 'TRANSFER' && accounts.length > 1) {
      setTxDestAccountId(accounts[1].id);
    } else if (accounts.length > 0) {
      setTxDestAccountId(accounts[0].id);
    }

    // Pre-select category matching type (top-level only, same filter used by the category dropdown)
    const filteredCats = categories.filter(
      (cat) => (targetType === 'TRANSFER' || cat.type === targetType) && !cat.parentCategoryId
    );
    if (filteredCats.length > 0) {
      const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const refundSubcategory = isRefund
        ? categories.find((category) => normalize(category.name) === 'estornos')
        : undefined;
      const defaultCategory = (refundSubcategory && filteredCats.find((category) => category.id === refundSubcategory.parentCategoryId))
        || (isRefund && filteredCats.find((category) => normalize(category.name) === 'cartoes de credito'))
        || filteredCats[0];
      setTxCategoryId(defaultCategory.id);
      const defaultSubcategory = (isRefund && refundSubcategory?.parentCategoryId === defaultCategory.id ? refundSubcategory : undefined)
        || categories.find((c) => c.parentCategoryId === defaultCategory.id);
      setTxSubcategoryId(defaultSubcategory?.id || '');
    } else {
      setTxCategoryId('');
      setTxSubcategoryId('');
    }

    setTxDesc('');
    setDescriptionSuggestionsOpen(false);
    setTxValue('R$ 0,00');
    setTxDate(new Date().toISOString().split('T')[0]);
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

    setModalOpen(true);
  };

  // Abre o modal de Nova Despesa/Estorno mantendo o extrato da fatura aberto,
  // já com o cartão e vencimento do período que estava sendo visualizado.
  const handleAddCardExpenseFromStatement = (card: CreditCard, dueDateISO: string) => {
    applyNewTxDefaults('EXPENSE', true, card.id, dueDateISO, false);
  };

  const handleAddCardRefundFromStatement = (card: CreditCard, dueDateISO: string) => {
    applyNewTxDefaults('EXPENSE', true, card.id, dueDateISO, true);
  };

  // Sync Quick Add params
  useEffect(() => {
    if (!composer || composer.transactionId || loading || error || composerInitialized.current) return;
    composerInitialized.current = true;
    const targetType = composer.type || 'EXPENSE';
    const targetCardId = composer.cardId || '';
    const isCard = composer.isCardExpense ?? Boolean(targetCardId);
    const targetDueDate = composer.dueDate || new Date().toISOString().split('T')[0];
    applyNewTxDefaults(targetType, isCard, targetCardId, targetDueDate, Boolean(composer.refund));
  }, [composer, loading, error, cards, accounts, categories]);

  useEffect(() => {
    if (composer || loading) return;
    if (searchParams.get('new_tx') === 'true') {
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
        const requestedCard = cards.find((card) => card.id === searchParams.get('card_id')) || cards[0];
        if (requestedCard) {
          targetCardId = requestedCard.id;
          const firstOpenInvoice = getFirstOpenInvoice(requestedCard, new Date());
          if (firstOpenInvoice) targetDueDate = firstOpenInvoice.dueDateISO;
          const requestedDueDate = searchParams.get('invoice_due_date');
          if (requestedDueDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDueDate)) targetDueDate = requestedDueDate;
        }
      }

      applyNewTxDefaults(targetType, isCard, targetCardId, targetDueDate, isCard && searchParams.get('refund') === 'true');
    }
  }, [searchParams, cards, accounts, categories, loading, composer]);

  // Handle Create/Update Transaction Submit
  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        description: isEditing && activeTx ? restoreTransactionDescription(txDesc, activeTx.description) : txDesc,
        value: isRefundExpense ? -Math.abs(parseBRLToFloat(txValue)) : parseBRLToFloat(txValue),
        date: txDate,
        dueDate: txDueDate || null,
        type: txType,
        accountId: selectedTxAccountId || null,
        destinationAccountId: txType === 'TRANSFER' ? txDestAccountId : null,
        categoryId: txSubcategoryId || txCategoryId || null,
        creditCardId: txType === 'EXPENSE' && txCardId ? txCardId : null,
        notes: txNotes,
        tags: txTags,
        installmentsCount: recurrenceType === 'PARCELADA' ? installmentsCount : null,
        effective: txEffective,
        effectiveDate: txEffective ? txEffectiveDate : null,
        recurrenceType: recurrenceType,
        startInstallment: recurrenceType === 'PARCELADA' ? startInstallment : null,
        periodicity: recurrenceType === 'PARCELADA' ? periodicity : null,
        valueType: recurrenceType === 'PARCELADA' ? valueType : null,
      };

      if (isEditing && activeTx) {
        await api.put(`/transactions/${activeTx.id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }

      if (composer) {
        await onComposerSaved?.();
        handleCloseModal();
      } else {
        handleCloseModal();
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao registrar transação.');
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setIsEditing(false);
    if (composer) {
      onComposerClose?.();
      return;
    }
    setSearchParams((prev) => {
      prev.delete('new_tx');
      prev.delete('tx_type');
      prev.delete('card_id');
      prev.delete('invoice_due_date');
      prev.delete('refund');
      prev.delete('edit_tx');
      return prev;
    }, { replace: true });
  };

  const handleOpenEdit = (tx: Transaction) => {
    setMenuAnchor(null);
    setActiveTx(tx);
    setIsEditing(true);

    setTxDesc(editableTransactionDescription(tx.description));
    setDescriptionSuggestionsOpen(false);
    setRecurrenceType('NP');
    setTxValue(formatBRL(Math.abs(tx.value)));
    setTxDate(tx.date);
    setTxType(tx.type);
    setTxAccountId(getTransactionAccountId(tx) || '');
    setTxDestAccountId(tx.destinationAccountId || '');
    const cat = categories.find(c => c.id === tx.categoryId);
    if (cat && cat.parentCategoryId) {
      setTxCategoryId(cat.parentCategoryId);
      setTxSubcategoryId(cat.id);
    } else {
      setTxCategoryId(tx.categoryId || '');
      setTxSubcategoryId('');
    }
    setTxCardId(tx.creditCardId || '');
    setTxNotes(tx.notes || '');
    setTxTags(tx.tags || '');
    setIsCardExpense(!!tx.creditCardId);
    setIsRefundExpense(!!tx.creditCardId && Number(tx.value) < 0);
    setTxEffective(tx.effective ?? true);
    setTxEffectiveDate(tx.effectiveDate || tx.date);
    setTxDueDate(tx.dueDate || tx.date);

    // Parse time if possible from createdAt, otherwise default to current time
    if (tx.createdAt) {
      const dateObj = new Date(tx.createdAt);
      if (!isNaN(dateObj.getTime())) {
        const hrs = String(dateObj.getHours()).padStart(2, '0');
        const mins = String(dateObj.getMinutes()).padStart(2, '0');
        setTxTimeVal(`${hrs}:${mins}`);
        setTempHour(dateObj.getHours());
        setTempMinute(dateObj.getMinutes());
        setRawHourStr(hrs);
        setRawMinuteStr(mins);
      } else {
        setTxTimeVal('08:34');
        setTempHour(8);
        setTempMinute(34);
        setRawHourStr('08');
        setRawMinuteStr('34');
      }
    } else {
      setTxTimeVal('08:34');
      setTempHour(8);
      setTempMinute(34);
      setRawHourStr('08');
      setRawMinuteStr('34');
    }

    setModalOpen(true);
  };

  const handleOpenDetails = (tx: Transaction) => {
    setActiveTx(tx);
    setDetailTransactionId(tx.id);
  };

  useEffect(() => {
    if (!composer?.transactionId || loading || composerInitialized.current) return;
    const transaction = transactions.find((tx) => tx.id === composer.transactionId);
    if (!transaction) return;
    composerInitialized.current = true;
    handleOpenEdit(transaction);
  }, [composer, loading, transactions]);

  useEffect(() => {
    const detailsId = searchParams.get('details_tx');
    const transactionId = detailsId || searchParams.get('edit_tx');
    if (composer || loading || !transactionId) return;
    const transaction = transactions.find((tx) => tx.id === transactionId);
    if (transaction) {
      if (detailsId) handleOpenDetails(transaction);
      else handleOpenEdit(transaction);
    }
    setSearchParams((prev) => {
      prev.delete('edit_tx');
      prev.delete('details_tx');
      return prev;
    }, { replace: true });
  }, [loading, transactions, searchParams, setSearchParams, composer]);

  const getLocalToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const normalizeDescription = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isCompatibleHistoryEntry = (transaction: Transaction) => {
    if (transaction.type !== txType) return false;
    if (txType === 'EXPENSE') {
      const isHistoricalRefund = Number(transaction.value) < 0;
      return isRefundExpense ? isHistoricalRefund : !isHistoricalRefund;
    }
    return true;
  };

  const similarTransactions = !isEditing && txDesc.trim().length >= 2
    ? transactions
      .filter((transaction) => isCompatibleHistoryEntry(transaction) && transaction.description?.trim())
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

    const accountId = getTransactionAccountId(transaction);
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

    // Reaproveitar dados do histórico nunca troca o modo escolhido no modal.
    // Só atualiza o cartão quando o usuário já iniciou uma despesa de cartão.
    if (txType === 'EXPENSE' && isCardExpense && !isRefundExpense && transaction.creditCardId
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
      freeSolo={false}
      options={similarTransactions}
      value={null}
      inputValue={txDesc}
      open={!isEditing && descriptionSuggestionsOpen && txDesc.trim().length >= 2 && similarTransactions.length > 0}
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
        if (transaction && isCompatibleHistoryEntry(transaction)) {
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
        const categoryLabel = parent ? `${parent.name} · ${category?.name}` : category?.name;
        return (
          <Box component="li" {...props} key={transaction.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: 'var(--color-text-primary, #FFFFFF)', fontSize: '0.9rem' }} noWrap>
                {editableTransactionDescription(transaction.description)}
              </Typography>
              <Typography sx={{ color: 'var(--color-text-secondary, #7E8494)', fontSize: '0.75rem' }} noWrap>
                {[categoryLabel, accounts.find((account) => account.id === getTransactionAccountId(transaction))?.name].filter(Boolean).join(' · ')}
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

  const executeToggle = async (txs: Transaction[], nextEffective: boolean, nextEffectiveDate: string | null, useDueDate = false) => {
    if (statusUpdateInProgress.current || txs.length === 0) return false;
    statusUpdateInProgress.current = true;
    setUpdatingStatus(true);
    try {
      await api.post('/transactions/effective-status', {
        transactionIds: txs.map((tx) => tx.id),
        effective: nextEffective,
        effectiveDate: nextEffectiveDate,
        useDueDate,
      });
      await fetchData();
      return true;
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao atualizar situação.');
      return false;
    } finally {
      statusUpdateInProgress.current = false;
      setUpdatingStatus(false);
    }
  };

  const handleToggleEffective = async (target: Transaction | Transaction[]) => {
    if (statusUpdateInProgress.current || futureConfirmOpen) return;
    const txs = Array.isArray(target) ? target : [target];
    if (txs.length === 0) return;
    try {
      const nextEffective = !txs.every((tx) => tx.effective);
      const changedTxs = txs.filter((tx) => tx.effective !== nextEffective);
      if (nextEffective) {
        const targetDate = changedTxs[0].dueDate || changedTxs[0].date;
        if (targetDate) {
          const parts = targetDate.split('-');
          if (parts.length >= 2) {
            const dueYear = parseInt(parts[0], 10);
            const dueMonth = parseInt(parts[1], 10);
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth() + 1;

            if (dueYear !== todayYear || dueMonth !== todayMonth) {
              setFutureTxsToToggle(changedTxs);
              setFutureConfirmOpen(true);
              return;
            }
          }
        }
      }

      const todayStr = getLocalToday();
      const nextEffectiveDate = nextEffective ? todayStr : null;
      await executeToggle(changedTxs, nextEffective, nextEffectiveDate);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao atualizar situação da transação.');
    }
  };

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

  const handleOpenDeleteConfirm = (transaction: Transaction | null = activeTx) => {
    setMenuAnchor(null);
    if (!transaction) return;
    setActiveTx(transaction);
    if (/^(.*?)\s+(\d+)\/(\d+)$/.test(transaction.description)) {
      setRecurrentDeleteOpen(true);
    } else {
      setDeleteConfirmOpen(true);
    }
  };

  const handleConfirmDeleteRecurrent = async (deleteType: 'ONLY_CURRENT' | 'CURRENT_AND_FUTURE' | 'ALL') => {
    if (!activeTx || deleteInProgress.current) return;
    deleteInProgress.current = true;
    setDeleting(true);
    try {
      await api.delete(`/transactions/${activeTx.id}/recurrent`, {
        params: {
          delete_type: deleteType,
          reorganize: reorganize
        }
      });
      setRecurrentDeleteOpen(false);
      setDetailTransactionId(null);
      if (isEditing) handleCloseModal();
      setActiveTx(null);
      fetchData();
    } catch (err) {
      alert('Erro ao excluir lançamento parcelado.');
    } finally {
      deleteInProgress.current = false;
      setDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeTx || deleteInProgress.current) return;
    deleteInProgress.current = true;
    setDeleting(true);
    try {
      await api.delete(`/transactions/${activeTx.id}`);
      setDeleteConfirmOpen(false);
      setDetailTransactionId(null);
      if (isEditing) handleCloseModal();
      setActiveTx(null);
      fetchData();
    } catch (err) {
      alert('Erro ao excluir transação.');
    } finally {
      deleteInProgress.current = false;
      setDeleting(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────
  const getThemeColor = () => {
    if (isRefundExpense) return '#4EBE87';
    if (txType === 'REVENUE') return '#4EBE87';
    if (txType === 'TRANSFER') return '#F4A261';
    if (isCardExpense) return '#394BBF';
    return '#E05A5A';
  };

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
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}., ${dayNum} de ${monthName}.`;
  };

  const getDaysInMonthGrid = (viewDate: Date) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysGrid = [];
    for (let i = 0; i < firstDayIndex; i++) daysGrid.push(null);
    for (let i = 1; i <= totalDays; i++) daysGrid.push(new Date(year, month, i));
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
      let hour = isInner ? (position === 0 ? 0 : position + 12) : (position === 0 ? 12 : position);
      setTempHour(hour);
    } else {
      const minute = Math.round(normalized / 6) % 60;
      setTempMinute(minute);
    }
  };

  const renderAccountLogo = (account: Account) => (
    <BankLogo
      icon={account.icon || (account.customIconUrl ? 'custom' : account.institution || 'bank')}
      customIconUrl={account.customIconUrl}
      name={account.name}
      color={account.color}
      size={24}
    />
  );

  const applyCategoryFilter = (id: string) => {
    const category = categories.find((item) => item.id === id);
    setPage(0);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id) next.set('category_id', category?.parentCategoryId || id);
      else next.delete('category_id');
      if (category?.parentCategoryId) next.set('subcategory_id', id);
      else next.delete('subcategory_id');
      return next;
    }, { replace: true });
  };

  const clearSubcategoryFilter = () => {
    setPage(0);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('subcategory_id');
      if (categoryFilterId) next.set('category_id', categoryFilterId);
      return next;
    }, { replace: true });
  };

  const renderCategoryChip = (cat: Category, showArrow = true) => {
    const color = cat.color || '#7E8494';
    return (
      <Box
        key={cat.id}
        component={showArrow ? 'button' : 'span'}
        type={showArrow ? 'button' : undefined}
        aria-label={showArrow ? `Filtrar por ${cat.parentCategoryId ? 'subcategoria' : 'categoria'}: ${cat.name}` : undefined}
        aria-pressed={showArrow ? categoryFilterId === cat.id || subcategoryFilterId === cat.id : undefined}
        onClick={showArrow ? (event: React.MouseEvent<HTMLElement>) => { event.stopPropagation(); applyCategoryFilter(cat.id); } : undefined}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: `${color}15`,
          color: color,
          border: `1.5px solid ${color}30`,
          borderRadius: '16px',
          px: 1.25,
          py: 0.25,
          fontSize: '0.7rem',
          fontWeight: 700,
          fontFamily: 'inherit',
          lineHeight: 'inherit',
          cursor: showArrow ? 'pointer' : 'inherit',
          ...(showArrow && {
            transition: 'opacity 0.2s',
            '&:hover': { opacity: 0.8 },
            '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 2 },
          }),
        }}
      >
        {cat.name}
        {showArrow && (
          <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 800, ml: 0.25 }}>
            ❯
          </Typography>
        )}
      </Box>
    );
  };

  const getCategoryChips = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return null;
    if (cat.parentCategoryId) {
      const parent = categories.find(p => p.id === cat.parentCategoryId);
      return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {parent && renderCategoryChip(parent)}
          {renderCategoryChip(cat)}
        </Box>
      );
    }
    return renderCategoryChip(cat);
  };

  const getActiveDate = (t: any) => t.effective && t.effectiveDate ? t.effectiveDate : (t.dueDate || t.date);

  // ── Filter and Sums ──────────────────────────────────────────
  const effectiveTab = focusedConfig ? focusedConfig.tab : activeTab;

  const monthlyFiltered = transactions.filter((t) => {
    const activeDate = getActiveDate(t);
    if (!activeDate) return false;
    const parts = activeDate.split('-');
    if (parts.length < 2) return false;
    const tYear = parseInt(parts[0], 10);
    const tMonth = parseInt(parts[1], 10);
    return tMonth === queryMonth && tYear === queryYear;
  });

  const tabFiltered = monthlyFiltered.filter((t) => {
    if (accountFilterId && getTransactionAccountId(t) !== accountFilterId
      && !(t.type === 'TRANSFER' && t.destinationAccountId === accountFilterId)) return false;
    if (categoryFilterId && t.categoryId !== categoryFilterId
      && categories.find((category) => category.id === t.categoryId)?.parentCategoryId !== categoryFilterId) return false;
    if (subcategoryFilterId && t.categoryId !== subcategoryFilterId) return false;
    if (effectiveTab === 'STATEMENT') return true;
    if (effectiveTab === 'EXPENSE') return t.type === 'EXPENSE';
    if (effectiveTab === 'REVENUE') return t.type === 'REVENUE';
    if (effectiveTab === 'TRANSFER') return t.type === 'TRANSFER';
    return true;
  });

  const searchedFiltered = searchQuery.trim()
    ? tabFiltered.filter((t) => {
        const q = searchQuery.trim().toLowerCase();
        const category = categories.find((c) => c.id === t.categoryId);
        const categoryName = category?.name?.toLowerCase() || '';
        const parentCategoryName = categories.find((c) => c.id === category?.parentCategoryId)?.name?.toLowerCase() || '';
        const accountName = accounts.find((a) => a.id === getTransactionAccountId(t))?.name?.toLowerCase() || '';
        const cardName = cards.find((card) => card.id === t.creditCardId)?.name?.toLowerCase() || '';
        return (
          (t.description || '').toLowerCase().includes(q) ||
          categoryName.includes(q) ||
          parentCategoryName.includes(q) ||
          cardName.includes(q) ||
          accountName.includes(q)
        );
      })
    : tabFiltered;

  const sumEffective = roundCurrency(searchedFiltered
    .filter((t) => t.effective)
    .reduce((acc, t) => {
      if (effectiveTab === 'STATEMENT') {
        if (t.type === 'REVENUE') return acc + Number(t.value || 0);
        if (t.type === 'EXPENSE') return acc - Number(t.value || 0);
        return acc; // transfer neutral
      }
      return acc + Number(t.value || 0);
    }, 0));

  const sumPending = roundCurrency(searchedFiltered
    .filter((t) => !t.effective)
    .reduce((acc, t) => {
      if (effectiveTab === 'STATEMENT') {
        if (t.type === 'REVENUE') return acc + Number(t.value || 0);
        if (t.type === 'EXPENSE') return acc - Number(t.value || 0);
        return acc;
      }
      return acc + Number(t.value || 0);
    }, 0));

  const sumTotal = roundCurrency(sumEffective + sumPending);

  // Category filters and search expose the matching card purchases. Without
  // them, show the complete invoice group; totals always use the same results.
  const showIndividualCardTransactions = Boolean(categoryFilterId || subcategoryFilterId || searchQuery.trim());
  type DisplayRow =
    | { kind: 'tx'; tx: Transaction }
    | { kind: 'cardGroup'; card: CreditCard; transactions: Transaction[]; total: number; allEffective: boolean };

  const displayRows: DisplayRow[] = (() => {
    if (showIndividualCardTransactions) return searchedFiltered.map((tx) => ({ kind: 'tx', tx }));
    const rows: DisplayRow[] = [];
    const cardGroups = new Map<string, Transaction[]>();
    searchedFiltered.forEach((tx) => {
      const card = tx.creditCardId ? cards.find((c) => c.id === tx.creditCardId) : undefined;
      if (card) {
        const list = cardGroups.get(card.id) || [];
        list.push(tx);
        cardGroups.set(card.id, list);
      } else {
        rows.push({ kind: 'tx', tx });
      }
    });
    cardGroups.forEach((groupTxs, cardId) => {
      const card = cards.find((c) => c.id === cardId)!;
      const total = groupTxs.reduce((acc, t) => acc + Number(t.value || 0), 0);
      const allEffective = groupTxs.every((t) => t.effective);
      rows.push({ kind: 'cardGroup', card, transactions: groupTxs, total, allEffective });
    });
    return rows;
  })();

  // currentPage clampa "page" ao intervalo válido no próprio render (em vez de
  // corrigir via setState num efeito) — assim, ao filtrar/pesquisar e a página
  // pedida deixar de existir, a lista já volta a uma página válida na mesma
  // renderização, sem re-render em cascata.
  const totalRows = displayRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * rowsPerPage;
  const pageEnd = Math.min(pageStart + rowsPerPage, totalRows);
  const paginatedRows = isFocusedMode ? displayRows.slice(pageStart, pageEnd) : displayRows;

  const handleExportXls = async () => {
    setExportMenuAnchor(null);
    setExportError('');
    if (exporting || searchedFiltered.length === 0) return;
    if (searchedFiltered.length > 65535) {
      setExportError('O formato .xls permite até 65.535 lançamentos por arquivo. Refine os filtros para exportar.');
      return;
    }
    const fileLabel = { EXPENSE: 'despesas', REVENUE: 'receitas', TRANSFER: 'transferencias', STATEMENT: 'extrato' }[effectiveTab] || 'transacoes';
    const filename = `${fileLabel}-${queryYear}-${String(queryMonth).padStart(2, '0')}.xls`;
    setExporting(true);
    try {
      const response = await api.post('/reports/export/xls', {
        transactionIds: searchedFiltered.map((transaction) => transaction.id),
      }, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('Não foi possível exportar os dados. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  // Tabs headers configurations
  const detailTransaction = transactions.find((tx) => tx.id === detailTransactionId) || null;
  const installmentTransactions = detailTransaction?.recurrenceGroupId && isInstallmentTransaction(detailTransaction.description)
    ? transactions.filter((tx) => tx.recurrenceGroupId === detailTransaction.recurrenceGroupId)
    : [];
  const installmentTotal = roundCurrency(installmentTransactions.reduce((sum, tx) => sum + Math.abs(Number(tx.value)), 0));
  const installmentEffective = roundCurrency(installmentTransactions.reduce((sum, tx) => sum + (tx.effective ? Math.abs(Number(tx.value)) : 0), 0));
  const installmentPending = roundCurrency(Math.max(0, installmentTotal - installmentEffective));
  const installmentProgress = installmentTotal > 0 ? Math.min(100, (installmentEffective / installmentTotal) * 100) : 0;
  const installmentSummary = installmentTransactions.length > 0 ? {
    total: installmentTotal,
    effective: installmentEffective,
    pending: installmentPending,
    progress: installmentProgress,
  } : null;
  const detailCategory = categories.find((category) => category.id === detailTransaction?.categoryId);
  const detailParentCategory = detailCategory?.parentCategoryId
    ? categories.find((category) => category.id === detailCategory.parentCategoryId)
    : detailCategory;

  const TABS_CONFIG = [
    { key: 'EXPENSE', label: 'Despesas', color: "var(--color-expense, #E05A5A)" },
    { key: 'REVENUE', label: 'Receitas', color: "var(--color-income, #4EBE87)" },
    { key: 'TRANSFER', label: 'Transferências', color: "var(--color-warning, #F4A261)" },
    { key: 'STATEMENT', label: 'Extrato', color: 'var(--color-primary-text)' },
  ] as const;

  const monthsFull = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  if (loading) {
    if (composer) return <Dialog open onClose={onComposerClose} sx={{ zIndex: 1400 }}><Box sx={{ p: 4 }}><CircularProgress aria-label="Carregando formulário" /></Box></Dialog>;
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (composer && error && !modalOpen) {
    return <Dialog open onClose={onComposerClose} sx={{ zIndex: 1400 }}><Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert><Button onClick={onComposerClose}>Fechar</Button></Box></Dialog>;
  }

  const pageContent = (
    <Box sx={{ pb: composer ? 0 : 10 }}>
      {!composer && <>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {exportError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError('')}>{exportError}</Alert>}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
      {accountFilterId && (
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<AccountIcon />}
            label={`Conta: ${accounts.find((account) => account.id === accountFilterId)?.name || 'Conta indisponível'}`}
            onDelete={() => {
              setPage(0);
              setSearchParams((previous) => {
                previous.delete('account_id');
                return previous;
              }, { replace: true });
            }}
            sx={{ bgcolor: 'rgba(var(--color-primary-rgb),0.12)', color: 'var(--color-primary-text)', '& .MuiChip-icon, & .MuiChip-deleteIcon': { color: 'var(--color-primary-text)' } }}
          />
        </Box>
      )}
      {categoryFilterId && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {[
            { id: categoryFilterId, label: 'Categoria', clear: () => applyCategoryFilter('') },
            { id: subcategoryFilterId, label: 'Subcategoria', clear: clearSubcategoryFilter },
          ].filter((filter) => filter.id).map((filter) => {
            const category = categories.find((item) => item.id === filter.id);
            const color = category?.color || 'var(--color-primary)';
            return (
              <Chip
                key={filter.label}
                label={`${filter.label}: ${category?.name || 'Indisponível'}`}
                onDelete={filter.clear}
                sx={{ bgcolor: `${color}15`, color, border: `1px solid ${color}30`, '& .MuiChip-deleteIcon': { color } }}
              />
            );
          })}
        </Box>
      )}
      </Box>
      <IconButton
        aria-label="Opções da lista"
        aria-haspopup="menu"
        aria-controls={exportMenuAnchor ? 'transactions-export-menu' : undefined}
        aria-expanded={Boolean(exportMenuAnchor)}
        disabled={exporting}
        onClick={(event) => setExportMenuAnchor(event.currentTarget)}
        sx={{ color: "var(--color-text-secondary, #7E8494)", flexShrink: 0 }}
      >
        {exporting ? <CircularProgress size={20} aria-label="Exportando dados" /> : <MoreVertIcon />}
      </IconButton>
      </Box>
      <Menu
        id="transactions-export-menu"
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { bgcolor: "var(--color-surface-raised, #1D1E26)", border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)", borderRadius: '12px' } }}
      >
        <MenuItem disabled={exporting || searchedFiltered.length === 0} onClick={() => void handleExportXls()}>
          Exportar para .xls
        </MenuItem>
      </Menu>

      {!isFocusedMode && (
        /* Tabs Header */
        <Box
          sx={{
            display: 'flex',
            borderBottom: "1px solid var(--color-border)",
            mb: 3,
            gap: 4,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {TABS_CONFIG.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                sx={{
                  color: isActive ? tab.color : "var(--color-text-secondary, #7E8494)",
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  px: 2,
                  py: 1.5,
                  borderRadius: 0,
                  textTransform: 'none',
                  borderBottom: isActive ? `3px solid ${tab.color}` : '3px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'transparent',
                    color: isActive ? tab.color : "var(--color-text-primary, #FFFFFF)",
                  },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
      )}

      {/* Main Table / statement overview */}
      {effectiveTab === 'STATEMENT' ? <StatementView
        transactions={searchedFiltered}
        allTransactions={transactions}
        accounts={accounts}
        cards={cards}
        accountFilterId={accountFilterId}
        month={queryMonth}
        year={queryYear}
        onOpenTransaction={(tx) => {
          const fullTransaction = transactions.find((item) => item.id === tx.id);
          if (fullTransaction) handleOpenDetails(fullTransaction);
        }}
      /> : searchedFiltered.length === 0 ? (
        <Paper sx={{ bgcolor: "var(--color-panel, #111217)", border: "1px solid var(--color-border)", py: 6, textAlign: 'center' }}>
          <Typography sx={{ color: "var(--color-text-secondary, #7E8494)" }}>Nenhuma transação encontrada neste período.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: "var(--color-panel, #111217)", backgroundImage: 'none', border: "1px solid var(--color-border)", borderRadius: '12px', overflowX: 'auto' }}>
          <Table aria-label="Transações" sx={{ tableLayout: 'fixed', minWidth: 1400, '& th, & td': { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } }}>
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary, #7E8494)", fontWeight: 600, fontSize: '0.825rem' } }}>
                <TableCell>Situação</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Conta</TableCell>
                <TableCell>Efetivação</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ '& > tr': { height: 56 }, '& > tr > td': { verticalAlign: 'middle' } }}>
              {paginatedRows.map((row) => {
                if (row.kind === 'cardGroup') {
                  const { card, total, allEffective } = row;
                  const { closingDate, dueDate } = getInvoicePeriod(card, queryMonth, queryYear);
                  const closed = isInvoiceClosed(closingDate);
                  const formattedTotal = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                  return (
                    <TableRow
                      key={`card-${card.id}`}
                      onClick={() => setStatementTarget({ card, transactions: transactions.filter((t) => t.creditCardId === card.id) })}
                      sx={{ cursor: 'pointer', '& td': { borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", py: 1.5, fontSize: '0.875rem' }, '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)" } }}
                    >
                      <TableCell>
                        <IconButton
                          size="small"
                          aria-label={allEffective ? 'Desfazer efetivação da fatura' : 'Efetivar pagamento da fatura'}
                          disabled={updatingStatus}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleEffective(row.transactions);
                          }}
                          sx={{ p: 0, '&:hover': { opacity: 0.7 } }}
                        >
                          {allEffective ? (
                            <CheckCircleIcon sx={{ color: "var(--color-income, #4EBE87)", fontSize: '1.25rem' }} />
                          ) : (
                            <AccessTimeIcon sx={{ color: "var(--color-text-secondary, #6F768E)", fontSize: '1.25rem' }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 22, height: 22, borderRadius: "50%", overflow: 'hidden', display: 'flex', flexShrink: 0 }}>
                            {card.customIconUrl ? (
                              <Box component="img" src={card.customIconUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              renderBankLogoSvg(card.bank, 22)
                            )}
                          </Box>
                          <Typography noWrap title={card.name} sx={{ minWidth: 0, color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500 }}>
                            {card.name}
                          </Typography>
                          <Box
                            sx={closed ? {
                              bgcolor: 'rgba(235, 87, 87, 0.15)',
                              color: '#EB5757',
                              border: '1px solid rgba(235, 87, 87, 0.2)',
                              borderRadius: '12px',
                              px: 1,
                              py: 0.25,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            } : {
                              bgcolor: 'rgba(var(--color-primary-rgb), 0.12)',
                              color: 'var(--color-primary-text)',
                              border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                              borderRadius: '12px',
                              px: 1,
                              py: 0.25,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {closed ? 'Fatura fechada' : `Fecha dia ${String(closingDate.getDate()).padStart(2, '0')}/${String(closingDate.getMonth() + 1).padStart(2, '0')}`}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {renderCategoryChip({ id: 'credit-card', name: 'Cartão de Crédito', type: 'EXPENSE', color: card.color }, false)}
                      </TableCell>
                      <TableCell />
                      <TableCell sx={{ color: "var(--color-text-primary, #FFFFFF)" }}>
                        {`${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()}`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        <Typography component="span" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.875rem' }}>
                          {activeTab === 'STATEMENT' ? `- ${formattedTotal}` : formattedTotal}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <ChevronRightIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.9rem' }} />
                      </TableCell>
                    </TableRow>
                  );
                }

                const tx = row.tx;
                const transactionCard = cards.find((card) => card.id === tx.creditCardId);
                const isEffective = tx.effective;
                const account = accounts.find((a) => a.id === getTransactionAccountId(tx));
                const destAccount = accounts.find((a) => a.id === tx.destinationAccountId);

                return (
                  <TableRow key={tx.id} onClick={() => handleOpenDetails(tx)} sx={{ cursor: 'pointer', '& td': { borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", py: 1.5, fontSize: '0.875rem' }, '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)" } }}>
                    {/* Status */}
                    <TableCell>
                      <Box
                        onClick={(event) => { event.stopPropagation(); handleToggleEffective(tx); }}
                        sx={{
                          display: 'inline-flex',
                          cursor: 'pointer',
                          transition: 'opacity 0.2s',
                          '&:hover': { opacity: 0.7 }
                        }}
                      >
                        {isEffective ? (
                          <CheckCircleIcon sx={{ color: "var(--color-income, #4EBE87)", fontSize: '1.25rem' }} />
                        ) : (
                          <AccessTimeIcon sx={{ color: "var(--color-text-secondary, #6F768E)", fontSize: '1.25rem' }} />
                        )}
                      </Box>
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 32 }}>
                        {transactionCard && <BankLogo icon={transactionCard.bank} customIconUrl={transactionCard.customIconUrl} name={transactionCard.name} />}
                        <Box sx={{ minWidth: 0 }}>
                          <Button onClick={(event) => { event.stopPropagation(); handleOpenDetails(tx); }} sx={{ color: 'var(--color-text-primary, #FFFFFF)', fontWeight: 500, lineHeight: '20px', textTransform: 'none', p: 0, minWidth: 0, maxWidth: '100%', justifyContent: 'flex-start', '&:hover': { bgcolor: 'transparent', transform: 'none' } }}>
                            <Typography noWrap title={transactionDescription(tx.description)} sx={{ fontSize: 'inherit' }}><TransactionDescriptionText description={tx.description} /></Typography>
                          </Button>
                        {transactionCard && <Typography noWrap title={transactionCard.name} sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', lineHeight: '12px' }}>{transactionCard.name}</Typography>}
                        </Box>
                        {transactionCard && (
                          <Box
                            role="img"
                            aria-label={`Bandeira ${transactionCard.brand}`}
                            title={transactionCard.brand}
                            sx={{ ml: 'auto', width: 36, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: "1px solid var(--color-border)", borderRadius: '8px' }}
                          >
                            <CardBrandLogo brand={transactionCard.brand} />
                          </Box>
                        )}
                      </Box>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 24 }}>
                        {isFixedTransaction(tx.description) && (
                          <Box
                            role="img"
                            aria-label="Lançamento fixo"
                            title="Lançamento fixo"
                            sx={{ position: 'absolute', left: -20, width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }}
                          />
                        )}
                        {getCategoryChips(tx.categoryId)}
                      </Box>
                    </TableCell>

                    {/* Account */}
                    <TableCell>
                      {tx.type === 'TRANSFER' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {account && renderAccountLogo(account)}
                          <Typography noWrap title={account?.name} sx={{ minWidth: 0, color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.8rem' }}>
                            {account?.name}
                          </Typography>
                          <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", mx: 0.5 }}>➔</Typography>
                          {destAccount && renderAccountLogo(destAccount)}
                          <Typography noWrap title={destAccount?.name} sx={{ minWidth: 0, color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.8rem' }}>
                            {destAccount?.name}
                          </Typography>
                        </Box>
                      ) : (
                        account && (
                          <Box sx={{ display: 'inline-flex', maxWidth: '100%', boxSizing: 'border-box', alignItems: 'center', gap: 1.25, bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)", border: "1px solid var(--color-border)", borderRadius: '12px', px: 1.5, py: 0.5 }}>
                            {renderAccountLogo(account)}
                            <Typography noWrap title={account.name} sx={{ minWidth: 0, color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.8rem' }}>
                              {account.name}
                            </Typography>
                          </Box>
                        )
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell sx={{ color: "var(--color-text-primary, #FFFFFF)" }}>
                      {formatDateToPtBr(tx.effective && tx.effectiveDate ? tx.effectiveDate : tx.dueDate || tx.date)}
                    </TableCell>

                    {/* Value */}
                    <TableCell sx={{ fontWeight: 700 }}>
                      {(() => {
                        const formatted = `R$ ${tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                        if (activeTab === 'STATEMENT') {
                          if (tx.type === 'REVENUE') return <Typography component="span" sx={{ color: "var(--color-income, #4EBE87)", fontWeight: 700, fontSize: '0.875rem' }}>+ {formatted}</Typography>;
                          if (tx.type === 'EXPENSE') return <Typography component="span" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.875rem' }}>- {formatted}</Typography>;
                          return <Typography component="span" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.875rem' }}>{formatted}</Typography>;
                        }
                        return <Typography component="span" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '0.875rem' }}>{formatted}</Typography>;
                      })()}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <IconButton size="small" aria-label="Editar lançamento" onClick={(event) => { event.stopPropagation(); handleOpenEdit(tx); }} sx={{ color: "var(--color-text-secondary, #7E8494)", '&:hover': { color: "var(--color-text-primary, #FFFFFF)" } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAnchor(e.currentTarget);
                            setActiveTx(tx);
                          }}
                          sx={{ color: "var(--color-text-secondary, #7E8494)", '&:hover': { color: "var(--color-text-primary, #FFFFFF)" } }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TransactionDetailsDialog
        open={Boolean(detailTransaction) && !modalOpen}
        zIndex={statementTarget ? 1500 : undefined}
        transaction={detailTransaction}
        installmentSummary={installmentSummary}
        account={detailTransaction ? accounts.find((account) => account.id === getTransactionAccountId(detailTransaction)) : undefined}
        destinationAccount={accounts.find((account) => account.id === detailTransaction?.destinationAccountId)}
        card={cards.find((card) => card.id === detailTransaction?.creditCardId)}
        category={detailParentCategory}
        subcategory={detailCategory?.parentCategoryId ? detailCategory : undefined}
        updating={updatingStatus}
        onClose={() => setDetailTransactionId(null)}
        onEdit={() => { if (detailTransaction) handleOpenEdit(detailTransaction); }}
        onEditDescription={async (description) => {
          if (!detailTransaction) return;
          if (statusUpdateInProgress.current) throw new Error('Aguarde a atualização em andamento.');
          statusUpdateInProgress.current = true;
          setUpdatingStatus(true);
          try {
            await api.patch(`/transactions/${detailTransaction.id}/description`, {
              description: restoreTransactionDescription(description, detailTransaction.description),
            });
            await fetchData();
          } catch (err: any) {
            throw new Error(err.response?.data?.detail || 'Não foi possível atualizar a descrição.');
          } finally {
            statusUpdateInProgress.current = false;
            setUpdatingStatus(false);
          }
        }}
        onDelete={() => handleOpenDeleteConfirm(detailTransaction)}
        onToggleEffective={() => { if (detailTransaction) handleToggleEffective(detailTransaction); }}
        onAccount={(accountId) => {
          setDetailTransactionId(null);
          setActiveTab('STATEMENT');
          navigate(`/transacoes?${new URLSearchParams({ month: String(queryMonth), year: String(queryYear), tab: 'STATEMENT', account_id: accountId })}`);
        }}
        onCategory={(id) => { setDetailTransactionId(null); applyCategoryFilter(id); }}
      />

      {/* Options Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { bgcolor: "var(--color-surface-raised, #1D1E26)", border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)", borderRadius: '12px' } }}
      >
        <MenuItem onClick={() => handleOpenDeleteConfirm()} sx={{ color: "var(--color-expense, #E05A5A)", fontWeight: 600 }}>Excluir Transação</MenuItem>
      </Menu>

      {/* DIALOG: Confirm Delete */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => { if (!deleting) setDeleteConfirmOpen(false); }}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: "var(--color-panel, #111217)",
            backgroundImage: 'none',
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary, #FFFFFF)",
            p: 3,
            maxWidth: '400px',
            width: '100%',
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            Excluir Transação
          </Typography>
          <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.9rem', mb: 3 }}>
            Tem certeza de que deseja excluir esta transação? Esta ação é irreversível.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
              sx={{
                color: "var(--color-text-secondary, #7E8494)",
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { color: "var(--color-text-primary, #FFFFFF)" }
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              variant="contained"
              sx={{
                bgcolor: '#E05A5A',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5,
                '&:hover': { bgcolor: '#C94747' }
              }}
            >
              Excluir
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Recurrent Delete Confirm */}
      <Dialog
        open={recurrentDeleteOpen}
        onClose={() => { if (!deleting) setRecurrentDeleteOpen(false); }}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: "var(--color-panel, #111217)",
            backgroundImage: 'none',
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary, #FFFFFF)",
            p: 4,
            maxWidth: '420px',
            width: '100%',
          }
        }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '1.25rem' }}>
              O que você deseja?
            </Typography>
            <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.9rem', lineHeight: 1.5 }}>
              Essa operação fará com que o saldo da conta seja recalculado desde a data do primeiro lançamento.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleConfirmDeleteRecurrent('ONLY_CURRENT')}
              disabled={deleting}
              startIcon={<EventBusyIcon sx={{ color: "var(--color-expense, #E05A5A)" }} />}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: "var(--color-text-primary, #FFFFFF)",
                bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)",
                border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                borderRadius: '12px',
                py: 1.8,
                px: 2.5,
                fontWeight: 600,
                fontSize: '0.95rem',
                '&:hover': {
                  bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                  borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.12)",
                  transform: 'none',
                }
              }}
            >
              Excluir apenas esta
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleConfirmDeleteRecurrent('CURRENT_AND_FUTURE')}
              disabled={deleting}
              startIcon={<DeleteSweepIcon sx={{ color: "var(--color-expense, #E05A5A)" }} />}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: "var(--color-text-primary, #FFFFFF)",
                bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)",
                border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                borderRadius: '12px',
                py: 1.8,
                px: 2.5,
                fontWeight: 600,
                fontSize: '0.95rem',
                '&:hover': {
                  bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                  borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.12)",
                  transform: 'none',
                }
              }}
            >
              Excluir esta e as próximas
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleConfirmDeleteRecurrent('ALL')}
              disabled={deleting}
              startIcon={<DeleteIcon sx={{ color: "var(--color-expense, #E05A5A)" }} />}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: "var(--color-text-primary, #FFFFFF)",
                bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)",
                border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                borderRadius: '12px',
                py: 1.8,
                px: 2.5,
                fontWeight: 600,
                fontSize: '0.95rem',
                '&:hover': {
                  bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
                  borderColor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.12)",
                  transform: 'none',
                }
              }}
            >
              Excluir todas
            </Button>
          </Box>

          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={reorganize}
                  disabled={deleting}
                  onChange={(e) => setReorganize(e.target.checked)}
                  color="secondary"
                  sx={{
                    color: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.3)",
                    '&.Mui-checked': {
                      color: "var(--color-expense, #E05A5A)",
                    }
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: '0.9rem', color: "var(--color-text-secondary, #7E8494)", fontWeight: 500 }}>
                  Atualizar o número de parcelas
                </Typography>
              }
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Bottom Summary Bar */}
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
        <Box aria-label="Totais das transações" sx={{
          display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 240px)', sm: 'repeat(3, 240px)' },
          alignItems: 'center', gap: 3, maxWidth: '100%', overflowX: 'auto',
          '& > div': { minWidth: 0 },
          '& .MuiTypography-root': { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', overflowX: 'auto' },
          '& > div > svg, & > div > div': { flexShrink: 0 },
        }}>
          {/* Efetivadas */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ color: "var(--color-income, #4EBE87)", fontSize: '1.1rem' }} />
            <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600 }}>
              Efetivadas:{' '}
              <Box component="span" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>
                R$ {sumEffective.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Box>
            </Typography>
          </Box>

          {/* Pendentes */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ color: "var(--color-text-secondary, #6F768E)", fontSize: '1.1rem' }} />
            <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600 }}>
              Pendentes:{' '}
              <Box component="span" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>
                R$ {sumPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Box>
            </Typography>
          </Box>

          {/* Total */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: '#E05A5A15', border: '1px solid #E05A5A40', display: 'flex', alignItems: 'center', justifyContent: 'center', color: "var(--color-expense, #E05A5A)", fontSize: '0.75rem', fontWeight: 700 }}>$</Box>
            <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600 }}>
              Total:{' '}
              <Box component="span" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 800 }}>
                R$ {sumTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Box>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {isFocusedMode && totalRows > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Linhas por página:
              </Typography>
              <FormControl size="small" variant="standard">
                <Select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  disableUnderline
                  sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.8rem', fontWeight: 600 }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <MenuItem key={n} value={n}>{n}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {pageStart + 1}-{pageEnd} de {totalRows}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton size="small" disabled={currentPage === 0} onClick={() => setPage(0)} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
                  <FirstPageIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
                  <NavigateBeforeIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
                  <NavigateNextIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage(totalPages - 1)}
                  sx={{ color: "var(--color-text-secondary, #7E8494)" }}
                >
                  <LastPageIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* DIALOG: Create / Edit Transaction Modal */}
      </>}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth={isRefundExpense ? 'sm' : 'md'}
        fullWidth
        sx={{ zIndex: composer || statementTarget ? 1400 : undefined }}
        PaperProps={{ sx: { ...transactionPaperSx, ...(isRefundExpense ? { maxWidth: 600 } : {}) } }}
      >
        <form onSubmit={handleSubmitTx}>
          {error && <Alert severity="error">{error}</Alert>}
          {/* Header */}
          <Box data-transaction-header sx={transactionHeaderSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
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
                  {isRefundExpense ? (isEditing ? 'Editar Estorno' : 'Novo Estorno') : isEditing
                    ? (txType === 'REVENUE' ? 'Editar Receita' : txType === 'TRANSFER' ? 'Editar Transferência' : isCardExpense ? 'Despesa cartão' : 'Editar Despesa')
                    : (txType === 'REVENUE' ? 'Nova Receita' : txType === 'TRANSFER' ? 'Nova Transferência' : isCardExpense ? 'Despesa cartão' : 'Nova Despesa')}
                </Typography>
                <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", display: 'block', mt: -0.2 }}>
                  {isRefundExpense ? 'Estorno de fatura' : txType === 'TRANSFER' ? 'Transferência entre contas' : isCardExpense ? 'Lançamento no cartão' : 'Lançamento em conta'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isRefundExpense && isEditing && activeTx && (
                <Button
                  type="button"
                  aria-label={txType === 'EXPENSE' && !isRefundExpense ? 'Excluir despesa' : 'Excluir transação'}
                  onClick={() => handleOpenDeleteConfirm()}
                  sx={{ color: 'var(--color-expense, #E05A5A)', minWidth: 32, px: 1, gap: 0.75, '&:hover': { bgcolor: 'rgba(224, 90, 90, 0.08)' } }}
                >
                  <DeleteIcon fontSize="small" />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {txType === 'EXPENSE' && !isRefundExpense ? 'Excluir despesa' : 'Excluir transação'}
                  </Box>
                </Button>
              )}
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
                  bgcolor: isRefundExpense ? '#4EBE87' : txType === 'REVENUE' ? '#4EBE87' : txType === 'TRANSFER' ? '#F4A261' : (isCardExpense ? 'var(--color-primary)' : '#E05A5A'),
                  backgroundImage: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: isRefundExpense ? '#3ea673' : txType === 'REVENUE' ? '#3ea673' : txType === 'TRANSFER' ? '#e08f4c' : (isCardExpense ? 'var(--color-primary-dark)' : '#c94747'),
                    boxShadow: 'none'
                  }
                }}
              >
                Salvar
              </Button>
              <IconButton aria-label="Fechar lançamento" onClick={handleCloseModal} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <DialogContent data-transaction-content sx={isRefundExpense ? { ...transactionContentSx, pt: 1.5 } : transactionContentSx}>
            {isRefundExpense ? <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--transaction-field-gap)' }}>
              {renderFieldBox('Cartão de Crédito', <TextField select fullWidth value={txCardId} onChange={(event) => {
                const newCardId = event.target.value;
                setTxCardId(newCardId);
                const newCard = cards.find((item) => item.id === newCardId);
                if (newCard?.accountId) setTxAccountId(newCard.accountId);
                const invoice = newCard ? getFirstOpenInvoice(newCard, new Date()) : undefined;
                if (invoice) setTxDueDate(invoice.dueDateISO);
              }} required variant="standard" InputProps={{ disableUnderline: true }} SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}>
                {cards.map((card) => <MenuItem key={card.id} value={card.id}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}><BankLogo icon={card.bank} customIconUrl={card.customIconUrl} name={card.name} /><Typography sx={{ flex: 1 }}>{card.name}</Typography><CardBrandLogo brand={card.brand} /></Box></MenuItem>)}
              </TextField>)}
              {renderFieldBox('Descrição', renderDescriptionInput())}
              <TransactionAmountField value={txValue} color={getThemeColor()} onChange={(value) => setTxValue(maskBRL(value))} />
              {renderFieldBox('Data de lançamento', <Box onClick={() => {
                const parsed = txDate ? new Date(`${txDate}T12:00:00`) : new Date();
                setTempDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
                setCalendarViewDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
                setDatePickerTarget('LANCAMENTO');
                setDatePickerOpen(true);
              }} sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', cursor: 'pointer' }}><Typography sx={{ color: 'var(--color-text-primary, #FFFFFF)', fontSize: '0.9rem' }}>{formatDateToPtBr(txDate)}</Typography></Box>)}
              {renderFieldBox('Fatura', <TextField select fullWidth value={txDueDate} onChange={(event) => setTxDueDate(event.target.value)} required variant="standard" InputProps={{ disableUnderline: true }} SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}>
                {(() => {
                  const selectedCard = cards.find((card) => card.id === txCardId);
                  const invoices = selectedCard ? getInvoiceOptions(selectedCard, new Date(), 12, 13) : [];
                  if (txDueDate && !invoices.some((invoice) => invoice.dueDateISO === txDueDate)) {
                    const [invoiceYear, invoiceMonth] = txDueDate.split('-').map(Number);
                    invoices.unshift({ dueDateISO: txDueDate, month: invoiceMonth, year: invoiceYear });
                  }
                  return invoices.map((invoice) => <MenuItem key={invoice.dueDateISO} value={invoice.dueDateISO}>{`${monthsFull[invoice.month - 1].charAt(0).toUpperCase()}${monthsFull[invoice.month - 1].slice(1)}, ${invoice.year}`}</MenuItem>);
                })()}
              </TextField>)}
              {renderFieldBox('Categoria', <TextField select fullWidth value={txCategoryId} onChange={(event) => {
                const nextCategory = event.target.value;
                setTxCategoryId(nextCategory);
                const defaultSubcategory = categories.find((category) => category.parentCategoryId === nextCategory && category.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'estornos') || categories.find((category) => category.parentCategoryId === nextCategory);
                setTxSubcategoryId(defaultSubcategory?.id || '');
              }} required variant="standard" InputProps={{ disableUnderline: true }} SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}>
                {categories.filter((category) => category.type === 'EXPENSE' && !category.parentCategoryId).map((category) => <MenuItem key={category.id} value={category.id}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: '#fff' }}><Box sx={{ display: 'flex', color: category.color || 'text.secondary' }}>{getCategoryIcon(category.icon, category.name)}</Box>{category.name}</Box></MenuItem>)}
              </TextField>)}
              {renderFieldBox('Subcategoria', <TextField select fullWidth value={txSubcategoryId || ''} onChange={(event) => setTxSubcategoryId(event.target.value)} disabled={!txCategoryId || !categories.some((category) => category.parentCategoryId === txCategoryId)} variant="standard" InputProps={{ disableUnderline: true }} SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}>
                {categories.filter((category) => category.parentCategoryId === txCategoryId).map((category) => <MenuItem key={category.id} value={category.id}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: '#fff' }}><Box sx={{ display: 'flex', color: category.color || 'text.secondary' }}>{getCategoryIcon(category.icon, category.name)}</Box>{category.name}</Box></MenuItem>)}
              </TextField>)}
              {renderFieldBox('Conta', <TextField select fullWidth value={selectedTxAccountId} onChange={(event) => setTxAccountId(event.target.value)} disabled={Boolean(linkedCardAccountId)} required variant="standard" InputProps={{ disableUnderline: true }} SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}>
                {accounts.map((account) => <MenuItem key={account.id} value={account.id}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}><BankLogo icon={account.icon || 'bank'} customIconUrl={account.customIconUrl} name={account.name} color={account.color} /><Typography>{account.name}</Typography></Box></MenuItem>)}
              </TextField>)}
            </Box> : <>
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
                    SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}
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
                          if (newCard?.accountId) setTxAccountId(newCard.accountId);
                          const firstOpenInvoice = newCard ? getFirstOpenInvoice(newCard, new Date()) : undefined;
                          if (firstOpenInvoice) setTxDueDate(firstOpenInvoice.dueDateISO);
                        }}
                        required
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}
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
                        SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}
                        sx={{ '& .MuiSelect-select': { color: "var(--color-text-primary, #FFFFFF)", py: 0.25, fontSize: '0.9rem' } }}
                      >
                        {(() => {
                          const selectedCard = cards.find((c) => c.id === txCardId);
                          const options = selectedCard ? getInvoiceOptions(selectedCard, new Date(), 12, 13) : [];
                          // Editar uma despesa de fatura já fechada/paga: garante que o valor
                          // atual apareça na lista mesmo fora da janela de faturas abertas.
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
                        SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}
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
                        SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}
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
                      SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}
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
                            SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}
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
                                    <Typography sx={{ color: '#fff' }}>{cat.name}</Typography>
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
                            SelectProps={{ MenuProps: { sx: { zIndex: 1501 } } }}
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
                                    <Typography sx={{ color: '#fff' }}>{sub.name}</Typography>
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
                {isEditing && activeTx && isInstallmentTransaction(activeTx.description) ? renderFieldBox('Recorrência', (
                  <Typography sx={{ color: 'var(--color-text-primary, #FFFFFF)', fontSize: '0.9rem' }}>Parcelada</Typography>
                )) : renderFieldBox('Recorrência', (
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
                        <AccessTimeIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.1rem' }} />
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

            </>}
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

      {/* DIALOG: Contabilizar no mês da efetivação? */}
      <Dialog
        open={futureConfirmOpen}
        onClose={() => {
          if (statusUpdateInProgress.current) return;
          setFutureConfirmOpen(false);
          setFutureTxsToToggle([]);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: "var(--color-panel, #15161C)",
            backgroundImage: 'none',
            border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
            color: "var(--color-text-primary, #FFFFFF)",
            p: 4
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)", fontSize: '1.2rem' }}>
            Contabilizar no mês da efetivação?
          </Typography>
          <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.9rem', lineHeight: 1.6 }}>
            Essa transação vence em outro mês. Para contabilizar no mês de vencimento, a data da efetivação deve ser no mesmo mês.
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mt: 1.5 }}>
            <Button
              disabled={updatingStatus}
              onClick={async () => {
                if (await executeToggle(futureTxsToToggle, true, null, true)) {
                  setFutureConfirmOpen(false);
                  setFutureTxsToToggle([]);
                }
              }}
              sx={{
                color: '#53A1F5',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                '&:hover': { bgcolor: 'rgba(83, 161, 245, 0.08)' }
              }}
            >
              Contabilizar no vencimento
            </Button>
            <Button
              disabled={updatingStatus}
              onClick={async () => {
                if (await executeToggle(futureTxsToToggle, true, getLocalToday())) {
                  setFutureConfirmOpen(false);
                  setFutureTxsToToggle([]);
                }
              }}
              variant="contained"
              sx={{
                bgcolor: '#53A1F5',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '24px',
                px: 3,
                py: 1,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#428FD6', boxShadow: 'none' }
              }}
            >
              Contabilizar em {getMonthName(new Date().getMonth())}
            </Button>
          </Box>
        </Box>
      </Dialog>

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
          {/* Left Panel */}
          <Box sx={{ width: { xs: '100%', sm: '210px' }, bgcolor: "var(--color-panel, #111217)", p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: "1px solid var(--color-border)" }}>
            <Box>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600, letterSpacing: '0.5px', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {tempDate.getFullYear()}
              </Typography>
              <Typography variant="h4" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, mt: 1, fontSize: '1.8rem', lineHeight: 1.25 }}>
                {formatSelectedDatePtBr(tempDate)}
              </Typography>
            </Box>
          </Box>

          {/* Right Panel */}
          <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.95rem' }}>
                  {monthsFull[calendarViewDate.getMonth()].charAt(0).toUpperCase() + monthsFull[calendarViewDate.getMonth()].slice(1)} de {calendarViewDate.getFullYear()}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton size="small" onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))} sx={{ color: "var(--color-text-primary, #FFFFFF)" }}>
                    <ChevronRightIcon sx={{ transform: 'rotate(180deg)', fontSize: '1.1rem' }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))} sx={{ color: "var(--color-text-primary, #FFFFFF)" }}>
                    <ChevronRightIcon sx={{ fontSize: '1.1rem' }} />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, justifyItems: 'center', mb: 1.5 }}>
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                  <Typography key={idx} variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600, fontSize: '0.75rem', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {day}
                  </Typography>
                ))}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, justifyItems: 'center' }}>
                {getDaysInMonthGrid(calendarViewDate).map((day, idx) => {
                  if (!day) return <Box key={`empty-${idx}`} sx={{ width: 36, height: 36 }} />;
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
                        '&:hover': { bgcolor: isSelected ? themeColor : "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" }
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

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button onClick={() => setDatePickerOpen(false)} sx={{ color: getThemeColor(), fontWeight: 600, textTransform: 'none' }}>
                CANCELAR
              </Button>
              <Button
                onClick={() => {
                  const formatted = tempDate.toISOString().split('T')[0];
                  if (datePickerTarget === 'EFETIVACAO') {
                    setTxEffectiveDate(formatted);
                    if (txEffective && formatted > getLocalToday()) {
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
                sx={{ color: getThemeColor(), fontWeight: 600, textTransform: 'none' }}
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
          <Box sx={{ width: { xs: '100%', sm: timePickerViewMode === 'KEYBOARD' ? '100%' : '240px' }, bgcolor: "var(--color-panel, #111217)", p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', borderRight: timePickerViewMode === 'KEYBOARD' ? 'none' : "1px solid var(--color-border)" }}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                {timePickerViewMode === 'KEYBOARD' ? 'Insira o horário' : 'Selecione o horário'}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', my: 1.5 }}>
              {timePickerViewMode === 'DIAL' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                  <Box onClick={() => setTimePickerMode('HOURS')} sx={{ bgcolor: "var(--color-surface-raised, #1e1f25)", border: '1.5px solid', borderColor: timePickerMode === 'HOURS' ? getThemeColor() : 'transparent', borderRadius: '8px', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Typography sx={{ fontSize: '3.2rem', fontWeight: 700, color: timePickerMode === 'HOURS' ? getThemeColor() : "var(--color-text-primary, #FFFFFF)", lineHeight: 1 }}>
                      {tempHour.toString().padStart(2, '0')}
                    </Typography>
                  </Box>
                  <Typography variant="h3" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 700, mx: 0.5 }}>:</Typography>
                  <Box onClick={() => setTimePickerMode('MINUTES')} sx={{ bgcolor: "var(--color-surface-raised, #1e1f25)", border: '1.5px solid', borderColor: timePickerMode === 'MINUTES' ? getThemeColor() : 'transparent', borderRadius: '8px', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Typography sx={{ fontSize: '3.2rem', fontWeight: 700, color: timePickerMode === 'MINUTES' ? getThemeColor() : "var(--color-text-primary, #FFFFFF)", lineHeight: 1 }}>
                      {tempMinute.toString().padStart(2, '0')}
                    </Typography>
                  </Box>
                </Box>
              ) : (
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
                        if (!isNaN(val) && val >= 0 && val < 24) setTempHour(val);
                      }}
                      style={{ width: '80px', height: '80px', backgroundColor: "var(--color-surface-raised, #1e1f25)", color: "var(--color-text-primary, #FFFFFF)", border: '1.5px solid', borderColor: focusedField === 'HOURS' ? getThemeColor() : 'transparent', borderRadius: '8px', fontSize: '3.2rem', fontWeight: 700, textAlign: 'center', outline: 'none' }}
                    />
                    <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', mt: 0.5 }}>Hora</Typography>
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
                        if (!isNaN(val) && val >= 0 && val < 60) setTempMinute(val);
                      }}
                      style={{ width: '80px', height: '80px', backgroundColor: "var(--color-surface-raised, #1e1f25)", color: "var(--color-text-primary, #FFFFFF)", border: '1.5px solid', borderColor: focusedField === 'MINUTES' ? getThemeColor() : 'transparent', borderRadius: '8px', fontSize: '3.2rem', fontWeight: 700, textAlign: 'center', outline: 'none' }}
                    />
                    <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', mt: 0.5 }}>Minuto</Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {timePickerViewMode === 'DIAL' ? (
              <Box sx={{ mt: 1 }}>
                <IconButton size="small" onClick={() => setTimePickerViewMode('KEYBOARD')} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mt: 1 }}>
                <IconButton size="small" onClick={() => setTimePickerViewMode('DIAL')} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </IconButton>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={() => setTimePickerOpen(false)} sx={{ color: getThemeColor(), fontWeight: 600, textTransform: 'none' }}>CANCELAR</Button>
                  <Button
                    onClick={() => {
                      let finalHour = tempHour;
                      let finalMinute = tempMinute;
                      const parsedHour = parseInt(rawHourStr.replace(/[^0-9]/g, ''));
                      if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour < 24) finalHour = parsedHour;
                      const parsedMinute = parseInt(rawMinuteStr.replace(/[^0-9]/g, ''));
                      if (!isNaN(parsedMinute) && parsedMinute >= 0 && parsedMinute < 60) finalMinute = parsedMinute;
                      setTempHour(finalHour);
                      setTempMinute(finalMinute);
                      setTxTimeVal(`${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`);
                      setTimePickerOpen(false);
                    }}
                    sx={{ color: getThemeColor(), fontWeight: 600, textTransform: 'none' }}
                  >
                    OK
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {timePickerViewMode === 'DIAL' && (
            <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', my: 0.5 }}>
                <svg
                  width="220"
                  height="220"
                  onMouseDown={(e) => { setIsDraggingTime(true); handleClockInteraction(e.clientX, e.clientY, e.currentTarget); }}
                  onMouseMove={(e) => { if (isDraggingTime) handleClockInteraction(e.clientX, e.clientY, e.currentTarget); }}
                  onMouseUp={() => setIsDraggingTime(false)}
                  onMouseLeave={() => setIsDraggingTime(false)}
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
                        <circle cx={handX} cy={handY} r="14" fill={getThemeColor()} />
                      </>
                    );
                  })()}

                  {timePickerMode === 'HOURS' ? (
                    <>
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hourVal, idx) => {
                        const angleDeg = idx * 30 - 90;
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const textX = 110 + 82 * Math.cos(angleRad);
                        const textY = 110 + 82 * Math.sin(angleRad);
                        const isSelected = tempHour === hourVal;
                        return (
                          <text key={`outer-${hourVal}`} x={textX} y={textY + 4.5} textAnchor="middle" fill={isSelected ? '#FFFFFF' : '#B3B8C4'} style={{ fontSize: '0.85rem', fontWeight: isSelected ? '700' : '500', pointerEvents: 'none' }}>
                            {hourVal.toString()}
                          </text>
                        );
                      })}
                      {[0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((hourVal, idx) => {
                        const angleDeg = idx * 30 - 90;
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const textX = 110 + 54 * Math.cos(angleRad);
                        const textY = 110 + 54 * Math.sin(angleRad);
                        const isSelected = tempHour === hourVal;
                        return (
                          <text key={`inner-${hourVal}`} x={textX} y={textY + 4} textAnchor="middle" fill={isSelected ? '#FFFFFF' : 'rgba(179, 184, 196, 0.6)'} style={{ fontSize: '0.75rem', fontWeight: isSelected ? '700' : '500', pointerEvents: 'none' }}>
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
                        <text key={minVal} x={textX} y={textY + 4.5} textAnchor="middle" fill={isSelected ? '#FFFFFF' : '#B3B8C4'} style={{ fontSize: '0.85rem', fontWeight: isSelected ? '700' : '500', pointerEvents: 'none' }}>
                          {minVal.toString().padStart(2, '0')}
                        </text>
                      );
                    })
                  )}
                </svg>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, width: '100%', mt: 1 }}>
                <Button onClick={() => setTimePickerOpen(false)} sx={{ color: getThemeColor(), fontWeight: 600, textTransform: 'none' }}>CANCELAR</Button>
                <Button onClick={() => { setTxTimeVal(`${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`); setTimePickerOpen(false); }} sx={{ color: getThemeColor(), fontWeight: 600, textTransform: 'none' }}>OK</Button>
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

      <CardStatementDialog
        key={statementTarget ? `${statementTarget.card.id}-${queryMonth}-${queryYear}` : 'closed'}
        open={Boolean(statementTarget)}
        onClose={() => setStatementTarget(null)}
        card={statementTarget?.card || null}
        transactions={statementTarget ? transactions.filter((tx) => tx.creditCardId === statementTarget.card.id) : []}
        categories={categories}
        month={queryMonth}
        year={queryYear}
        onSelectTransaction={(tx) => handleOpenDetails(tx as Transaction)}
        onAddExpense={(dueDateISO) => {
          if (statementTarget) handleAddCardExpenseFromStatement(statementTarget.card, dueDateISO);
        }}
        onAddRefund={(dueDateISO) => {
          if (statementTarget) handleAddCardRefundFromStatement(statementTarget.card, dueDateISO);
        }}
      />
    </Box>
  );

  if (isFocusedMode) {
    const monthLabel = monthsFull[queryMonth - 1].charAt(0).toUpperCase() + monthsFull[queryMonth - 1].slice(1);
    return (
      <FocusedLayout
        title={focusedConfig?.title || ''}
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showMonthNav
        monthLabel={monthLabel}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onAdd={() => handleOpenFocusedAddModal()}
        addMenuOptions={
          focusedConfig?.tab === 'EXPENSE'
            ? [
                {
                  key: 'expense',
                  label: 'Despesa',
                  icon: <RemoveIcon sx={{ fontSize: '1.25rem' }} />,
                  iconColor: '#E05A5A',
                  onClick: () => handleOpenFocusedAddModal(false),
                },
                {
                  key: 'expense_card',
                  label: 'Despesa cartão',
                  icon: <CardIcon sx={{ fontSize: '1.25rem' }} />,
                  iconColor: 'var(--color-primary)',
                  onClick: () => handleOpenFocusedAddModal(true),
                },
              ]
            : undefined
        }
      >
        {pageContent}
      </FocusedLayout>
    );
  }

  return pageContent;
};

export default TransactionsPage;
