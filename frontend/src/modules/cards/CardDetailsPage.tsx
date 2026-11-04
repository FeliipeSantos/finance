import TransactionDescriptionText from '../../components/TransactionDescriptionText';
import { useDetailSearchParams } from '../../hooks/useDetailSearchParams';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AppBar, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, Menu, MenuItem, Paper, TextField, Toolbar, Tooltip, Typography } from '@mui/material';
import { Add, ArrowBack, CheckCircle, ChevronLeft, ChevronRight, CreditCard, Edit, MoreVert, ReceiptLong, Search, ShowChart, Undo, AccessTime } from '@mui/icons-material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import api from '../../config/api';
import BankLogo from '../../components/BankLogo';
import CardStatementDialog from '../../components/CardStatementDialog';
import TransactionsPage from '../transactions/TransactionsPage';
import { usePageScrollRestoration } from '../../hooks/usePageScrollRestoration';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { getInvoicePeriod, isInvoiceClosed, nextMonth, prevMonth } from '../../utils/cardInvoice';
import { categoryRanking, dailyStatement, invoiceItems, invoicePaid, totalValue } from './cardDetails';
import type { DetailCard, DetailCategory, DetailTransaction } from './cardDetails';

interface DetailAccount { id: string; name: string }
type View = 'statement' | 'invoices' | 'evolution';
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const monthName = (month: number) => new Date(2026, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
const shortDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de ', '/').toUpperCase();
const panel = { bgcolor: "var(--color-panel, #14151B)", backgroundImage: 'none', borderRadius: '26px', border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.035)", p: { xs: 2, md: 2.5 } };
const muted = "var(--color-text-secondary, #9699A5)";
const green = 'var(--color-income, #71C9A3)';
const red = 'var(--color-expense, #E87575)';
const columnScroll = {
  minWidth: 0,
  minHeight: 0,
  overflowY: { xs: 'visible', lg: 'auto' },
  overscrollBehaviorY: { lg: 'contain' },
  scrollbarGutter: { lg: 'stable' },
};

export default function CardDetailsPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useDetailSearchParams();
  const now = new Date();
  const monthParam = Number(params.get('month'));
  const yearParam = Number(params.get('year'));
  const month = monthParam >= 1 && monthParam <= 12 ? monthParam : now.getMonth() + 1;
  const year = yearParam >= 1900 && yearParam <= 9999 ? yearParam : now.getFullYear();
  const [card, setCard] = useState<DetailCard | null>(null);
  const [transactions, setTransactions] = useState<DetailTransaction[]>([]);
  const [categories, setCategories] = useState<DetailCategory[]>([]);
  const [accounts, setAccounts] = useState<DetailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('statement');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [statement, setStatement] = useState<{ month: number; year: number } | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [addMenu, setAddMenu] = useState<HTMLElement | null>(null);
  const [composer, setComposer] = useState<{ cardId: string; dueDate: string; refund: boolean; transactionId?: string } | null>(null);
  const [dateChoiceOpen, setDateChoiceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  usePageScrollRestoration(!loading && Boolean(card));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([api.get(`/cards/${cardId}`), api.get('/transactions'), api.get('/categories'), api.get('/accounts')])
      .then(([cardResponse, txResponse, catResponse, accResponse]) => {
        if (!active) return;
        setCard(cardResponse.data);
        setTransactions(txResponse.data.filter((tx: DetailTransaction) => tx.creditCardId === cardId));
        setCategories(catResponse.data);
        setAccounts(accResponse.data);
      }).catch(() => { if (active) setError('Não foi possível carregar os detalhes do cartão.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cardId]);

  const changeMonth = (period: { month: number; year: number }) => {
    setParams({ month: String(period.month), year: String(period.year) }, { replace: true });
  };
  const addExpense = (dueDate: string, refund = false) => {
    if (!card) return;
    setComposer({ cardId: card.id, dueDate, refund });
  };
  const refreshAfterExpense = async () => {
    try {
      const [cardResponse, txResponse, categoryResponse] = await Promise.all([api.get(`/cards/${cardId}`), api.get('/transactions'), api.get('/categories')]);
      setCard(cardResponse.data);
      setTransactions(txResponse.data.filter((tx: DetailTransaction) => tx.creditCardId === cardId));
      setCategories(categoryResponse.data);
    } catch {
      setError('Lançamento salvo. Não foi possível atualizar os detalhes; recarregue a página.');
    }
  };
  const showTransactionDetails = (tx: { id: string }) => navigate(`/transacoes?${new URLSearchParams({ month: String(month), year: String(year), tab: 'EXPENSE', details_tx: tx.id })}`);
  const items = invoiceItems(transactions, month, year);
  const paid = invoicePaid(items);
  const total = totalValue(items);
  const ranking = categoryRanking(items, categories);

  const updateStatus = async (useDueDate = false) => {
    if (savingRef.current || !items.length) return;
    savingRef.current = true;
    setSaving(true);
    const today = new Date();
    const effectiveDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const changing = items.filter((tx) => tx.effective === paid);
    try {
      await api.post('/transactions/effective-status', { transactionIds: changing.map((tx) => tx.id), effective: !paid, effectiveDate: paid ? null : effectiveDate, useDueDate });
      setTransactions((current) => current.map((tx) => changing.some((item) => item.id === tx.id)
        ? { ...tx, effective: !paid, effectiveDate: paid ? undefined : useDueDate ? tx.dueDate || tx.date : effectiveDate } : tx));
      setDateChoiceOpen(false);
      setError('');
    } catch {
      setError('Não foi possível atualizar o pagamento da fatura. Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  if (!card) return <Box sx={{ p: 3 }}><Button onClick={() => navigate(-1)} startIcon={<ArrowBack />}>Voltar</Button><Alert severity="error">{error || 'Cartão não encontrado.'}</Alert></Box>;

  const color = card.color || '#9272C8';
  const { closingDate, dueDate } = getInvoicePeriod(card, month, year);
  const dueDateISO = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
  const openAmount = Math.max(0, totalValue(transactions.filter((tx) => !tx.effective)) + Number(card.initialInvoice || 0));
  const limit = Number(card.limitTotal);
  const percentage = limit > 0 ? openAmount / limit * 100 : 0;
  const refunds = Math.abs(totalValue(items.filter((tx) => Number(tx.value) < 0)));
  const account = accounts.find((item) => item.id === card.accountId);
  const filteredItems = items.filter((tx) => tx.description.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const days = dailyStatement(filteredItems);
  const periods = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, month - 6 + index, 1);
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    const txs = invoiceItems(transactions, m, y);
    return { month: m, year: y, label: `${monthName(m).slice(0, 3)}/${String(y).slice(2)}`, total: totalValue(txs), paid: invoicePaid(txs), count: txs.length };
  });
  const shortcuts = [
    { id: 'statement' as const, label: 'Extrato', icon: <ReceiptLong /> },
    { id: 'invoices' as const, label: 'Faturas', icon: <CreditCard /> },
    { id: 'evolution' as const, label: 'Evolução', icon: <ShowChart /> },
  ];

  const rankingContent = (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mt: 2.5 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
        {ranking.slice(0, 6).map(({ category, percentage: share }) => <Box key={category.id}>
          <Typography sx={{ color: muted, fontSize: '0.75rem', mb: 0.5 }}>{category.name}</Typography>
          <Box sx={{ bgcolor: 'var(--color-surface-raised, #24252D)', borderRadius: '12px', overflow: 'hidden' }}>
            <Box sx={{ width: `${share}%`, minWidth: 42, bgcolor: category.color || color, borderRadius: "0 24px 24px 0", py: 1.2, pr: 1, textAlign: 'right', color: '#111217', fontWeight: 700, fontSize: '0.75rem' }}>{share.toFixed(1).replace('.', ',')}%</Box>
          </Box>
        </Box>)}
      </Box>
      <Box sx={{ bgcolor: 'var(--color-surface-raised, #1E1F27)', borderRadius: '8px', p: 2 }}>
        {ranking.map(({ category, total: amount }) => <Box key={category.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:not(:last-child)': { borderBottom: '2px dotted var(--color-surface-raised, #31323B)' } }}>
          <Avatar sx={{ bgcolor: category.color || color, color: '#16171C', width: 40, height: 40 }}>{getCategoryIcon(category.icon, category.name)}</Avatar>
          <Box><Typography fontSize="0.9rem">{category.name}</Typography><Typography color={muted} fontSize="0.8rem">{money(amount)}</Typography></Box>
        </Box>)}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: { xs: '100dvh', lg: 0 }, height: { lg: '100dvh' }, overflow: { lg: 'hidden' }, display: 'flex', flexDirection: 'column', bgcolor: 'var(--color-page, #0D0E13)', color: 'text.primary', pb: 3 }}>
      <AppBar position="sticky" elevation={0} sx={{ flexShrink: 0, bgcolor: 'var(--color-page, #0D0E13)', color: 'text.primary', backgroundImage: 'none' }}>
        <Toolbar sx={{ gap: 1, minHeight: 68, flexWrap: { xs: 'wrap', sm: 'nowrap' }, py: { xs: 1, sm: 0 }, px: { xs: 1, md: 2 } }}>
          <IconButton aria-label="Voltar ao resumo" onClick={() => navigate(-1)} sx={{ color: "var(--color-text-primary, #FFFFFF)" }}><ArrowBack /></IconButton>
          <Typography sx={{ flex: 1, fontWeight: 700, fontSize: { xs: '0.9rem', md: '1.1rem' } }}>Detalhes do cartão</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: "var(--color-surface-raised, #212229)", borderRadius: '12px', order: { xs: 5, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
            <IconButton disabled={saving} aria-label="Mês anterior" onClick={() => changeMonth(prevMonth(month, year))}><ChevronLeft /></IconButton>
            <Typography sx={{ textTransform: 'capitalize', minWidth: { xs: 70, md: 112 }, textAlign: 'center', fontSize: '0.85rem' }}>{monthName(month)} <Box component="span" sx={{ color: muted }}>{year}</Box></Typography>
            <IconButton disabled={saving} aria-label="Próximo mês" onClick={() => changeMonth(nextMonth(month, year))}><ChevronRight /></IconButton>
          </Box>
          <Tooltip title="Adicionar"><IconButton aria-label="Adicionar lançamento no cartão" aria-haspopup="menu" aria-expanded={Boolean(addMenu)} aria-controls={addMenu ? 'card-add-menu' : undefined} onClick={(event) => setAddMenu(event.currentTarget)} sx={{ bgcolor: color, color: '#FFFFFF', '&:hover': { bgcolor: color, opacity: 0.8 } }}><Add /></IconButton></Tooltip>
          <Tooltip title="Editar cartão"><IconButton aria-label="Editar cartão" onClick={() => navigate(`/cartoes?edit_card=${card.id}`)} sx={{ bgcolor: "var(--color-surface-raised, #212229)" }}><Edit /></IconButton></Tooltip>
          <IconButton aria-label="Mais ações do cartão" onClick={(event) => setMenu(event.currentTarget)} sx={{ bgcolor: "var(--color-surface-raised, #212229)" }}><MoreVert /></IconButton>
        </Toolbar>
      </AppBar>
      {composer && <TransactionsPage composer={composer} onComposerClose={() => setComposer(null)} onComposerSaved={refreshAfterExpense} />}
      <Menu id="card-add-menu" anchorEl={addMenu} open={Boolean(addMenu)} onClose={() => setAddMenu(null)}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }} transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        PaperProps={{ sx: { mt: 1, minWidth: 280, borderRadius: '12px', bgcolor: 'var(--color-panel, #15161B)', backgroundImage: 'none', p: 0.75 } }}>
        {[{ label: 'Estorno', refund: true, icon: <Undo fontSize="small" /> }, { label: 'Despesa cartão', refund: false, icon: <CreditCard fontSize="small" /> }].map((option) => (
          <MenuItem key={option.label} onClick={() => { setAddMenu(null); addExpense(dueDateISO, option.refund); }} sx={{ gap: 2, px: 1.5, py: 1, borderRadius: '12px' }}>
            <Avatar sx={{ width: 44, height: 44, bgcolor: 'var(--color-surface-raised, #24252B)', color: '#53A1F5' }}>{option.icon}</Avatar>
            <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500 }}>{option.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { setMenu(null); setStatement({ month, year }); }}>Ver fatura</MenuItem>
        <MenuItem onClick={() => { setMenu(null); addExpense(dueDateISO, true); }}>Lançar estorno</MenuItem>
      </Menu>

      <Box sx={{ px: { xs: 1.5, md: 2 }, maxWidth: 2000, width: '100%', mx: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: { xs: 'start', lg: 'stretch' }, flex: 1, minHeight: 0, gap: 2 }}>
          <Box role="region" data-scroll-region="card-information" aria-label="Informações do cartão e categorias" tabIndex={0} sx={{ ...columnScroll, display: 'flex', flexDirection: 'column', gap: 2, '& > *': { flexShrink: 0 } }}>
            <Paper sx={panel}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <BankLogo icon={card.bank} customIconUrl={card.customIconUrl} name={card.name} size={44} />
                <Box><Typography fontWeight={700}>{card.name}</Typography><Typography sx={{ color: muted, fontSize: '0.8rem' }}>{card.brand === 'MASTERCARD' ? 'MasterCard' : card.brand}</Typography></Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                {[['Limite', money(limit)], ['Em aberto', money(openAmount)], ['Limite disp.', money(limit - openAmount)]].map(([label, value], index) => <Box key={label} sx={{ textAlign: index === 2 ? 'right' : index === 1 ? 'center' : 'left' }}><Typography fontSize="0.8rem" color={muted}>{label}</Typography><Typography fontSize="0.9rem" fontWeight={600}>{value}</Typography></Box>)}
              </Box>
              <Box sx={{ position: 'relative', my: 2.5 }}>
                <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, percentage))} sx={{ height: 20, borderRadius: 10, bgcolor: 'var(--color-surface-raised, #272830)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 10 } }} />
                <Typography sx={{ position: 'absolute', right: 10, top: 1, fontSize: '0.75rem', fontWeight: 700 }}>{Math.round(percentage)}%</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 2, borderTop: "3px dotted var(--color-surface-raised, #2B2C34)", borderBottom: "3px dotted var(--color-surface-raised, #2B2C34)" }}>
                {[['Conta', account?.name || 'Sem conta vinculada'], ['Fechamento', shortDate(closingDate)], ['Vencimento', shortDate(dueDate)]].map(([label, value], index) => <Box key={label} sx={{ textAlign: index === 2 ? 'right' : index === 1 ? 'center' : 'left' }}><Typography color={muted} fontSize="0.8rem">{label}</Typography><Typography fontSize="0.9rem">{value}</Typography></Box>)}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2 }}>
                <Box><Typography fontWeight={600}>{paid ? 'Fatura paga' : isInvoiceClosed(closingDate) ? 'Fatura fechada' : 'Fatura aberta'}</Typography><Typography fontSize="0.8rem" color={muted}>Estornos</Typography></Box>
                <Box sx={{ textAlign: 'right' }}><Button onClick={() => setStatement({ month, year })} sx={{ color: paid ? green : "var(--color-text-primary, #FFFFFF)", fontSize: '1.1rem', p: 0, gap: 0.7 }}>{paid ? <CheckCircle fontSize="small" /> : <AccessTime fontSize="small" />}{money(total)}</Button><Typography color={green} fontSize="0.8rem">{money(refunds)}</Typography></Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Box sx={{ px: 1.4, py: 0.3, borderRadius: 6, bgcolor: paid ? '#71C9A3' : 'var(--color-surface-raised, #2E2F38)', color: paid ? '#17372A' : muted, fontSize: '0.75rem' }}>{paid ? '✓ Paga' : items.length ? 'Pendente' : 'Sem lançamentos'}</Box>
                <Button disabled={saving || !items.length} startIcon={paid ? <Undo /> : <CheckCircle />} onClick={() => { if (!paid && (month !== now.getMonth() + 1 || year !== now.getFullYear())) setDateChoiceOpen(true); else updateStatus(); }} sx={{ color: '#6FABFC', textTransform: 'none' }}>{saving ? 'Atualizando…' : paid ? 'Reabrir fatura' : 'Efetivar fatura'}</Button>
              </Box>
            </Paper>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {shortcuts.map((item) => <Button key={item.id} onClick={() => { setView(item.id); setSearch(''); }} aria-pressed={view === item.id} sx={{ bgcolor: view === item.id ? `${color}25` : "var(--color-surface-raised, #202129)", border: `1px solid ${view === item.id ? color : 'transparent'}`, borderRadius: '12px', minWidth: 0, p: { xs: 1, sm: 2 }, height: 95, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexDirection: 'column', textTransform: 'none', color, '&:hover': { bgcolor: `${color}25` } }}>{item.icon}<Typography fontSize={{ xs: '0.65rem', sm: '0.8rem' }} color={muted}>{item.label}</Typography></Button>)}
            </Box>
            <Paper sx={panel}><Typography fontWeight={600}>Ranking categorias</Typography><Typography color={muted} fontSize="0.8rem" sx={{ textTransform: 'capitalize' }}>Fatura {monthName(month)}/{year}</Typography>{ranking.length ? rankingContent : <Typography color={muted} sx={{ py: 5, textAlign: 'center' }}>Nenhuma despesa nesta fatura.</Typography>}</Paper>
          </Box>

          <Paper role="region" data-scroll-region="card-statement" aria-label="Extrato e faturas do cartão" tabIndex={0} sx={{ ...panel, ...columnScroll, minHeight: { xs: 570, lg: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Box><Typography variant="h6" fontWeight={700}>{shortcuts.find((item) => item.id === view)?.label}</Typography><Typography color={muted} fontSize="0.8rem">{money(total)}</Typography></Box>
              {(view === 'statement') && <IconButton aria-label="Pesquisar no extrato" onClick={() => { setShowSearch(!showSearch); setSearch(''); }}><Search /></IconButton>}
            </Box>
            {showSearch && (view === 'statement') && <TextField fullWidth size="small" label="Buscar lançamento" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2 }} />}
            {(view === 'statement') && <>
              {!days.length && <Typography color={muted} sx={{ textAlign: 'center', py: 7 }}>Nenhum lançamento encontrado.</Typography>}
              {days.map((day) => <Box key={day.date}>
                <Typography sx={{ p: 1.5, bgcolor: 'var(--color-surface-raised, #22232B)', fontWeight: 700, fontSize: '0.85rem' }}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR')} • {new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' })}</Typography>
                <Box sx={{ ml: 2.5, borderLeft: '2px solid var(--color-surface-raised, #262730)' }}>
                  {day.items.map((tx) => {
                    const category = categories.find((item) => item.id === tx.categoryId);
                    return <Button key={tx.id} onClick={() => showTransactionDetails(tx)} sx={{ display: 'flex', width: '100%', textTransform: 'none', justifyContent: 'flex-start', py: 2.2, px: 0, gap: 2, color: "var(--color-text-primary, #FFFFFF)", '&:hover': { bgcolor: '#202129' } }}>
                      <Avatar sx={{ ml: '-19px', bgcolor: category?.color || '#69BFF6', color: "var(--color-surface-raised, #202129)", width: 36, height: 36 }}>{getCategoryIcon(category?.icon, category?.name || '')}</Avatar>
                      <Box sx={{ flex: 1, textAlign: 'left' }}><Typography fontSize="0.9rem"><TransactionDescriptionText description={tx.description} /></Typography><Typography color={muted} fontSize="0.75rem">{category?.name || card.name}</Typography></Box>
                      <Typography sx={{ pr: 1, color: Number(tx.value) < 0 ? green : red, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{Number(tx.value) > 0 ? '−' : '+'}{money(Math.abs(Number(tx.value)))}</Typography>
                    </Button>;
                  })}
                  {[['Saídas', day.subtotal, red], ['Fatura', day.balance, '#9CBDF8']].map(([label, amount, dotColor]) => <Box key={String(label)} sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 2 }}><Box sx={{ ml: '-7px', width: 12, height: 12, borderRadius: "50%", bgcolor: dotColor, flexShrink: 0 }} /><Typography flex={1} fontSize="0.85rem">{label}</Typography><Typography sx={{ pr: 1, color: label === 'Saídas' ? red : "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem' }}>{money(label === 'Saídas' ? -Number(amount) : Number(amount))}</Typography></Box>)}
                </Box>
              </Box>)}
            </>}
            {view === 'invoices' && periods.map((period) => <Button key={`${period.year}-${period.month}`} disabled={saving} onClick={() => { changeMonth(period); setView('statement'); setSearch(''); setShowSearch(false); }} sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', textTransform: 'capitalize', py: 2, borderBottom: "1px solid var(--color-surface-raised, #2B2C34)", color: "var(--color-text-primary, #FFFFFF)" }}><Box sx={{ textAlign: 'left' }}>{monthName(period.month)} {period.year}<Typography color={muted} fontSize="0.75rem">{period.paid ? 'Paga' : period.count ? 'Pendente' : 'Sem lançamentos'}</Typography></Box><Typography color={period.paid ? green : 'text.primary'}>{money(period.total)} ›</Typography></Button>)}
            {view === 'evolution' && <><Typography color={muted} fontSize="0.85rem" sx={{ mb: 3 }}>Valor das faturas por mês</Typography><ResponsiveContainer width="100%" height={330}><AreaChart data={periods}><CartesianGrid stroke="var(--color-surface-raised, #2B2C34)" vertical={false} /><XAxis dataKey="label" stroke={muted} fontSize={11} /><YAxis stroke={muted} fontSize={11} width={58} /><ChartTooltip formatter={(value) => money(Number(value))} contentStyle={{ backgroundColor: "var(--color-surface-raised, #202129)", border: '1px solid var(--color-surface-raised, #33343E)', borderRadius: 12 }} /><Area type="monotone" dataKey="total" name="Fatura" stroke={color} fill={color} fillOpacity={0.18} /></AreaChart></ResponsiveContainer></>}
          </Paper>
        </Box>
      </Box>
      <CardStatementDialog key={statement ? `${card.id}-${statement.month}-${statement.year}` : 'closed'} open={Boolean(statement)} onClose={() => setStatement(null)} card={card} transactions={transactions} categories={categories} month={statement?.month || month} year={statement?.year || year} onEditTransaction={(tx) => setComposer({ cardId: card.id, dueDate: tx.dueDate || tx.date, refund: false, transactionId: tx.id })} onAddExpense={(date) => addExpense(date)} onAddRefund={(date) => addExpense(date, true)} />
      <Dialog open={dateChoiceOpen} onClose={() => { if (!saving) setDateChoiceOpen(false); }} maxWidth="xs" fullWidth>
        <DialogTitle>Contabilizar no mês da efetivação?</DialogTitle><DialogContent>Esta fatura é de outro mês. Escolha se o pagamento será contabilizado no vencimento ou hoje.</DialogContent>
        <DialogActions><Button disabled={saving} onClick={() => updateStatus(true)}>No vencimento</Button><Button disabled={saving} onClick={() => updateStatus()} variant="contained">Em {monthName(now.getMonth() + 1)}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
