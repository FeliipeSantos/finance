import React, { useState } from 'react';
import { Menu, MenuItem, Avatar, Box, Dialog, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  CreditCard as CardIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Undo as RefundIcon,
} from '@mui/icons-material';
import { renderBankLogoSvg } from '../utils/bankIcons';
import { getInvoicePeriod } from '../utils/cardInvoice';
import { getCategoryIcon } from '../utils/categoryIcons';
import TransactionDescriptionText from './TransactionDescriptionText';
import TransactionDetailsDialog from './TransactionDetailsDialog';
import { isInstallmentTransaction } from '../utils/transactionDescription';
import { roundCurrency } from '../utils/currency';

interface StatementCard {
  id: string;
  name: string;
  bank: string;
  customIconUrl?: string;
  closingDay: number;
  dueDay: number;
}

interface StatementTransaction {
  id: string;
  recurrenceGroupId?: string;
  categoryId?: string;
  description: string;
  value: number;
  effective: boolean;
  effectiveDate?: string;
  dueDate?: string;
  date: string;
}

interface StatementCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  parentCategoryId?: string;
}

interface CardStatementDialogProps {
  open: boolean;
  onClose: () => void;
  card: StatementCard | null;
  // Todas as transações do cartão (não só as do mês inicial) — o navegador de
  // meses do próprio diálogo filtra internamente por fatura conforme o mês
  // exibido muda, sem precisar reabrir o diálogo a partir da tabela.
  transactions: StatementTransaction[];
  categories: StatementCategory[];
  month: number;
  year: number;
  onSelectTransaction?: (tx: StatementTransaction) => void;
  onEditTransaction?: (tx: StatementTransaction) => void;
  onAddExpense: (dueDateISO: string) => void;
  onAddRefund: (dueDateISO: string) => void;
}

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// O extrato de fatura agrupa pela data de lançamento (compra) de cada item,
// não pela data de vencimento da fatura (essa já aparece fixa no cabeçalho) —
// senão toda compra do período aparece amontoada num único dia (o vencimento).
const getDisplayDate = (tx: StatementTransaction) => tx.date;

// Já para decidir a QUAL fatura (mês) um lançamento pertence, o critério é o
// mesmo usado no resto da tela (TransactionsPage): efetivada usa a data de
// efetivação, senão cai na data de vencimento (fatura) — é isso que muda ao
// navegar de mês dentro do diálogo.
const getInvoiceDate = (tx: StatementTransaction) =>
  tx.effective && tx.effectiveDate ? tx.effectiveDate : tx.dueDate || tx.date;

const formatBRL = (value: number) => `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatDateHeader = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y} • ${WEEKDAYS[dt.getDay()]}`;
};

const formatShortDate = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

const nextMonth = (month: number, year: number) => (month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year });
const prevMonth = (month: number, year: number) => (month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year });

