import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, Dialog, DialogContent, IconButton, LinearProgress, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { Check, CheckCircleOutline, Close, CreditCard, DeleteOutline, Edit, Schedule } from '@mui/icons-material';
import BankLogo from './BankLogo';
import { editableTransactionDescription, isFixedTransaction } from '../utils/transactionDescription';
import TransactionDescriptionText from './TransactionDescriptionText';

interface Transaction {
  id: string;
  type: 'EXPENSE' | 'REVENUE' | 'TRANSFER';
  description: string;
  value: number;
  date: string;
  dueDate?: string;
  effectiveDate?: string;
  createdAt?: string;
  updatedAt?: string;
  effective: boolean;
  notes?: string;
  tags?: string;
}

interface Category { id: string; name: string; color?: string }
interface Account { id: string; name: string; icon?: string | null; institution?: string; customIconUrl?: string | null }
interface InstallmentSummary { total: number; effective: number; pending: number; progress: number }
interface Props {
  open: boolean;
  readOnly?: boolean;
  zIndex?: number;
  transaction: Transaction | null;
  installmentSummary?: InstallmentSummary | null;
  account?: Account;
  destinationAccount?: Account;
  card?: { name: string };
  category?: Category;
  subcategory?: Category;
  updating: boolean;
  onEditDescription: (description: string) => Promise<void>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEffective: () => void;
  onAccount: (id: string) => void;
  onCategory: (id: string) => void;
}

const muted = 'var(--color-text-secondary, #9297A5)';
const primary = 'var(--color-text-primary, #FFFFFF)';
const green = 'var(--color-income, #4EBE87)';
const red = 'var(--color-expense, #E05A5A)';
const dateLabel = (value?: string) => {
  if (!value) return 'Não informada';
  const parts = value.slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : 'Não informada';
};
const timestampLabel = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Box component="section" sx={{ mt: 2 }}>
    <Typography component="h3" sx={{ color: muted, fontSize: '0.82rem', mb: 0.75, px: 2, fontWeight: 500 }}>{title}</Typography>
    <Box sx={{ bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.045)', borderRadius: "12px", px: 2, py: 1.5 }}>{children}</Box>
  </Box>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, minHeight: 30, py: 0.25 }}>
    <Typography sx={{ color: muted, fontSize: '0.82rem', flex: 1 }}>{label}</Typography>
    <Box sx={{ color: primary, fontSize: '0.88rem', textAlign: 'right', maxWidth: '60%', overflowWrap: 'anywhere' }}>{children}</Box>
  </Box>;
}

