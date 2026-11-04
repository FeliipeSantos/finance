import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Checkbox, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, LinearProgress, Menu, MenuItem, Paper, Switch, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { Add, ChevronRight, Close, DeleteOutline, EditOutlined, EventOutlined, ExpandMore, ListAlt, MoreVert, Percent, SaveOutlined, ScheduleOutlined, NotificationsNone, DashboardOutlined, MoneyOffOutlined, TrendingDown, TrendingUp } from '@mui/icons-material';
import { DragIndicator } from '@mui/icons-material';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../config/api';
import { getCategoryIcon } from '../../utils/categoryIcons';
import CategoryIconPickerDialog from '../../components/CategoryIconPickerDialog';
import { TransactionField, transactionColumnsSx, transactionContentSx, transactionHeaderSx, transactionHeadingSx, transactionPanelSx, transactionPaperSx } from '../../components/TransactionFormLayout';

type BudgetType = 'EXPENSE' | 'REVENUE';
interface Category { id: string; name: string; type: BudgetType | string; parentCategoryId?: string | null; color?: string; icon?: string }
interface Budget { id: string; categoryId: string; categoryIds?: string[]; categoryName: string; limitValue: number; currentValue: number; month: number; year: number; displayOrder?: number; name?: string | null; color?: string | null; icon?: string | null; settings?: Record<string, unknown> }

interface SortableBudgetRowProps {
  item: Budget;
  category?: Category;
  accent: string;
  onActions: (event: React.MouseEvent<HTMLElement>, item: Budget) => void;
}

const SortableBudgetRow: React.FC<SortableBudgetRowProps> = ({ item, category, accent, onActions }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const value = Number(item.currentValue);
  const target = Number(item.limitValue);
  const used = target > 0 ? value / target * 100 : 0;
  const rowColor = used > 100 ? 'var(--color-warning, #F5C84B)' : accent;
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1, position: isDragging ? 'relative' : undefined, zIndex: isDragging ? 1 : undefined };

  return <TableRow ref={setNodeRef} style={style} hover>
    <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 180 }}>
      <DragIndicator {...attributes} {...listeners} aria-label="Arrastar para reordenar" sx={{ color: 'text.secondary', cursor: 'grab', touchAction: 'none', '&:active': { cursor: 'grabbing' } }} />
      <Avatar sx={{ width: 44, height: 44, bgcolor: item.color || category?.color || 'var(--color-surface-raised, #31323B)', color: 'var(--color-text-primary)' }}>{getCategoryIcon(item.icon || category?.icon, item.name || item.categoryName)}</Avatar>
      <Typography fontWeight={650}>{item.name || item.categoryName}</Typography>
    </Box></TableCell>
    <TableCell align="right">{money(target)}</TableCell><TableCell align="right">{money(value)}</TableCell>
    <TableCell align="right" sx={{ color: 'var(--color-income, #69C6A0)', fontWeight: 600 }}>{money(target)}</TableCell>
    <TableCell align="right" sx={{ color: target - value < 0 ? 'var(--color-expense, #E9757B)' : 'var(--color-income, #69C6A0)', fontWeight: 600 }}>{`${target - value < 0 ? '-' : ''}${money(target - value)}`}</TableCell>
    <TableCell sx={{ width: 260, minWidth: 230 }}><Box sx={{ position: 'relative', width: '100%', minWidth: 210 }}><LinearProgress variant="determinate" value={Math.min(used, 100)} sx={{ height: 26, borderRadius: 10, bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), .12)', '& .MuiLinearProgress-bar': { borderRadius: 10, bgcolor: rowColor } }} /><Typography sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: used > 100 ? '#171717' : 'var(--color-text-primary)' }}>{Math.round(used)}%</Typography></Box></TableCell>
    <TableCell align="center"><IconButton aria-label="Ações do orçamento" onClick={(event) => onActions(event, item)}><MoreVert /></IconButton></TableCell>
  </TableRow>;
};

