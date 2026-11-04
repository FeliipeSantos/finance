import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../config/api';
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
  IconButton,
  Button,
  Dialog,
  DialogContent,
  MenuItem,
  Grid,
  Menu,
  Avatar,
  InputBase,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Menu as DragIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Palette as PaletteIcon,
  Image as ImageIcon,
  FormatListBulleted as ListIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCategoryIcon } from '../../utils/categoryIcons';
import CategoryIconPickerDialog from '../../components/CategoryIconPickerDialog';
import ColorPickerPopover from '../../components/ColorPickerPopover';

// ── Interfaces ────────────────────────────────────────────────
interface Category {
  id: string;
  userId?: string | null;
  name: string;
  type: string;
  parentCategoryId?: string;
  color?: string;
  icon?: string;
  displayOrder?: number;
  showInAccountsByCategory?: boolean;
  showInCategorySummary?: boolean;
  showInCategoryBalance?: boolean;
}

interface Account {
  id: string;
  name: string;
  institution: string;
  balanceInitial: number;
  balanceCurrent: number;
  color: string;
  type: string;
  active: boolean;
}

interface Transaction {
  id: string;
  accountId?: string;
  destinationAccountId?: string;
  categoryId: string;
  creditCardId?: string;
  value: number;
  date: string;
  type: 'REVENUE' | 'EXPENSE' | 'TRANSFER';
  description: string;
  effective?: boolean;
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

interface CategoryRowProps {
  cat: Category;
  isSelected: boolean;
  catColor: string;
  totalValue: number;
  activeTab: 'EXPENSE' | 'REVENUE' | 'ACCOUNTS';
  onSelect: () => void;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ cat, isSelected, catColor, totalValue, activeTab, onSelect, onMenuOpen }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      sx={{
        cursor: 'pointer',
        bgcolor: isSelected ? "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" : 'transparent',
        borderLeft: isSelected ? `4px solid ${activeTab === 'EXPENSE' ? '#E05A5A' : '#4EBE87'}` : '4px solid transparent',
        '& td': { borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", py: 1.5 },
        '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)" },
      }}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: `${catColor}15`,
              color: catColor,
              width: 32,
              height: 32,
            }}
          >
            {getCategoryIcon(cat.icon, cat.name)}
          </Avatar>
          <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.875rem' }}>
            {cat.name}
          </Typography>
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600 }}>
        R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
          <DragIcon
            {...attributes}
            {...listeners}
            sx={{ color: "var(--color-text-secondary, #4E5366)", fontSize: '1.2rem', cursor: 'grab', touchAction: 'none' }}
          />
          <IconButton size="small" onClick={onMenuOpen} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
};

interface SubcategoryRowProps {
  sub: Category;
  subTotal: number;
  subColor: string;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>) => void;
}