export default function TransactionDetailsDialog({ open, readOnly = false, zIndex, transaction, installmentSummary, account, destinationAccount, card, category, subcategory, updating, onClose, onEdit, onEditDescription, onDelete, onToggleEffective, onAccount, onCategory }: Props) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);

  useEffect(() => {
    setEditingDescription(false);
    setDescriptionDraft(transaction ? editableTransactionDescription(transaction.description) : '');
    setDescriptionError('');
  }, [transaction?.id, transaction?.description]);

  if (!transaction) return null;
  const isTransfer = transaction.type === 'TRANSFER';
  const label = { EXPENSE: 'Despesa', REVENUE: 'Receita', TRANSFER: 'Transferência' }[transaction.type];
  const valueColor = isTransfer ? 'var(--color-warning, #F4A261)' : transaction.type === 'REVENUE' || Number(transaction.value) < 0 ? green : red;
  const installment = transaction.description.match(/\s+(\d+)\/(\d+)$/);
  const recurrence = installment ? `Parcela ${installment[1]} de ${installment[2]}` : isFixedTransaction(transaction.description) ? 'Fixa mensal' : 'Nenhuma';
  const created = transaction.createdAt ? new Date(transaction.createdAt) : null;
  const time = created && !Number.isNaN(created.getTime()) ? created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const updated = timestampLabel(transaction.updatedAt);
  const formatInstallmentAmount = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const saveDescription = async () => {
    const description = descriptionDraft.trim();
    if (!description) {
      setDescriptionError('Informe uma descrição.');
      return;
    }
    setSavingDescription(true);
    setDescriptionError('');
    try {
      await onEditDescription(description);
      setEditingDescription(false);
    } catch (error) {
      setDescriptionError(error instanceof Error ? error.message : 'Não foi possível atualizar a descrição.');
    } finally {
      setSavingDescription(false);
    }
  };
  const categoryChip = (item: Category) => readOnly
    ? <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: '8px', bgcolor: `${item.color || '#7E8494'}35` }}>{item.name}</Box>
    : <Button size="small" onClick={() => onCategory(item.id)} sx={{ minWidth: 0, px: 1.4, py: 0.2, borderRadius: "8px", textTransform: 'none', fontSize: '0.8rem', color: primary, bgcolor: `${item.color || '#7E8494'}35`, '&:hover': { bgcolor: `${item.color || '#7E8494'}55`, transform: 'none' } }}>{item.name}<Box component="span" sx={{ ml: 1 }}>›</Box></Button>;
  const accountChip = (item?: Account) => item ? (readOnly
    ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><BankLogo name={item.name} icon={item.icon || item.institution} customIconUrl={item.customIconUrl} size={22} />{item.name}</Box>
    : <Button onClick={() => onAccount(item.id)} sx={{ minWidth: 0, py: 0.25, px: 1, gap: 0.75, borderRadius: "8px", bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.07)', color: primary, textTransform: 'none', lineHeight: 1.4 }}><BankLogo name={item.name} icon={item.icon || item.institution} customIconUrl={item.customIconUrl} size={22} />{item.name}<span>›</span></Button>) : 'Não vinculada';

  return <Dialog open={open} onClose={updating ? undefined : onClose} aria-labelledby="transaction-details-title" maxWidth="sm" fullWidth sx={zIndex ? { zIndex } : readOnly ? { zIndex: 1500 } : undefined} PaperProps={{ sx: {
    bgcolor: 'var(--color-panel, #111217)', backgroundImage: 'none', color: primary, borderRadius: '28px',
    border: '1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.06)',
    m: { xs: 1, sm: 3 }, width: { xs: 'calc(100% - 16px)', sm: '100%' }, maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 48px)' },
  } }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, px: 2, py: 1.75, flexShrink: 0 }}>
      <IconButton aria-label="Fechar detalhes" onClick={onClose} disabled={updating} sx={{ color: primary }}><Close fontSize="small" /></IconButton>
      <Typography id="transaction-details-title" component="h2" sx={{ flex: 1, fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 700 }}>Detalhes {label}</Typography>
      {!readOnly && <Tooltip title={`Editar ${label.toLowerCase()}`}><span><IconButton aria-label={`Editar ${label.toLowerCase()}`} onClick={onEdit} disabled={updating} sx={{ bgcolor: 'primary.main', color: '#FFF', width: 36, height: 36, '&:hover': { bgcolor: 'primary.dark' } }}><Edit fontSize="small" /></IconButton></span></Tooltip>}
      {!readOnly && <Tooltip title={`Excluir ${label.toLowerCase()}`}><span><IconButton aria-label={`Excluir ${label.toLowerCase()}`} onClick={onDelete} disabled={updating} sx={{ color: primary }}><DeleteOutline fontSize="small" /></IconButton></span></Tooltip>}
    </Box>
    <DialogContent sx={{ px: { xs: 1.5, sm: 2.5 }, pt: '8px !important', pb: 3 }}>
      <Box sx={{ borderRadius: '28px', bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.045)', p: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          {editingDescription ? <Box sx={{ flex: 1, minWidth: 0 }}>
            <TextField autoFocus fullWidth size="small" label="Descrição" value={descriptionDraft} disabled={savingDescription || updating}
              onChange={(event) => { setDescriptionDraft(event.target.value); setDescriptionError(''); }} inputProps={{ maxLength: 255 }} error={Boolean(descriptionError)} helperText={descriptionError || undefined} />
          </Box> : <Typography sx={{ flex: 1, minWidth: 0, fontSize: '1.05rem', overflowWrap: 'anywhere' }}><TransactionDescriptionText description={transaction.description} /></Typography>}
          {editingDescription ? <Box sx={{ display: 'flex', flexShrink: 0, mt: 0.25 }}>
            <Tooltip title="Salvar descrição"><span><IconButton aria-label="Salvar descrição" onClick={() => void saveDescription()} disabled={savingDescription || updating || !descriptionDraft.trim()} size="small" sx={{ color: green }}><Check fontSize="small" /></IconButton></span></Tooltip>
            <Tooltip title="Cancelar edição"><span><IconButton aria-label="Cancelar edição da descrição" onClick={() => { setEditingDescription(false); setDescriptionDraft(editableTransactionDescription(transaction.description)); setDescriptionError(''); }} disabled={savingDescription} size="small" sx={{ color: muted }}><Close fontSize="small" /></IconButton></span></Tooltip>
          </Box> : !readOnly && <Tooltip title="Editar descrição"><span><IconButton aria-label="Editar descrição" onClick={() => { setDescriptionDraft(editableTransactionDescription(transaction.description)); setEditingDescription(true); setDescriptionError(''); }} disabled={updating} size="small" sx={{ flexShrink: 0, color: 'primary.main', bgcolor: 'rgba(var(--color-primary-rgb, 57, 75, 191), 0.12)', '&:hover': { bgcolor: 'rgba(var(--color-primary-rgb, 57, 75, 191), 0.2)' } }}><Edit fontSize="small" /></IconButton></span></Tooltip>}
        </Box>
        <Typography sx={{ color: valueColor, textAlign: 'right', fontSize: '1.5rem', mt: 2, fontWeight: 600 }}>{Number(transaction.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Typography>
      </Box>
      <Section title="Detalhes">
        <Row label={card ? 'Situação fatura' : 'Situação'}><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: transaction.effective ? green : muted }}>{transaction.effective ? <Check fontSize="small" /> : <Schedule fontSize="small" />}{transaction.effective ? 'Efetivada' : 'Pendente'}</Box></Row>
        {!isTransfer && <Row label="Recorrência">{recurrence}</Row>}
        {card && <Row label="Cartão de Crédito"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CreditCard sx={{ color: 'primary.main', fontSize: 20 }} />{card.name}</Box></Row>}
        {!(readOnly && card) && <Row label={isTransfer ? 'Conta de origem' : 'Conta'}>{accountChip(account)}</Row>}
        {isTransfer && <Row label="Conta de destino">{accountChip(destinationAccount)}</Row>}
      </Section>
      {installmentSummary && <Section title="Parcelamento">
        <Row label="Valor total das parcelas">{formatInstallmentAmount(installmentSummary.total)}</Row>
        <Row label="Efetivado / pendente">{formatInstallmentAmount(installmentSummary.effective)} / {formatInstallmentAmount(installmentSummary.pending)}</Row>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <LinearProgress variant="determinate" value={installmentSummary.progress} aria-label="Progresso das parcelas efetivadas"
            sx={{ flex: 1, height: 12, borderRadius: 999, bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), 0.1)', '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: green } }} />
          <Typography sx={{ minWidth: 30, textAlign: 'right', color: muted, fontSize: '0.75rem', fontWeight: 700 }}>{Math.round(installmentSummary.progress)}%</Typography>
        </Box>
      </Section>}
      <Section title="Datas">
        <Row label="Data de Lançamento">{dateLabel(transaction.date)}{time && ` ${time}`}</Row>
        {!isTransfer && <Row label="Data de Vencimento">{dateLabel(transaction.dueDate)}</Row>}
        <Row label="Data de Efetivação">{transaction.effective ? dateLabel(transaction.effectiveDate) : 'Não efetivada'}</Row>
      </Section>
      <Section title="Mais informações">
        {!isTransfer && <Row label="Categoria">{category ? categoryChip(category) : 'Sem categoria'}</Row>}
        {!isTransfer && subcategory && <Row label="Subcategoria">{categoryChip(subcategory)}</Row>}
        {transaction.tags && <Row label="Tags">{transaction.tags}</Row>}
        <Typography sx={{ color: muted, fontSize: '0.82rem', mt: 1 }}>Observações</Typography>
        <Typography sx={{ fontSize: '0.88rem', mt: 0.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{transaction.notes || 'Nenhuma'}</Typography>
      </Section>
      {!readOnly && <Section title="Ações">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckCircleOutline sx={{ color: transaction.effective ? green : muted }} />
          <Typography sx={{ flex: 1, fontSize: '0.95rem' }}>{transaction.effective ? 'Efetivada' : 'Pendente'}</Typography>
          <Switch checked={transaction.effective} disabled={updating} onChange={onToggleEffective} inputProps={{ 'aria-label': 'Efetivada' }} />
        </Box>
      </Section>}
      {updated && <Typography sx={{ color: muted, textAlign: 'right', fontSize: '0.67rem', mt: 3 }}>Última modificação em {updated}</Typography>}
    </DialogContent>
  </Dialog>;
}
