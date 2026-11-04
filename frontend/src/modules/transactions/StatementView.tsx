import { Box, Paper, Typography } from '@mui/material';
import { AccountBalanceWallet, SwapHoriz, TrendingDown, TrendingUp } from '@mui/icons-material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import TransactionDescriptionText from '../../components/TransactionDescriptionText';

interface Account { id: string; name: string; balanceCurrent: number }
interface Card { id: string; name: string }
interface Transaction {
  id: string;
  accountId?: string;
  destinationAccountId?: string;
  creditCardId?: string;
  value: number;
  date: string;
  dueDate?: string;
  effectiveDate?: string;
  createdAt?: string;
  type: 'EXPENSE' | 'REVENUE' | 'TRANSFER';
  description: string;
  effective: boolean;
}
interface Props {
  transactions: Transaction[];
  allTransactions: Transaction[];
  accounts: Account[];
  cards: Card[];
  accountFilterId: string;
  month: number;
  year: number;
  onOpenTransaction: (transaction: Transaction) => void;
}

const muted = 'var(--color-text-secondary, #979CAE)';
const monthStart = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`;
const activeDate = (tx: Transaction) => tx.effective && tx.effectiveDate ? tx.effectiveDate : tx.dueDate || tx.date;
const money = (value: number) => Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateHeading = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date);
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  return `${day} • ${weekday}`;
};
const dayLabel = (value: string) => value.slice(8, 10);

export default function StatementView({ transactions, allTransactions, accounts, cards, accountFilterId, month, year, onOpenTransaction }: Props) {
  const start = monthStart(year, month);
  const account = accounts.find((item) => item.id === accountFilterId);
  const balanceMovement = (tx: Transaction) => {
    const value = Number(tx.value || 0);
    if (tx.type === 'REVENUE') return !accountFilterId || tx.accountId === accountFilterId ? value : 0;
    if (tx.type === 'EXPENSE') return !tx.creditCardId && (!accountFilterId || tx.accountId === accountFilterId) ? -value : 0;
    if (!accountFilterId) return 0;
    if (tx.accountId === accountFilterId) return -value;
    if (tx.destinationAccountId === accountFilterId) return value;
    return 0;
  };
  const currentBalance = account ? Number(account.balanceCurrent) : accounts.reduce((sum, item) => sum + Number(item.balanceCurrent), 0);
  const bookedSinceStart = allTransactions.reduce((sum, tx) => {
    return tx.effective && activeDate(tx) >= start ? sum + balanceMovement(tx) : sum;
  }, 0);
  let runningBalance = currentBalance - bookedSinceStart;

  const sorted = [...transactions].sort((a, b) => activeDate(a).localeCompare(activeDate(b)) || (a.createdAt || '').localeCompare(b.createdAt || ''));
  const days = new Map<string, Transaction[]>();
  sorted.forEach((tx) => {
    const key = activeDate(tx).slice(0, 10);
    const group = days.get(key) || [];
    group.push(tx);
    days.set(key, group);
  });

  const chartByDay = new Map<string, { day: string; balanceDelta: number; entries: number; exits: number }>();
  sorted.forEach((tx) => {
    const key = activeDate(tx).slice(0, 10);
    const point = chartByDay.get(key) || { day: dayLabel(key), balanceDelta: 0, entries: 0, exits: 0 };
    point.balanceDelta += balanceMovement(tx);
    if (tx.type === 'REVENUE') point.entries += Math.abs(Number(tx.value));
    if (tx.type === 'EXPENSE') point.exits += Math.abs(Number(tx.value));
    chartByDay.set(key, point);
  });
  let chartBalance = currentBalance - bookedSinceStart;
  const chartData = [...chartByDay.values()].map((point) => {
    chartBalance += point.balanceDelta;
    return { ...point, balance: chartBalance };
  });

  const chartCard = (title: string, dataKey: 'balance' | 'entries' | 'exits', color: string) => <Paper component="section" sx={{ p: 2, minWidth: 0, borderRadius: '16px' }}>
    <Typography component="h3" sx={{ color: muted, fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>{title}</Typography>
    <Box sx={{ height: 240, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
          <defs><linearGradient id={`statement-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.34} /><stop offset="95%" stopColor={color} stopOpacity={0.03} /></linearGradient></defs>
          <CartesianGrid stroke="rgba(var(--color-overlay-rgb, 255, 255, 255), 0.07)" vertical />
          <XAxis dataKey="day" tick={{ fill: muted, fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
          <YAxis tick={{ fill: muted, fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} />
          <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} labelFormatter={(label) => `Dia ${label}`} contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-primary)' }} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fill={`url(#statement-${dataKey})`} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  </Paper>;

  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
    <Paper component="section" aria-label="Movimentações do extrato" sx={{ overflow: 'hidden', borderRadius: '12px' }}>
      {days.size === 0 ? <Typography sx={{ color: muted, textAlign: 'center', py: 6 }}>Nenhuma transação encontrada neste período.</Typography> : [...days.entries()].map(([day, entries]) => {
        const pendingDay = entries.some((tx) => !tx.effective);
        entries.forEach((tx) => { runningBalance += balanceMovement(tx); });
        return <Box key={day}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.045)' }}>
            <Typography sx={{ color: 'primary.light', fontWeight: 700, textTransform: 'capitalize' }}>{dateHeading(day)}</Typography>
          </Box>
          <Box sx={{ position: 'relative', px: 2, '&:before': { content: '""', position: 'absolute', left: 35, top: 18, bottom: 18, width: '1px', bgcolor: 'var(--color-border)' } }}>
            {entries.map((tx) => {
              const { color, iconBg } = tx.type === 'REVENUE'
                ? { color: 'var(--color-income, #35C3A3)', iconBg: 'color-mix(in srgb, var(--color-income, #35C3A3) 16%, var(--color-panel, #1E1F27))' }
                : tx.type === 'EXPENSE'
                  ? { color: 'var(--color-expense, #E66B78)', iconBg: 'color-mix(in srgb, var(--color-expense, #E66B78) 16%, var(--color-panel, #1E1F27))' }
                  : { color: 'var(--color-primary-text, #8A98F1)', iconBg: 'color-mix(in srgb, var(--color-primary-text, #8A98F1) 16%, var(--color-panel, #1E1F27))' };
              const accountName = tx.type === 'TRANSFER'
                ? `${accounts.find((item) => item.id === tx.accountId)?.name || 'Conta'} → ${accounts.find((item) => item.id === tx.destinationAccountId)?.name || 'Conta'}`
                : accounts.find((item) => item.id === tx.accountId)?.name || cards.find((item) => item.id === tx.creditCardId)?.name || 'Sem conta';
              const Icon = tx.type === 'REVENUE' ? TrendingUp : tx.type === 'EXPENSE' ? TrendingDown : tx.type === 'TRANSFER' ? SwapHoriz : AccountBalanceWallet;
              const signed = tx.type === 'REVENUE' ? '+' : tx.type === 'EXPENSE' ? '-' : '';
              return <Box key={tx.id} component="button" onClick={() => onOpenTransaction(tx)} sx={{ appearance: 'none', position: 'relative', zIndex: 1, width: '100%', minWidth: 0, m: 0, px: 0, display: 'flex', alignItems: 'center', gap: 1.5, py: 1.75, border: 0, bgcolor: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.025)' } }}>
                <Box sx={{ position: 'relative', zIndex: 2, width: 38, height: 38, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: iconBg, color }}><Icon sx={{ fontSize: 20 }} /></Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}><TransactionDescriptionText description={tx.description} /></Typography>
                  <Typography noWrap sx={{ color: muted, fontSize: '0.82rem' }}>{accountName}</Typography>
                </Box>
                <Typography sx={{ flexShrink: 0, color, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{signed}{money(Number(tx.value))}</Typography>
              </Box>;
            })}
            <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.5, py: 1.75 }}>
              <Box sx={{ position: 'relative', zIndex: 2, width: 38, height: 38, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'var(--color-panel)', color: 'primary.light' }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'currentColor' }} /></Box>
              <Typography sx={{ flex: 1, fontWeight: 600 }}>Saldo {pendingDay ? 'previsto' : ''}</Typography>
              <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(runningBalance)}</Typography>
            </Box>
          </Box>
        </Box>;
      })}
    </Paper>
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      {chartCard('Saldo', 'balance', 'var(--color-primary-text, #8A98F1)')}
      {chartCard('Entradas', 'entries', 'var(--color-income, #35C3A3)')}
      {chartCard('Saídas', 'exits', 'var(--color-expense, #E66B78)')}
    </Box>
  </Box>;
}