const SubcategoryRow: React.FC<SubcategoryRowProps> = ({ sub, subTotal, subColor, onMenuOpen }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      sx={{
        '& td': { borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", py: 1.5 },
        '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)" },
      }}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: `${subColor}15`,
              color: subColor,
              width: 32,
              height: 32,
            }}
          >
            {getCategoryIcon(sub.icon, sub.name)}
          </Avatar>
          <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 500, fontSize: '0.875rem' }}>
            {sub.name}
          </Typography>
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600 }}>
        R$ {subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
          <DragIcon
            {...attributes}
            {...listeners}
            sx={{ color: "var(--color-text-secondary, #4E5366)", fontSize: '1.2rem', cursor: 'grab', touchAction: 'none' }}
          />
          <IconButton size="small" onClick={onMenuOpen} sx={{ color: "var(--color-text-secondary, #7E8494)" }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
};

const CategoriesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;
  const queryYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();

  // ── States ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'REVENUE' | 'ACCOUNTS'>('EXPENSE');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Menu action states
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  // Modals state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#7E8494');
  const [newCatIcon, setNewCatIcon] = useState('HelpIcon');
  const [showInAccountsByCategory, setShowInAccountsByCategory] = useState(true);
  const [showInCategorySummary, setShowInCategorySummary] = useState(true);
  const [showInCategoryBalance, setShowInCategoryBalance] = useState(true);
  const [newSubName, setNewSubName] = useState('');
  const [newSubColor, setNewSubColor] = useState('#7E8494');
  const [newSubIcon, setNewSubIcon] = useState('HelpIcon');

  // Sync newSubColor to the selected category's color when selectedCategory changes
  useEffect(() => {
    if (selectedCategory) {
      setNewSubColor(selectedCategory.color || '#7E8494');
    }
  }, [selectedCategory]);

  // Edit states
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#7E8494');
  const [editIcon, setEditIcon] = useState('HelpIcon');
  const [editShowInAccountsByCategory, setEditShowInAccountsByCategory] = useState(true);
  const [editShowInCategorySummary, setEditShowInCategorySummary] = useState(true);
  const [editShowInCategoryBalance, setEditShowInCategoryBalance] = useState(true);

  // Popover states
  const [colorAnchor, setColorAnchor] = useState<null | HTMLElement>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, accRes, txRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts'),
        api.get('/transactions'),
      ]);
      setCategories(catRes.data);
      setAccounts(accRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      setError('Falha ao carregar os dados de categorias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter transactions for period
  const periodTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    const tDate = new Date(t.date);
    const tMonth = tDate.getMonth() + 1;
    const tYear = tDate.getFullYear();
    return tMonth === queryMonth && tYear === queryYear;
  });

  // Calculate totals
  const getSubcategoryTotal = (subCatId: string) => {
    return periodTransactions
      .filter((t) => t.categoryId === subCatId)
      .reduce((sum, t) => sum + Number(t.value || 0), 0);
  };

  const getCategoryTotal = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.type === 'ACCOUNTS') {
      return accounts
        .filter((acc) => acc.type === cat.name)
        .reduce((sum, acc) => sum + Number(acc.balanceCurrent || 0), 0);
    }
    const subCatIds = categories.filter((c) => c.parentCategoryId === catId).map((c) => c.id);
    const directSum = periodTransactions
      .filter((t) => t.categoryId === catId)
      .reduce((sum, t) => sum + Number(t.value || 0), 0);
    const subSum = periodTransactions
      .filter((t) => t.categoryId && subCatIds.includes(t.categoryId))
      .reduce((sum, t) => sum + Number(t.value || 0), 0);
    return directSum + subSum;
  };

  // Filter parent categories
  const filteredParents = categories
    .filter((c) => !c.parentCategoryId && c.type === activeTab)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const persistReorder = async (orderedIds: string[]) => {
    try {
      await api.put('/categories/reorder', { categoryIds: orderedIds });
    } catch {
      // Reordering failed server-side — reload to get back in sync.
      fetchData();
    }
  };

  const handleParentDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredParents.findIndex((c) => c.id === active.id);
    const newIndex = filteredParents.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(filteredParents, oldIndex, newIndex);
    const reorderedIds = new Set(reordered.map((c) => c.id));
    setCategories((prev) => {
      const others = prev.filter((c) => !reorderedIds.has(c.id));
      const withOrder = reordered.map((c, idx) => ({ ...c, displayOrder: idx }));
      return [...others, ...withOrder];
    });
    persistReorder(reordered.map((c) => c.id));
  };

  // Auto-select first category if none is selected
  useEffect(() => {
    if (filteredParents.length > 0 && !selectedCategory) {
      setSelectedCategory(filteredParents[0]);
    }
  }, [filteredParents, selectedCategory]);

  // Handle category / subcategory creation
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newCatName,
        type: activeTab,
        color: newCatColor,
        icon: newCatIcon,
        showInAccountsByCategory: activeTab === 'ACCOUNTS' ? showInAccountsByCategory : true,
        showInCategorySummary: activeTab === 'ACCOUNTS' ? showInCategorySummary : true,
        showInCategoryBalance: activeTab === 'ACCOUNTS' ? showInCategoryBalance : true,
      };
      const res = await api.post('/categories', payload);
      setCategories((prev) => [...prev, res.data]);
      setNewCatName('');
      setNewCatColor('#7E8494');
      setNewCatIcon('HelpIcon');
      setShowInAccountsByCategory(true);
      setShowInCategorySummary(true);
      setShowInCategoryBalance(true);
      setCatModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar categoria.');
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      const payload = {
        name: newSubName,
        type: activeTab,
        parentCategoryId: selectedCategory.id,
        color: newSubColor,
        icon: newSubIcon,
      };
      const res = await api.post('/categories', payload);
      setCategories((prev) => [...prev, res.data]);
      setNewSubName('');
      setNewSubIcon('HelpIcon');
      setSubModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar subcategoria.');
    }
  };

  // Handle category deletion
  const handleDeleteCategory = async () => {
    if (!activeCategory) return;
    const isSub = !!activeCategory.parentCategoryId;
    if (
      window.confirm(
        isSub
          ? `Tem certeza de que deseja excluir a subcategoria "${activeCategory.name}"?`
          : `Tem certeza de que deseja excluir a categoria "${activeCategory.name}"? As subcategorias e orçamentos vinculados a ela serão impactados.`
      )
    ) {
      try {
        await api.delete(`/categories/${activeCategory.id}`);
        setCategories((prev) => prev.filter((c) => c.id !== activeCategory.id));
        if (selectedCategory?.id === activeCategory.id) {
          setSelectedCategory(null);
        }
        setMenuAnchor(null);
        setActiveCategory(null);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Erro ao excluir.');
      }
    }
  };

  const handleOpenEditModal = () => {
    if (!activeCategory) return;
    setEditName(activeCategory.name);
    setEditColor(activeCategory.color || '#7E8494');
    setEditIcon(activeCategory.icon || 'HelpIcon');
    setEditShowInAccountsByCategory(activeCategory.showInAccountsByCategory ?? true);
    setEditShowInCategorySummary(activeCategory.showInCategorySummary ?? true);
    setEditShowInCategoryBalance(activeCategory.showInCategoryBalance ?? true);
    setEditModalOpen(true);
    setMenuAnchor(null);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) return;
    try {
      const payload = {
        name: editName,
        type: activeCategory.type,
        parentCategoryId: activeCategory.parentCategoryId || null,
        color: editColor,
        icon: editIcon,
        showInAccountsByCategory: activeCategory.type === 'ACCOUNTS' ? editShowInAccountsByCategory : true,
        showInCategorySummary: activeCategory.type === 'ACCOUNTS' ? editShowInCategorySummary : true,
        showInCategoryBalance: activeCategory.type === 'ACCOUNTS' ? editShowInCategoryBalance : true,
      };
      const res = await api.put(`/categories/${activeCategory.id}`, payload);
      setCategories((prev) =>
        prev.map((c) => (c.id === activeCategory.id ? res.data : c))
      );
      if (selectedCategory?.id === activeCategory.id) {
        setSelectedCategory(res.data);
      }
      setEditModalOpen(false);
      setActiveCategory(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao atualizar.');
    }
  };

  const getCategoryColor = (cat: Category) => {
    if (cat.color) return cat.color;
    const n = cat.name.toLowerCase();
    if (n.includes('alimentação')) return '#9E9E9E';
    if (n.includes('assinatura')) return '#EC407A';
    if (n.includes('cartão') || n.includes('crédito')) return '#5C6BC0';
    if (n.includes('reembolsável') || n.includes('reembolso')) return '#26A69A';
    if (n.includes('educação')) return '#26C6DA';
    if (n.includes('empresa') || n.includes('trabalho')) return '#42A5F5';
    if (n.includes('escritório') || n.includes('papelaria')) return '#78909C';
    if (n.includes('família')) return '#AB47BC';
    if (n.includes('investimento')) return '#66BB6A';
    if (n.includes('lazer')) return '#FFCA28';
    if (n.includes('moradia')) return '#7E57C2';
    return '#7E8494';
  };



  // Subcategories of selected parent category
  const selectedSubcategories = selectedCategory
    ? categories
        .filter((c) => c.parentCategoryId === selectedCategory.id)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    : [];

  const handleSubcategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedCategory) return;
    const oldIndex = selectedSubcategories.findIndex((c) => c.id === active.id);
    const newIndex = selectedSubcategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(selectedSubcategories, oldIndex, newIndex);
    const reorderedIds = new Set(reordered.map((c) => c.id));
    setCategories((prev) => {
      const others = prev.filter((c) => !reorderedIds.has(c.id));
      const withOrder = reordered.map((c, idx) => ({ ...c, displayOrder: idx }));
      return [...others, ...withOrder];
    });
    persistReorder(reordered.map((c) => c.id));
  };

  const leftColumnTotal = filteredParents.reduce(
    (sum, c) => sum + Number(getCategoryTotal(c.id) || 0),
    0
  );

  const rightColumnTotal = selectedSubcategories.reduce(
    (sum, c) => sum + Number(getSubcategoryTotal(c.id) || 0),
    0
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Tabs Header */}
      <Box
        sx={{
          display: 'flex',
          borderBottom: "1px solid var(--color-border)",
          mb: 3,
          gap: 4,
        }}
      >
        <Button
          onClick={() => { setActiveTab('EXPENSE'); setSelectedCategory(null); }}
          sx={{
            color: activeTab === 'EXPENSE' ? "var(--color-expense, #E05A5A)" : "var(--color-text-secondary, #7E8494)",
            fontSize: '0.9rem',
            fontWeight: 700,
            px: 2,
            py: 1.5,
            borderRadius: 0,
            textTransform: 'none',
            borderBottom: activeTab === 'EXPENSE' ? '3px solid #E05A5A' : '3px solid transparent',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'transparent', color: activeTab === 'EXPENSE' ? "var(--color-expense, #E05A5A)" : "var(--color-text-primary, #FFFFFF)" },
          }}
        >
          Despesas
        </Button>
        <Button
          onClick={() => { setActiveTab('REVENUE'); setSelectedCategory(null); }}
          sx={{
            color: activeTab === 'REVENUE' ? "var(--color-income, #4EBE87)" : "var(--color-text-secondary, #7E8494)",
            fontSize: '0.9rem',
            fontWeight: 700,
            px: 2,
            py: 1.5,
            borderRadius: 0,
            textTransform: 'none',
            borderBottom: activeTab === 'REVENUE' ? '3px solid #4EBE87' : '3px solid transparent',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'transparent', color: activeTab === 'REVENUE' ? "var(--color-income, #4EBE87)" : "var(--color-text-primary, #FFFFFF)" },
          }}
        >
          Receitas
        </Button>
        <Button
          onClick={() => { setActiveTab('ACCOUNTS'); setSelectedCategory(null); }}
          sx={{
            color: activeTab === 'ACCOUNTS' ? 'var(--color-primary-text)' : "var(--color-text-secondary, #7E8494)",
            fontSize: '0.9rem',
            fontWeight: 700,
            px: 2,
            py: 1.5,
            borderRadius: 0,
            textTransform: 'none',
            borderBottom: activeTab === 'ACCOUNTS' ? '3px solid var(--color-primary)' : '3px solid transparent',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'transparent', color: activeTab === 'ACCOUNTS' ? 'var(--color-primary-text)' : "var(--color-text-primary, #FFFFFF)" },
          }}
        >
          Contas
        </Button>
      </Box>

      {activeTab === 'ACCOUNTS' ? (
        /* ACCOUNTS CATEGORIES LISTING */
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper
              sx={{
                bgcolor: "var(--color-panel, #111217)",
                border: "1px solid var(--color-border)",
                borderRadius: '16px',
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)" }}>
                  Categorias de Contas
                </Typography>
                <Button
                  onClick={() => setCatModalOpen(true)}
                  startIcon={<AddIcon />}
                  sx={{
                    color: 'var(--color-primary-text)',
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: 'rgba(var(--color-primary-rgb),0.06)',
                    borderRadius: '12px',
                    px: 2,
                    '&:hover': {
                      bgcolor: 'rgba(var(--color-primary-rgb),0.12)',
                    },
                  }}
                >
                  Nova categoria
                </Button>
              </Box>

              <TableContainer sx={{ minHeight: '350px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 } }}>
                      <TableCell>Nome</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredParents.map((cat) => {
                      const catColor = getCategoryColor(cat);
                      const totalValue = getCategoryTotal(cat.id);

                      return (
                        <TableRow
                          key={cat.id}
                          sx={{
                            '& td': { borderBottom: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)", py: 1.5 },
                            '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.01)" },
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: `${catColor}15`,
                                  color: catColor,
                                  width: 32,
                                  height: 32,
                                }}
                              >
                                {getCategoryIcon(cat.icon, cat.name)}
                              </Avatar>
                              <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600, fontSize: '0.875rem' }}>
                                {cat.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600 }}>
                            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                sx={{ color: "var(--color-text-secondary, #7E8494)" }}
                              >
                                <ListIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setMenuAnchor(e.currentTarget);
                                  setActiveCategory(cat);
                                }}
                                sx={{ color: "var(--color-text-secondary, #7E8494)" }}
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

              {/* Bottom Summary Accounts */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)",
                  border: "1px solid var(--color-border)",
                  borderRadius: '12px',
                  p: 1.5,
                  mt: 'auto',
                }}
              >
                <Typography variant="body2" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 }}>
                  Categorias ({filteredParents.length})
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>
                  Total: R$ {leftColumnTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        /* CATEGORIES & SUBCATEGORIES TAB LISTING */
        <Grid container spacing={3}>
          {/* LEFT COLUMN: Categories */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                bgcolor: "var(--color-panel, #111217)",
                border: "1px solid var(--color-border)",
                borderRadius: '16px',
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)" }}>
                  {activeTab === 'EXPENSE' ? 'Categorias de Despesas' : 'Categorias de Receitas'}
                </Typography>
                <Button
                  onClick={() => setCatModalOpen(true)}
                  startIcon={<AddIcon />}
                  sx={{
                    color: activeTab === 'EXPENSE' ? "var(--color-expense, #E05A5A)" : "var(--color-income, #4EBE87)",
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: activeTab === 'EXPENSE' ? 'rgba(224,90,90,0.06)' : 'rgba(78,190,135,0.06)',
                    borderRadius: '12px',
                    px: 2,
                    '&:hover': {
                      bgcolor: activeTab === 'EXPENSE' ? 'rgba(224,90,90,0.12)' : 'rgba(78,190,135,0.12)',
                    },
                  }}
                >
                  Nova categoria
                </Button>
              </Box>

              <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleParentDragEnd}>
                <TableContainer sx={{ minHeight: '400px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 } }}>
                        <TableCell>Nome</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <SortableContext items={filteredParents.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        {filteredParents.map((cat) => (
                          <CategoryRow
                            key={cat.id}
                            cat={cat}
                            isSelected={selectedCategory?.id === cat.id}
                            catColor={getCategoryColor(cat)}
                            totalValue={getCategoryTotal(cat.id)}
                            activeTab={activeTab}
                            onSelect={() => setSelectedCategory(cat)}
                            onMenuOpen={(e) => {
                              setMenuAnchor(e.currentTarget);
                              setActiveCategory(cat);
                            }}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </TableContainer>
              </DndContext>

              {/* Bottom Summary Left */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)",
                  border: "1px solid var(--color-border)",
                  borderRadius: '12px',
                  p: 1.5,
                  mt: 1,
                }}
              >
                <Typography variant="body2" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 }}>
                  Categorias ({filteredParents.length})
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>
                  Total: R$ {leftColumnTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* RIGHT COLUMN: Subcategories */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                bgcolor: "var(--color-panel, #111217)",
                border: "1px solid var(--color-border)",
                borderRadius: '16px',
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: '520px',
              }}
            >
              {selectedCategory ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFFFFF)" }}>
                      Subcategorias de {selectedCategory.name}
                    </Typography>
                    <Button
                      onClick={() => setSubModalOpen(true)}
                      startIcon={<AddIcon />}
                      sx={{
                        color: activeTab === 'EXPENSE' ? "var(--color-expense, #E05A5A)" : "var(--color-income, #4EBE87)",
                        fontWeight: 700,
                        textTransform: 'none',
                        border: `1.5px solid ${activeTab === 'EXPENSE' ? 'rgba(224,90,90,0.3)' : 'rgba(78,190,135,0.3)'}`,
                        borderRadius: '12px',
                        px: 2,
                        '&:hover': {
                          bgcolor: activeTab === 'EXPENSE' ? 'rgba(224,90,90,0.04)' : 'rgba(78,190,135,0.04)',
                        },
                      }}
                    >
                      Nova subcategoria
                    </Button>
                  </Box>

                  <TableContainer sx={{ minHeight: '350px' }}>
                    {selectedSubcategories.length === 0 ? (
                      <Box display="flex" justifyContent="center" alignItems="center" height="250px">
                        <Typography sx={{ color: "var(--color-text-secondary, #7E8494)" }}>Nenhuma subcategoria cadastrada.</Typography>
                      </Box>
                    ) : (
                      <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleSubcategoryDragEnd}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ '& th': { borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 } }}>
                              <TableCell>Nome</TableCell>
                              <TableCell align="right">Total</TableCell>
                              <TableCell align="right">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <SortableContext items={selectedSubcategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                              {selectedSubcategories.map((sub) => (
                                <SubcategoryRow
                                  key={sub.id}
                                  sub={sub}
                                  subTotal={getSubcategoryTotal(sub.id)}
                                  subColor={sub.color || getCategoryColor(sub)}
                                  onMenuOpen={(e) => {
                                    setMenuAnchor(e.currentTarget);
                                    setActiveCategory(sub);
                                  }}
                                />
                              ))}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </DndContext>
                    )}
                  </TableContainer>

                  {/* Bottom Summary Right */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)",
                      border: "1px solid var(--color-border)",
                      borderRadius: '12px',
                      p: 1.5,
                      mt: 'auto',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "var(--color-text-secondary, #7E8494)", fontWeight: 600 }}>
                      Subcategorias ({selectedSubcategories.length})
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 700 }}>
                      Total: R$ {rightColumnTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                  <Typography sx={{ color: "var(--color-text-secondary, #7E8494)" }}>Selecione uma categoria para ver suas subcategorias.</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Options Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { bgcolor: "var(--color-surface-raised, #1D1E26)", border: "1px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)", borderRadius: '12px' } }}
      >
        <MenuItem
          onClick={handleOpenEditModal}
          disabled={!activeCategory?.userId}
          sx={{ color: "var(--color-text-primary, #FFFFFF)", fontWeight: 600 }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={handleDeleteCategory}
          disabled={!activeCategory?.userId}
          sx={{ color: "var(--color-expense, #E05A5A)", fontWeight: 600 }}
        >
          Excluir
        </MenuItem>
      </Menu>

      {/* DIALOG: Nova Categoria */}
      <Dialog
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: "var(--color-panel, #111217)",
            backgroundImage: 'none',
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary, #FFFFFF)",
            width: '100%',
            maxWidth: 400,
          },
        }}
      >
        <form onSubmit={handleCreateCategory}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2.5, borderBottom: "1px solid var(--color-border)" }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton onClick={() => setCatModalOpen(false)} sx={{ color: "var(--color-text-secondary, #7E8494)", p: 0.5 }}>
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.2rem' }}>Nova Categoria</Typography>
            </Box>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: activeTab === 'EXPENSE' ? '#E05A5A' : activeTab === 'REVENUE' ? '#4EBE87' : 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
                '&:hover': { bgcolor: activeTab === 'EXPENSE' ? '#E05A5A' : activeTab === 'REVENUE' ? '#4EBE87' : 'var(--color-primary)', opacity: 0.9 },
              }}
            >
              Salvar
            </Button>
          </Box>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 3, gap: 1.5 }}>
            {/* Nome row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: "1px solid var(--color-border)" }}>
              <DragIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
              <InputBase
                placeholder="Nome"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
                fullWidth
                sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}
              />
            </Box>

            {/* Cor row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: "1px solid var(--color-border)" }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PaletteIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}>Cor da categoria</Typography>
              </Box>
              <Box
                onClick={(e) => setColorAnchor(e.currentTarget)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: newCatColor,
                  cursor: 'pointer',
                  border: "2px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.15)",
                  '&:hover': { opacity: 0.8 },
                }}
              />
            </Box>

            {/* Icone row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                borderBottom: activeTab === 'ACCOUNTS' ? "1px solid var(--color-border)" : 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ImageIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}>Ícone</Typography>
              </Box>
              <IconButton aria-label="Selecionar ícone"
                onClick={() => setIconPickerOpen(true)}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)",
                  color: activeTab === 'EXPENSE' ? "var(--color-expense, #E05A5A)" : activeTab === 'REVENUE' ? "var(--color-income, #4EBE87)" : 'var(--color-primary)',
                  borderRadius: "50%",
                  '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.1)" },
                }}
              >
                {getCategoryIcon(newCatIcon)}
              </IconButton>
            </Box>

            {/* Checkboxes for Accounts tab */}
            {activeTab === 'ACCOUNTS' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                  <DashboardIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.25rem' }} />
                  <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}>Cards na tela de Resumo:</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 4.5 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showInAccountsByCategory}
                        onChange={(e) => setShowInAccountsByCategory(e.target.checked)}
                        sx={{ color: "var(--color-text-secondary, #7E8494)", '&.Mui-checked': { color: 'var(--color-primary-text)' }, p: 0.5 }}
                      />
                    }
                    label={
                      <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>
                        Considerar em Contas por Categoria
                      </Typography>
                    }
                    sx={{ ml: 0, gap: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showInCategorySummary}
                        onChange={(e) => setShowInCategorySummary(e.target.checked)}
                        sx={{ color: "var(--color-text-secondary, #7E8494)", '&.Mui-checked': { color: 'var(--color-primary-text)' }, p: 0.5 }}
                      />
                    }
                    label={
                      <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>
                        Considerar no Resumo das Categorias
                      </Typography>
                    }
                    sx={{ ml: 0, gap: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showInCategoryBalance}
                        onChange={(e) => setShowInCategoryBalance(e.target.checked)}
                        sx={{ color: "var(--color-text-secondary, #7E8494)", '&.Mui-checked': { color: 'var(--color-primary-text)' }, p: 0.5 }}
                      />
                    }
                    label={
                      <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>
                        Considerar no Balanço das Categorias
                      </Typography>
                    }
                    sx={{ ml: 0, gap: 1 }}
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
        </form>
      </Dialog>

      {/* DIALOG: Nova Subcategoria */}
      <Dialog
        open={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: "var(--color-panel, #111217)",
            backgroundImage: 'none',
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary, #FFFFFF)",
            width: '100%',
            maxWidth: 400,
          },
        }}
      >
        <form onSubmit={handleCreateSubcategory}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2.5, borderBottom: "1px solid var(--color-border)" }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton onClick={() => setSubModalOpen(false)} sx={{ color: "var(--color-text-secondary, #7E8494)", p: 0.5 }}>
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.2rem' }}>Nova Subcategoria</Typography>
            </Box>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: activeTab === 'EXPENSE' ? '#E05A5A' : '#4EBE87',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
                '&:hover': { bgcolor: activeTab === 'EXPENSE' ? '#E05A5A' : '#4EBE87', opacity: 0.9 },
              }}
            >
              Salvar
            </Button>
          </Box>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 3, gap: 1.5 }}>
            {/* Nome row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: "1px solid var(--color-border)" }}>
              <DragIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
              <InputBase
                placeholder="Nome"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                required
                fullWidth
                sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}
              />
            </Box>

            {/* Cor row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: "1px solid var(--color-border)" }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PaletteIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}>Cor da subcategoria</Typography>
              </Box>
              <Box
                onClick={(e) => setColorAnchor(e.currentTarget)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: newSubColor,
                  cursor: 'pointer',
                  border: "2px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.15)",
                  '&:hover': { opacity: 0.8 },
                }}
              />
            </Box>

            {/* Icone row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ImageIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}>Ícone</Typography>
              </Box>
              <IconButton aria-label="Selecionar ícone"
                onClick={() => setIconPickerOpen(true)}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)",
                  color: activeTab === 'EXPENSE' ? "var(--color-expense, #E05A5A)" : "var(--color-income, #4EBE87)",
                  borderRadius: "50%",
                  '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.1)" },
                }}
              >
                {getCategoryIcon(newSubIcon)}
              </IconButton>
            </Box>

            <Typography variant="caption" sx={{ color: "var(--color-text-secondary, #7E8494)", mt: 1 }}>
              Vincular à categoria principal: <strong>{selectedCategory?.name}</strong>
            </Typography>
          </DialogContent>
        </form>
      </Dialog>

      {/* DIALOG: Editar Categoria / Subcategoria */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: "var(--color-panel, #111217)",
            backgroundImage: 'none',
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary, #FFFFFF)",
            width: '100%',
            maxWidth: 400,
          },
        }}
      >
        <form onSubmit={handleUpdateCategory}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2.5, borderBottom: "1px solid var(--color-border)" }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton onClick={() => setEditModalOpen(false)} sx={{ color: "var(--color-text-secondary, #7E8494)", p: 0.5 }}>
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.2rem' }}>
                {activeCategory?.parentCategoryId ? 'Editar Subcategoria' : 'Editar Categoria'}
              </Typography>
            </Box>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: activeCategory?.type === 'EXPENSE' ? '#E05A5A' : activeCategory?.type === 'REVENUE' ? '#4EBE87' : 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
                '&:hover': { bgcolor: activeCategory?.type === 'EXPENSE' ? '#E05A5A' : activeCategory?.type === 'REVENUE' ? '#4EBE87' : 'var(--color-primary)', opacity: 0.9 },
              }}
            >
              Salvar
            </Button>
          </Box>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 3, gap: 1.5 }}>
            {/* Nome row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: "1px solid var(--color-border)" }}>
              <DragIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
              <InputBase
                placeholder="Nome"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                fullWidth
                sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}
              />
            </Box>

            {/* Cor row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: "1px solid var(--color-border)" }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PaletteIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}>
                  {activeCategory?.parentCategoryId ? 'Cor da subcategoria' : 'Cor da categoria'}
                </Typography>
              </Box>
              <Box
                onClick={(e) => setColorAnchor(e.currentTarget)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: editColor,
                  cursor: 'pointer',
                  border: "2px solid rgba(var(--color-overlay-rgb, 255, 255, 255), 0.15)",
                  '&:hover': { opacity: 0.8 },
                }}
              />
            </Box>

            {/* Icone row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                borderBottom: activeCategory?.type === 'ACCOUNTS' ? "1px solid var(--color-border)" : 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ImageIcon sx={{ color: "var(--color-text-secondary, #7E8494)" }} />
                <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}>Ícone</Typography>
              </Box>
              <IconButton aria-label="Selecionar ícone"
                onClick={() => setIconPickerOpen(true)}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)",
                  color: activeCategory?.type === 'EXPENSE' ? "var(--color-expense, #E05A5A)" : activeCategory?.type === 'REVENUE' ? "var(--color-income, #4EBE87)" : 'var(--color-primary)',
                  borderRadius: "50%",
                  '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.1)" },
                }}
              >
                {getCategoryIcon(editIcon)}
              </IconButton>
            </Box>

            {/* Checkboxes for Accounts tab */}
            {activeCategory?.type === 'ACCOUNTS' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                  <DashboardIcon sx={{ color: "var(--color-text-secondary, #7E8494)", fontSize: '1.25rem' }} />
                  <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '1rem', fontWeight: 500 }}>Cards na tela de Resumo:</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 4.5 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editShowInAccountsByCategory}
                        onChange={(e) => setEditShowInAccountsByCategory(e.target.checked)}
                        sx={{ color: "var(--color-text-secondary, #7E8494)", '&.Mui-checked': { color: 'var(--color-primary-text)' }, p: 0.5 }}
                      />
                    }
                    label={
                      <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>
                        Considerar em Contas por Categoria
                      </Typography>
                    }
                    sx={{ ml: 0, gap: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editShowInCategorySummary}
                        onChange={(e) => setEditShowInCategorySummary(e.target.checked)}
                        sx={{ color: "var(--color-text-secondary, #7E8494)", '&.Mui-checked': { color: 'var(--color-primary-text)' }, p: 0.5 }}
                      />
                    }
                    label={
                      <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>
                        Considerar no Resumo das Categorias
                      </Typography>
                    }
                    sx={{ ml: 0, gap: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editShowInCategoryBalance}
                        onChange={(e) => setEditShowInCategoryBalance(e.target.checked)}
                        sx={{ color: "var(--color-text-secondary, #7E8494)", '&.Mui-checked': { color: 'var(--color-primary-text)' }, p: 0.5 }}
                      />
                    }
                    label={
                      <Typography sx={{ color: "var(--color-text-primary, #FFFFFF)", fontSize: '0.9rem', fontWeight: 500 }}>
                        Considerar no Balanço das Categorias
                      </Typography>
                    }
                    sx={{ ml: 0, gap: 1 }}
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
        </form>
      </Dialog>

      {/* COLOR PICKER POPOVER */}
      <ColorPickerPopover
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        value={catModalOpen ? newCatColor : subModalOpen ? newSubColor : editColor}
        onChange={(c) => {
          if (catModalOpen) setNewCatColor(c);
          else if (subModalOpen) setNewSubColor(c);
          else if (editModalOpen) setEditColor(c);
        }}
        presets={AVAILABLE_COLORS.map((col) => col.value)}
      />

      <CategoryIconPickerDialog
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={catModalOpen ? newCatIcon : subModalOpen ? newSubIcon : editIcon}
        onSelect={(iconValue) => {
          if (catModalOpen) setNewCatIcon(iconValue);
          else if (subModalOpen) setNewSubIcon(iconValue);
          else if (editModalOpen) setEditIcon(iconValue);
        }}
      />
    </Box>
  );
};

export default CategoriesPage;