const money = (value: number) => `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const parseMoney = (value: string) => Number(value.replace(/\D/g, '') || 0) / 100;
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const BudgetsPage: React.FC = () => {
  const [type, setType] = useState<BudgetType>('EXPENSE');
  const [searchParams] = useSearchParams();
  const monthParam = Number(searchParams.get('month'));
  const yearParam = Number(searchParams.get('year'));
  const month = monthParam >= 1 && monthParam <= 12 ? monthParam : new Date().getMonth() + 1;
  const year = yearParam > 0 ? yearParam : new Date().getFullYear();
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [limit, setLimit] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  const [tags, setTags] = useState('');
  const [cards, setCards] = useState('');
  const [linkedBudgets, setLinkedBudgets] = useState('');
  const [monthly, setMonthly] = useState(true);
  const [activeFrom, setActiveFrom] = useState(monthStart);
  const [activeTo, setActiveTo] = useState(monthEnd);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [options, setOptions] = useState({ percentageOfIncome: false, alert: false, includeForecast: false, showOnSummary: false, includeIgnoredTotals: false, ignoreDetails: false });
  const [saving, setSaving] = useState(false);
  const [actionAnchor, setActionAnchor] = useState<HTMLElement | null>(null);
  const [actionBudget, setActionBudget] = useState<Budget | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [categoryResponse, budgetResponse] = await Promise.all([api.get('/categories'), api.get('/budgets')]);
      setCategories(categoryResponse.data);
      setBudgets(budgetResponse.data);
    } catch {
      setError('Não foi possível carregar os orçamentos. Tente atualizar a página.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const accent = type === 'EXPENSE' ? 'var(--color-expense, #E9757B)' : 'var(--color-income, #69C6A0)';
  const visibleCategories = useMemo(() => categories.filter((item) => item.type === type && !item.parentCategoryId), [categories, type]);
  const primarySelectedCategory = categories.find((item) => item.id === categoryIds[0]);
  const displayedColor = color || primarySelectedCategory?.color || (type === 'EXPENSE' ? '#E9757B' : '#69C6A0');
  const displayedIcon = icon || primarySelectedCategory?.icon || 'CategoryIcon';
  const rows = useMemo(() => budgets.filter((item) => item.month === month && item.year === year && categories.find((c) => c.id === item.categoryId)?.type === type)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.categoryName.localeCompare(b.categoryName, 'pt-BR')), [budgets, categories, month, type, year]);
  const totals = useMemo(() => rows.reduce((acc, item) => ({ limit: acc.limit + Number(item.limitValue), current: acc.current + Number(item.currentValue) }), { limit: 0, current: 0 }), [rows]);
  const remaining = totals.limit - totals.current;
  const utilization = totals.limit > 0 ? totals.current / totals.limit * 100 : 0;
  const fmt = (value: number) => `${value < 0 ? '-' : ''}${money(value)}`;

  const openCreate = () => {
    setEditing(null); setCategoryId(''); setCategoryIds([]); setExpandedCategories([]); setLimit(''); setDescription(''); setColor(''); setIcon('');
    setTags(''); setCards(''); setLinkedBudgets(''); setMonthly(true); setActiveFrom(monthStart); setActiveTo(monthEnd);
    setOptions({ percentageOfIncome: false, alert: false, includeForecast: false, showOnSummary: false, includeIgnoredTotals: false, ignoreDetails: false });
    setDialogOpen(true);
  };
  const openEdit = (item: Budget) => {
    const settings = item.settings || {};
    const selectedCategories = item.categoryIds?.length ? item.categoryIds : [item.categoryId];
    setEditing(item); setCategoryId(selectedCategories[0]); setCategoryIds(selectedCategories); setExpandedCategories(categories.filter((category) => category.parentCategoryId && selectedCategories.includes(category.id)).map((category) => category.parentCategoryId as string)); setLimit(String(Math.round(Number(item.limitValue) * 100)));
    setDescription(item.name || item.categoryName); setColor(item.color || ''); setIcon(item.icon || '');
    setTags(String(settings.tags || '')); setCards(String(settings.cards || '')); setLinkedBudgets(String(settings.linkedBudgets || ''));
    setMonthly(settings.monthly !== false); setActiveFrom(String(settings.activeFrom || `${item.year}-${String(item.month).padStart(2, '0')}-01`)); setActiveTo(String(settings.activeTo || `${item.year}-${String(item.month).padStart(2, '0')}-${String(new Date(item.year, item.month, 0).getDate()).padStart(2, '0')}`));
    setOptions({ percentageOfIncome: Boolean(settings.percentageOfIncome), alert: Boolean(settings.alert), includeForecast: Boolean(settings.includeForecast), showOnSummary: Boolean(settings.showOnSummary), includeIgnoredTotals: Boolean(settings.includeIgnoredTotals), ignoreDetails: Boolean(settings.ignoreDetails) });
    setDialogOpen(true); setActionAnchor(null);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const startDate = monthly ? new Date(`${activeFrom}T00:00:00`) : null;
      const budgetMonth = startDate && !Number.isNaN(startDate.getTime()) ? startDate.getMonth() + 1 : month;
      const budgetYear = startDate && !Number.isNaN(startDate.getTime()) ? startDate.getFullYear() : year;
      const payload = { categoryId: categoryIds[0] || categoryId, categoryIds: categoryIds.length ? categoryIds : [categoryId], limitValue: parseMoney(limit), month: budgetMonth, year: budgetYear, name: description.trim() || null, color: color || primarySelectedCategory?.color || null, icon: icon || primarySelectedCategory?.icon || null, settings: { ...options, tags, cards, linkedBudgets, monthly, activeFrom, activeTo } };
      if (editing) await api.put(`/budgets/${editing.id}`, payload);
      else await api.post('/budgets', payload);
      setDialogOpen(false);
      await load();
    } catch { setError('Não foi possível salvar este orçamento.'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!actionBudget) return;
    setDeleting(true);
    try { await api.delete(`/budgets/${actionBudget.id}`); setDeleteConfirmOpen(false); setActionBudget(null); await load(); }
    catch { setError('Não foi possível excluir este orçamento.'); }
    finally { setDeleting(false); }
  };
  const handleBudgetDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((row) => row.id === active.id);
    const newIndex = rows.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(rows, oldIndex, newIndex);
    try {
      await api.post('/budgets/reorder', { budgetIds: reordered.map((row) => row.id) });
      await load();
    } catch { setError('Não foi possível alterar a posição do orçamento.'); }
  };
  const toggleSubcategories = (categoryId: string) => setExpandedCategories((current) => current.includes(categoryId)
    ? current.filter((id) => id !== categoryId)
    : [...current, categoryId]);
  const toggleBudgetCategory = (id: string) => {
    const next = categoryIds.includes(id) ? categoryIds.filter((selectedId) => selectedId !== id) : [...categoryIds, id];
    setCategoryIds(next);
    setCategoryId(next[0] || '');
  };
  return <Box sx={{ p: { xs: 1.5, md: 3 }, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 750, fontSize: { xs: '1.45rem', md: '1.8rem' } }}>Orçamentos</Typography>
        <Typography sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>Defina metas mensais para acompanhar despesas e receitas.</Typography></Box>
      <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Novo orçamento</Button>
    </Box>

    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper sx={{ overflow: 'hidden', bgcolor: 'var(--color-surface, #111217)', borderRadius: 2 }}>
      <Tabs value={type} onChange={(_, value: BudgetType) => setType(value)} variant="fullWidth" sx={{ '& .MuiTabs-indicator': { height: 5, borderRadius: '5px 5px 0 0', bgcolor: accent }, '& .MuiTab-root': { minHeight: 64, fontWeight: 700, textTransform: 'none' }, '& .Mui-selected': { color: `${accent} !important` } }}>
        <Tab value="EXPENSE" icon={<TrendingDown />} iconPosition="start" label="Despesas" />
        <Tab value="REVENUE" icon={<TrendingUp />} iconPosition="start" label="Receitas" />
      </Tabs>
      <TableContainer sx={{ minHeight: 390 }}>
        <Table sx={{ minWidth: 1135, tableLayout: 'fixed' }}>
          <TableHead><TableRow sx={{ bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), .035)' }}>
            <TableCell sx={{ fontWeight: 700, width: 240 }}>Descrição ↑</TableCell><TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>Meta</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, width: 130 }}>{type === 'EXPENSE' ? 'Despesas' : 'Receitas'}</TableCell><TableCell align="right" sx={{ fontWeight: 700, width: 135 }}>Saldo atual</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, width: 150 }}>Saldo previsto</TableCell><TableCell sx={{ width: 260, fontWeight: 700 }}>Utilização</TableCell><TableCell align="center" sx={{ width: 100, fontWeight: 700 }}>Ações</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><CircularProgress size={28} /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8, color: 'var(--color-text-secondary)' }}>Nenhum orçamento para {monthNames[month - 1]} de {year}.</TableCell></TableRow>
              : <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleBudgetDragEnd}>
                <SortableContext items={rows.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {rows.map((item) => <SortableBudgetRow key={item.id} item={item} category={categories.find((category) => category.id === item.categoryId)} accent={accent} onActions={(event, budget) => { setActionAnchor(event.currentTarget); setActionBudget(budget); }} />)}
                </SortableContext>
              </DndContext>}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>

    <Paper component="section" aria-label="Resumo dos orçamentos" sx={{
      p: { xs: 2, md: 2.5 },
      borderRadius: 2,
      bgcolor: 'var(--color-surface-raised, #1C1D24)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 3,
      flexWrap: 'wrap',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'stretch', gap: { xs: 2, sm: 4 }, flexWrap: 'wrap', flex: '1 1 auto' }}>
        <Box><Typography variant="caption" color="text.secondary">Meta total</Typography><Typography fontWeight={700}>{money(totals.limit)}</Typography></Box>
        <Box><Typography variant="caption" color="text.secondary">{type === 'EXPENSE' ? 'Total de despesas' : 'Total de receitas'}</Typography><Typography fontWeight={700}>{money(totals.current)}</Typography></Box>
        <Box><Typography variant="caption" color="text.secondary">Saldo disponível</Typography><Typography fontWeight={700} sx={{ color: remaining < 0 ? 'var(--color-expense, #E9757B)' : 'var(--color-income, #69C6A0)' }}>{fmt(remaining)}</Typography></Box>
      </Box>
      <Box sx={{ flex: '1 1 280px', maxWidth: { md: 420 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
          <Typography variant="caption" color="text.secondary">Utilização total</Typography>
          <Typography variant="caption" fontWeight={700}>{Math.round(utilization)}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={Math.min(utilization, 100)} sx={{ height: 14, borderRadius: 8, bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), .12)', '& .MuiLinearProgress-bar': { bgcolor: utilization > 100 ? 'var(--color-warning, #F5C84B)' : accent, borderRadius: 8 } }} />
      </Box>
    </Paper>

    <Menu anchorEl={actionAnchor} open={Boolean(actionAnchor)} onClose={() => setActionAnchor(null)}>
      <MenuItem onClick={() => actionBudget && openEdit(actionBudget)}><EditOutlined fontSize="small" sx={{ mr: 1 }} />Editar orçamento</MenuItem>
      <MenuItem onClick={() => { setActionAnchor(null); setDeleteConfirmOpen(true); }} sx={{ color: 'error.main' }}><DeleteOutline fontSize="small" sx={{ mr: 1 }} />Excluir orçamento</MenuItem>
    </Menu>
    <Dialog open={deleteConfirmOpen} onClose={() => !deleting && setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Excluir orçamento?</DialogTitle>
      <DialogContent>Tem certeza que deseja excluir o orçamento <b>{actionBudget?.name || actionBudget?.categoryName}</b>? Esta ação não pode ser desfeita.</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancelar</Button>
        <Button onClick={() => void remove()} color="error" variant="contained" disabled={deleting}>{deleting ? 'Excluindo…' : 'Excluir'}</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: transactionPaperSx }}>
      <form onSubmit={save}>
        <Box data-transaction-header sx={transactionHeaderSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Avatar sx={{ width: 42, height: 42, bgcolor: `${accent}22`, color: accent }}><Percent fontSize="small" /></Avatar>
            <Box><Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{editing ? 'Editar Orçamento' : 'Novo Orçamento'}</Typography><Typography variant="caption" color="text.secondary">{type === 'EXPENSE' ? 'Planejamento de despesas' : 'Planejamento de receitas'}</Typography></Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Button type="submit" variant="contained" startIcon={<SaveOutlined />} disabled={saving || !visibleCategories.length || !categoryIds.length || !limit} sx={{ borderRadius: '8px', fontWeight: 600, textTransform: 'none', bgcolor: accent, color: '#171717', '&:hover': { bgcolor: accent, filter: 'brightness(.92)' } }}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            <IconButton aria-label="Fechar orçamento" onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}><Close /></IconButton>
          </Box>
        </Box>
        <DialogContent data-transaction-content sx={transactionContentSx}>
          {visibleCategories.length === 0 && <Alert severity="info" sx={{ mb: 1.5 }}>Cadastre uma categoria de {type === 'EXPENSE' ? 'despesa' : 'receita'} antes de criar o orçamento.</Alert>}
          <Box sx={transactionColumnsSx}>
            <Box sx={transactionPanelSx}>
              <Typography sx={transactionHeadingSx}>Dados do orçamento</Typography>
              <TransactionField label="Descrição"><TextField fullWidth variant="standard" placeholder="Descrição do orçamento" value={description} onChange={(event) => setDescription(event.target.value)} InputProps={{ disableUnderline: true }} /></TransactionField>
              <TransactionField label="Categorias">
                <TextField
                  select fullWidth variant="standard" value={categoryIds}
                  onChange={(event) => {
                    const value = event.target.value;
                    const selectedIds: string[] = Array.isArray(value) ? value : String(value).split(',').filter(Boolean);
                    setCategoryIds(selectedIds);
                    setCategoryId(selectedIds[0] || '');
                    const selected = categories.find((category) => category.id === selectedIds[0]);
                    if (selected && !description) setDescription(selected.name);
                  }}
                  InputProps={{ disableUnderline: true }}
                  SelectProps={{
                    multiple: true,
                    displayEmpty: true,
                    renderValue: (selected) => {
                      const selectedIds = selected as string[];
                      return selectedIds.length ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                        {selectedIds.map((id) => {
                          const category = categories.find((item) => item.id === id);
                          return category ? <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                            <Avatar sx={{ width: 23, height: 23, bgcolor: category.color || 'var(--color-surface-raised)', color: 'var(--color-text-primary)', fontSize: 14 }}>{getCategoryIcon(category.icon, category.name)}</Avatar>
                            <Typography variant="body2" noWrap>{category.name}</Typography>
                          </Box> : null;
                        })}
                      </Box> : 'Selecionar categorias';
                    },
                  }}
                  required
                >
                  {visibleCategories.map((category) => {
                    const subcategories = categories.filter((item) => item.parentCategoryId === category.id && item.type === type);
                    const expanded = expandedCategories.includes(category.id);
                    return <React.Fragment key={category.id}>
                      <MenuItem value={category.id}>
                        <Checkbox size="small" checked={categoryIds.includes(category.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleBudgetCategory(category.id)} sx={{ mr: 1, p: 0.5 }} />
                        <Avatar sx={{ width: 28, height: 28, mr: 1.25, bgcolor: category.color || 'var(--color-surface-raised)', color: 'var(--color-text-primary)', fontSize: 16 }}>{getCategoryIcon(category.icon, category.name)}</Avatar>
                        <Box onClick={(event) => { if (subcategories.length) { event.preventDefault(); event.stopPropagation(); toggleSubcategories(category.id); } }} sx={{ flex: 1, py: 1, cursor: subcategories.length ? 'pointer' : 'inherit' }}>
                          <Typography>{category.name}</Typography>
                        </Box>
                        {subcategories.length > 0 && <IconButton size="small" aria-label={`${expanded ? 'Recolher' : 'Expandir'} subcategorias de ${category.name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleSubcategories(category.id); }} sx={{ ml: 1 }}>
                          {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                        </IconButton>}
                      </MenuItem>
                      {subcategories.length > 0 && <Collapse in={expanded} timeout="auto" unmountOnExit>
                        {subcategories.map((subcategory) => <MenuItem key={subcategory.id} value={subcategory.id} sx={{ pl: 6 }}>
                          <Checkbox size="small" checked={categoryIds.includes(subcategory.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleBudgetCategory(subcategory.id)} sx={{ mr: 1, p: 0.5 }} />
                          <Avatar sx={{ width: 26, height: 26, mr: 1.25, bgcolor: subcategory.color || category.color || 'var(--color-surface-raised)', color: 'var(--color-text-primary)', fontSize: 15 }}>{getCategoryIcon(subcategory.icon, subcategory.name)}</Avatar>
                          {subcategory.name}
                        </MenuItem>)}
                      </Collapse>}
                    </React.Fragment>;
                  })}
                </TextField>
              </TransactionField>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <TransactionField label="Cor"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><input aria-label="Cor do orçamento" type="color" value={displayedColor} onChange={(event) => setColor(event.target.value)} style={{ width: 30, height: 30, padding: 0, border: 0, borderRadius: '50%', background: 'transparent', cursor: 'pointer' }} /><Typography variant="body2">{displayedColor.toUpperCase()}</Typography></Box></TransactionField>
                <TransactionField label="Ícone"><Button onClick={() => setIconPickerOpen(true)} startIcon={<Avatar sx={{ width: 26, height: 26, bgcolor: `${displayedColor}25`, color: displayedColor }}>{getCategoryIcon(displayedIcon, description)}</Avatar>} sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'text.primary' }}>Selecionar ícone</Button></TransactionField>
              </Box>
              <TransactionField label="Tags"><TextField fullWidth variant="standard" placeholder="Separadas por vírgula" value={tags} onChange={(event) => setTags(event.target.value)} InputProps={{ disableUnderline: true }} /></TransactionField>
              <TransactionField label="Cartões de crédito"><TextField fullWidth variant="standard" placeholder="Selecionar" value={cards} onChange={(event) => setCards(event.target.value)} InputProps={{ disableUnderline: true }} /></TransactionField>
              <TransactionField label="Orçamentos"><TextField fullWidth variant="standard" placeholder="Selecionar" value={linkedBudgets} onChange={(event) => setLinkedBudgets(event.target.value)} InputProps={{ disableUnderline: true }} /></TransactionField>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <Button onClick={() => setMonthly(true)} startIcon={<ScheduleOutlined />} sx={{ minHeight: 44, borderRadius: 0, textTransform: 'none', bgcolor: monthly ? 'rgba(var(--color-expense-rgb, 233, 117, 123), .14)' : 'transparent', color: monthly ? accent : 'text.primary', border: monthly ? `1px solid ${accent}` : '1px solid transparent' }}>Mensal</Button>
                <Button onClick={() => setMonthly(false)} startIcon={<EventOutlined />} sx={{ minHeight: 44, borderRadius: 0, textTransform: 'none', bgcolor: !monthly ? 'rgba(var(--color-expense-rgb, 233, 117, 123), .14)' : 'transparent', color: !monthly ? accent : 'text.primary', border: !monthly ? `1px solid ${accent}` : '1px solid transparent' }}>Personalizado</Button>
              </Box>
              {monthly
                ? <TransactionField label="Vigente a partir de"><TextField type="date" fullWidth variant="standard" value={activeFrom} onChange={(event) => setActiveFrom(event.target.value)} InputProps={{ disableUnderline: true }} /></TransactionField>
                : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(var(--color-overlay-rgb, 255, 255, 255), .045)' }}>
                  <TextField type="date" label="Data inicial" value={activeFrom} onChange={(event) => setActiveFrom(event.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
                  <TextField type="date" label="Data final" value={activeTo} onChange={(event) => setActiveTo(event.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} inputProps={{ min: activeFrom }} />
                </Box>}
            </Box>
            <Box sx={transactionPanelSx}>
              <Typography sx={transactionHeadingSx}>Meta e preferências</Typography>
              <TransactionField label="Meta"><TextField fullWidth variant="standard" placeholder="R$ 0,00" value={limit ? money(parseMoney(limit)) : ''} onChange={(event) => setLimit(event.target.value.replace(/\D/g, ''))} InputProps={{ disableUnderline: true }} inputProps={{ inputMode: 'numeric' }} required /></TransactionField>
              {[
                { key: 'percentageOfIncome', label: 'Percentual das receitas', Icon: Percent },
                { key: 'alert', label: 'Receber alerta', Icon: NotificationsNone },
                { key: 'includeForecast', label: 'Considerar no saldo previsto', Icon: ScheduleOutlined },
                { key: 'showOnSummary', label: 'Exibir na tela de Resumo', Icon: DashboardOutlined },
                { key: 'includeIgnoredTotals', label: 'Considerar transações ignoradas nos totais', Icon: MoneyOffOutlined },
                { key: 'ignoreDetails', label: 'Ignorar no detalhamento', Icon: ListAlt },
              ].map(({ key, label, Icon }) => <Box key={key} sx={{ minHeight: 48, display: 'flex', alignItems: 'center', gap: 1.25, borderBottom: '1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), .055)' }}><Icon sx={{ color: 'text.secondary', fontSize: 21 }} /><Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography><Switch size="small" checked={Boolean(options[key as keyof typeof options])} onChange={(event) => setOptions({ ...options, [key]: event.target.checked })} /></Box>)}
            </Box>
          </Box>
        </DialogContent>
      </form>
    </Dialog>
    <CategoryIconPickerDialog open={iconPickerOpen} onClose={() => setIconPickerOpen(false)} value={icon} onSelect={(value) => { setIcon(value); setIconPickerOpen(false); }} title="Ícone do orçamento" />
  </Box>;
};

export default BudgetsPage;