const CardStatementDialog: React.FC<CardStatementDialogProps> = ({
  open,
  onClose,
  card,
  transactions,
  categories,
  month,
  year,
  onSelectTransaction,
  onEditTransaction,
  onAddExpense,
  onAddRefund,
}) => {
  // O componente é remontado (via `key` no pai, por card+mês) a cada nova
  // linha clicada, então o estado inicial aqui só precisa refletir o mês
  // daquela linha — navegar dentro do diálogo não deve disparar remount.
  const [curMonth, setCurMonth] = useState(month);
  const [curYear, setCurYear] = useState(year);
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  if (!card) return null;

  const invoiceTransactions = transactions.filter((tx) => {
    const [y, m] = getInvoiceDate(tx).split('-').map(Number);
    return y === curYear && m === curMonth;
  });
  const selectedTransaction = selectedTransactionId
    ? transactions.find((tx) => tx.id === selectedTransactionId) || null
    : null;
  const selectedCategory = selectedTransaction
    ? categories.find((category) => category.id === selectedTransaction.categoryId)
    : undefined;
  const selectedParentCategory = selectedCategory?.parentCategoryId
    ? categories.find((category) => category.id === selectedCategory.parentCategoryId)
    : selectedCategory;
  const installmentTransactions = selectedTransaction?.recurrenceGroupId && isInstallmentTransaction(selectedTransaction.description)
    ? transactions.filter((tx) => tx.recurrenceGroupId === selectedTransaction.recurrenceGroupId)
    : [];
  const installmentTotal = roundCurrency(installmentTransactions.reduce((sum, tx) => sum + Math.abs(Number(tx.value)), 0));
  const installmentEffective = roundCurrency(installmentTransactions.reduce((sum, tx) => sum + (tx.effective ? Math.abs(Number(tx.value)) : 0), 0));
  const installmentSummary = installmentTransactions.length > 0 ? {
    total: installmentTotal,
    effective: installmentEffective,
    pending: roundCurrency(Math.max(0, installmentTotal - installmentEffective)),
    progress: installmentTotal > 0 ? Math.min(100, (installmentEffective / installmentTotal) * 100) : 0,
  } : null;

  const total = invoiceTransactions.reduce((acc, tx) => acc + Number(tx.value || 0), 0);
  const { closingDate, dueDate } = getInvoicePeriod(card, curMonth, curYear);
  const currentDueDateISO = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

  const byDate = new Map<string, StatementTransaction[]>();
  invoiceTransactions.forEach((tx) => {
    const key = getDisplayDate(tx);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(tx);
  });
  // Mais recente primeiro (comparação lexicográfica funciona pois as chaves
  // estão em formato ISO YYYY-MM-DD).
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : -1));

  // "Fatura parcial" = quanto resta da fatura ao considerar aquela data e
  // todas as anteriores (mais recente primeiro) — começa no total e vai
  // descontando o valor de cada dia conforme desce no histórico.
  const sections = sortedDates.reduce<
    Array<{ dateKey: string; dayTxs: StatementTransaction[]; dayTotal: number; remainingBeforeThisDay: number }>
  >((acc, dateKey) => {
    const dayTxs = byDate.get(dateKey)!;
    const dayTotal = dayTxs.reduce((s, tx) => s + Number(tx.value || 0), 0);
    const previous = acc[acc.length - 1];
    const remainingBeforeThisDay = previous ? previous.remainingBeforeThisDay - previous.dayTotal : total;
    return [...acc, { dateKey, dayTxs, dayTotal, remainingBeforeThisDay }];
  }, []);

  const goPrevMonth = () => {
    const { month: m, year: y } = prevMonth(curMonth, curYear);
    setCurMonth(m);
    setCurYear(y);
  };

  const goNextMonth = () => {
    const { month: m, year: y } = nextMonth(curMonth, curYear);
    setCurMonth(m);
    setCurYear(y);
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "var(--color-panel, #13141B)",
          borderRadius: '8px',
          border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)" }}>
        <IconButton onClick={onClose} sx={{ color: "var(--color-text-secondary, #6F768E)", p: 0.5 }}>
          <CloseIcon />
        </IconButton>
        <Box sx={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', display: 'flex', flexShrink: 0 }}>
          {card.customIconUrl ? (
            <Box component="img" src={card.customIconUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            renderBankLogoSvg(card.bank, 40)
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700, fontSize: '1.05rem' }}>{card.name}</Typography>
          <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.85rem' }}>{formatBRL(total)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem' }}>Fecha dia</Typography>
          <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.85rem' }}>{formatShortDate(closingDate)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 2 }}>
          <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem' }}>Vence dia</Typography>
          <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.85rem' }}>{formatShortDate(dueDate)}</Typography>
        </Box>

        <Tooltip title="Adicionar">
          <IconButton
            onClick={(e) => setAddMenuAnchor(e.currentTarget)}
            sx={{ color: '#FFFFFF', bgcolor: 'var(--color-primary)', borderRadius: '50%', width: 34, height: 34, ml: 1.5, flexShrink: 0, '&:hover': { bgcolor: 'var(--color-primary-dark)' } }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={() => setAddMenuAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { mt: 1, minWidth: 210, borderRadius: '8px', bgcolor: "var(--color-surface-raised, #1b1c21)", border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)", p: 0.5 } }}>
          <MenuItem onClick={() => { setAddMenuAnchor(null); onAddExpense(currentDueDateISO); }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, px: 1.5, borderRadius: '12px', color: "var(--color-text-primary, #FFFFFF)", '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.04)" } }}>
            <CardIcon sx={{ color: 'var(--color-primary-text)', fontSize: '1.15rem' }} />
            <Typography sx={{ fontWeight: 500, fontSize: '0.88rem' }}>Despesa cartão</Typography>
          </MenuItem>
          <MenuItem onClick={() => { setAddMenuAnchor(null); onAddRefund(currentDueDateISO); }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, px: 1.5, borderRadius: '12px', color: "var(--color-text-primary, #FFFFFF)", '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.04)" } }}>
            <RefundIcon sx={{ color: "var(--color-income, #4EBE87)", fontSize: '1.15rem' }} />
            <Typography sx={{ fontWeight: 500, fontSize: '0.88rem' }}>Estorno</Typography>
          </MenuItem>
        </Menu>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          py: 1.25,
          borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)",
        }}
      >
        <IconButton size="small" onClick={goPrevMonth} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.85rem', minWidth: 90, textAlign: 'center' }}>
          {MONTHS_FULL[curMonth - 1].charAt(0).toUpperCase() + MONTHS_FULL[curMonth - 1].slice(1)}
        </Typography>
        <IconButton size="small" onClick={goNextMonth} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          overflowY: 'auto',
          flex: 1,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)", borderRadius: '4px' },
        }}
      >
        {sections.length === 0 && (
          <Typography sx={{ color: "var(--color-text-secondary, #6F768E)", textAlign: 'center', py: 4 }}>Nenhuma transação neste período.</Typography>
        )}
        {sections.map(({ dateKey, dayTxs, dayTotal, remainingBeforeThisDay }) => {
          const dayIsCredit = dayTotal < 0;
          return (
            <Box key={dateKey} sx={{ borderBottom: "1px solid var(--color-border)" }}>
              <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.75rem', fontWeight: 700, px: 2.5, pt: 2, pb: 1 }}>
                {formatDateHeader(dateKey)}
              </Typography>
              {dayTxs.map((tx) => {
                const isCredit = tx.value < 0;
                const category = categories.find((item) => item.id === tx.categoryId);
                return (
                  <Box
                    key={tx.id}
                    component="button"
                    type="button"
                    onClick={() => onSelectTransaction ? onSelectTransaction(tx) : setSelectedTransactionId(tx.id)}
                    sx={{
                      width: '100%',
                      border: 0,
                      background: 'transparent',
                      color: 'inherit',
                      font: 'inherit',
                      textAlign: 'left',
                    position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2.5,
                    py: 1.5,
                      cursor: 'pointer',
                    '&::before': { content: '""', position: 'absolute', left: 37, top: 0, bottom: 0, width: '1px', bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), .12)' },
                      '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                      <Avatar sx={{ width: 36, height: 36, flexShrink: 0, zIndex: 1, bgcolor: category?.color || 'var(--color-surface-raised, #2B2C34)', color: 'var(--color-text-primary, #FFFFFF)' }}>{getCategoryIcon(category?.icon, category?.name || 'Sem categoria')}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.9rem' }}><TransactionDescriptionText description={tx.description} /></Typography>
                        <Typography sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '0.85rem' }}>{card.name}</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ color: isCredit ? "var(--color-income, #4EBE87)" : "var(--color-expense, #E87575)", fontWeight: 500, fontSize: '1rem', ml: 1, flexShrink: 0 }}>
                      {isCredit ? '+' : '-'}{Math.abs(tx.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                );
              })}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, py: 0.6 }}>
                <Typography sx={{ color: dayIsCredit ? "var(--color-income, #4EBE87)" : "var(--color-expense, #E05A5A)", fontSize: '0.78rem' }}>Saídas</Typography>
                <Typography sx={{ color: dayIsCredit ? "var(--color-income, #4EBE87)" : "var(--color-expense, #E05A5A)", fontSize: '0.78rem', fontWeight: 600 }}>
                  {dayIsCredit ? '+' : '-'} {formatBRL(dayTotal)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, pb: 1.25 }}>
                <Typography sx={{ color: 'var(--color-primary-text)', fontSize: '0.78rem' }}>Fatura parcial</Typography>
                <Typography sx={{ color: 'var(--color-primary-text)', fontSize: '0.78rem', fontWeight: 600 }}>{formatBRL(remainingBeforeThisDay)}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Dialog>
    <TransactionDetailsDialog
      open={Boolean(selectedTransaction)}
      zIndex={1500}
      transaction={selectedTransaction ? { ...selectedTransaction, type: 'EXPENSE' as const } : null}
      installmentSummary={installmentSummary}
      card={card ? { name: card.name } : undefined}
      category={selectedParentCategory}
      subcategory={selectedCategory?.parentCategoryId ? selectedCategory : undefined}
      updating={false}
      onClose={() => setSelectedTransactionId(null)}
      onEdit={() => {
        if (!selectedTransaction || !onEditTransaction) return;
        const transactionToEdit = selectedTransaction;
        setSelectedTransactionId(null);
        onEditTransaction(transactionToEdit);
      }}
      onEditDescription={async () => undefined}
      onDelete={() => undefined}
      onToggleEffective={() => undefined}
      onAccount={() => undefined}
      onCategory={() => undefined}
    />
    </>
  );
};

export default CardStatementDialog;
