import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  Edit as EditIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

interface Movement {
  id: string;
  investmentId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  price: number;
  date: string;
  createdAt: string;
}

interface Investment {
  id: string;
  userId: string;
  name: string;
  type: string;
  averagePrice: number;
  quantity: number;
  currentValue: number;
  profitability: number;
  profitabilityPercentage: number;
  createdAt: string;
  updatedAt: string;
  movements: Movement[];
}

const INVESTMENT_TYPES = [
  { value: 'TESOURO_DIRETO', label: 'Tesouro Direto' },
  { value: 'CDB', label: 'CDB (Certificado de Depósito Bancário)' },
  { value: 'LCI', label: 'LCI (Letra de Crédito Imobiliário)' },
  { value: 'LCA', label: 'LCA (Letra de Crédito Agrícola)' },
  { value: 'CRI', label: 'CRI' },
  { value: 'CRA', label: 'CRA' },
  { value: 'STOCKS', label: 'Ações' },
  { value: 'FII', label: 'Fundos Imobiliários (FII)' },
  { value: 'ETF', label: 'ETFs' },
  { value: 'CRYPTO', label: 'Criptomoedas' },
  { value: 'OTHER', label: 'Outros' },
];

const Row: React.FC<{
  row: Investment;
  onAddMovement: (id: string) => void;
  onUpdateValue: (id: string, currentValue: number) => void;
  onDelete: (id: string) => void;
}> = ({ row, onAddMovement, onUpdateValue, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
          {row.name}
        </TableCell>
        <TableCell>
          {INVESTMENT_TYPES.find((t) => t.value === row.type)?.label || row.type}
        </TableCell>
        <TableCell align="right">
          {row.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}
        </TableCell>
        <TableCell align="right">
          R$ {row.averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </TableCell>
        <TableCell align="right">
          R$ {(row.quantity * row.averagePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </TableCell>
        <TableCell align="right">
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
            R$ {row.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            <IconButton size="small" onClick={() => onUpdateValue(row.id, row.currentValue)}>
              <EditIcon fontSize="small" sx={{ color: '#00D2FF', fontSize: '1rem' }} />
            </IconButton>
          </Box>
        </TableCell>
        <TableCell align="right">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 0.5,
              color: row.profitability >= 0 ? "var(--color-income, #10B981)" : "var(--color-expense, #EF4444)",
              fontWeight: 700,
            }}
          >
            {row.profitability >= 0 ? <ProfitIcon fontSize="small" /> : <LossIcon fontSize="small" />}
            {row.profitabilityPercentage.toFixed(2)}% (R$ {Math.abs(row.profitability).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
          </Box>
        </TableCell>
        <TableCell align="center">
          <Box display="flex" justifyContent="center" gap={1}>
            <Tooltip title="Registrar Compra/Venda/Rendimento">
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onAddMovement(row.id)}
                sx={{
                  py: 0.5,
                  borderColor: 'rgba(157, 78, 221, 0.5)',
                  color: '#9D4EDD',
                  '&:hover': {
                    borderColor: '#9D4EDD',
                    backgroundColor: 'rgba(157, 78, 221, 0.05)',
                  },
                }}
              >
                Movimentação
              </Button>
            </Tooltip>
            <IconButton color="error" size="small" onClick={() => onDelete(row.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="subtitle2" gutterBottom component="div" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon fontSize="small" sx={{ color: '#9D4EDD' }} /> Histórico de Movimentações
              </Typography>
              {row.movements && row.movements.length > 0 ? (
                <Table size="small" aria-label="purchases">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell align="right">Preço Unitário</TableCell>
                      <TableCell align="right">Valor Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {row.movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell component="th" scope="row">
                          {movement.date}
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              backgroundColor:
                                movement.type === 'BUY'
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : movement.type === 'SELL'
                                  ? 'rgba(239, 68, 68, 0.1)'
                                  : 'rgba(0, 210, 255, 0.1)',
                              color:
                                movement.type === 'BUY'
                                  ? "var(--color-income, #10B981)"
                                  : movement.type === 'SELL'
                                  ? "var(--color-expense, #EF4444)"
                                  : '#00D2FF',
                            }}
                          >
                            {movement.type === 'BUY' ? 'Compra' : movement.type === 'SELL' ? 'Venda' : 'Dividendos / Juros'}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {movement.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}
                        </TableCell>
                        <TableCell align="right">
                          R$ {movement.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell align="right">
                          R$ {(movement.quantity * movement.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  Nenhuma movimentação registrada para este investimento.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

const Investments: React.FC = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [valueOpen, setValueOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Selected entities
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);

  // Form states: Create
  const [name, setName] = useState('');
  const [type, setType] = useState('STOCKS');
  const [currentValue, setCurrentValue] = useState('');

  // Form states: Movement
  const [moveType, setMoveType] = useState<'BUY' | 'SELL' | 'DIVIDEND'>('BUY');
  const [moveQty, setMoveQty] = useState('');
  const [movePrice, setMovePrice] = useState('');
  const [moveDate, setMoveDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states: Current Value
  const [newValue, setNewValue] = useState('');

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/investments');
      setInvestments(res.data);
    } catch (err) {
      setError('Erro ao carregar investimentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/investments', {
        name,
        type,
        currentValue: currentValue ? parseFloat(currentValue) : 0,
      });
      setCreateOpen(false);
      setName('');
      setType('STOCKS');
      setCurrentValue('');
      fetchInvestments();
    } catch (err) {
      alert('Erro ao registrar investimento.');
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentId) return;

    try {
      await api.post(`/investments/${selectedInvestmentId}/movements`, {
        type: moveType,
        quantity: parseFloat(moveQty),
        price: parseFloat(movePrice),
        date: moveDate,
      });
      setMovementOpen(false);
      setMoveQty('');
      setMovePrice('');
      setMoveDate(new Date().toISOString().split('T')[0]);
      setMoveType('BUY');
      fetchInvestments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao registrar movimentação.');
    }
  };

  const handleUpdateValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentId) return;

    try {
      await api.put(`/investments/${selectedInvestmentId}/current-value`, null, {
        params: { currentValue: parseFloat(newValue) },
      });
      setValueOpen(false);
      setNewValue('');
      fetchInvestments();
    } catch (err) {
      alert('Erro ao atualizar cotação.');
    }
  };

  const handleDelete = async () => {
    if (!selectedInvestmentId) return;

    try {
      await api.delete(`/investments/${selectedInvestmentId}`);
      setDeleteOpen(false);
      fetchInvestments();
    } catch (err) {
      alert('Erro ao excluir investimento.');
    }
  };

  // Aggregated calculations
  const totalCost = investments.reduce((acc, curr) => acc + Number(curr.quantity || 0) * Number(curr.averagePrice || 0), 0);
  const totalCurrentValue = investments.reduce((acc, curr) => acc + Number(curr.currentValue || 0), 0);
  const totalProfitability = totalCurrentValue - totalCost;
  const profitabilityPercent = totalCost > 0 ? (totalProfitability / totalCost) * 100 : 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Cards de Desempenho */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 210, 255, 0.1)', color: '#00D2FF', borderRadius: 2 }}>
                <MoneyIcon />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Investido (Custo)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(157, 78, 221, 0.1)', color: '#9D4EDD', borderRadius: 2 }}>
                <MoneyIcon />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Valor de Mercado Atual</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#9D4EDD' }}>
                  R$ {totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: totalProfitability >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: totalProfitability >= 0 ? "var(--color-income, #10B981)" : "var(--color-expense, #EF4444)",
                  borderRadius: 2,
                }}
              >
                {totalProfitability >= 0 ? <ProfitIcon /> : <LossIcon />}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Rentabilidade Acumulada</Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: totalProfitability >= 0 ? "var(--color-income, #10B981)" : "var(--color-expense, #EF4444)",
                  }}
                >
                  {totalProfitability >= 0 ? '+' : ''}
                  {profitabilityPercent.toFixed(2)}% (R$ {totalProfitability.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Investimentos */}
      <Card sx={{ background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Minha Carteira de Investivos</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                background: 'linear-gradient(90deg, #00D2FF 0%, #9D4EDD 100%)',
                color: '#000',
                fontWeight: 700,
              }}
            >
              Novo Investimento
            </Button>
          </Box>

          {investments.length === 0 ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 6 }}>
              Nenhum ativo cadastrado. Comece adicionando seus investimentos!
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
              <Table aria-label="collapsible table">
                <TableHead sx={{ bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.02)" }}>
                  <TableRow>
                    <TableCell width={50} />
                    <TableCell>Ativo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Qtd.</TableCell>
                    <TableCell align="right">Preço Médio</TableCell>
                    <TableCell align="right">Valor de Custo</TableCell>
                    <TableCell align="right">Valor Atual</TableCell>
                    <TableCell align="right">Rentabilidade</TableCell>
                    <TableCell align="center" width={180}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {investments.map((inv) => (
                    <Row
                      key={inv.id}
                      row={inv}
                      onAddMovement={(id) => {
                        setSelectedInvestmentId(id);
                        setMovementOpen(true);
                      }}
                      onUpdateValue={(id, val) => {
                        setSelectedInvestmentId(id);
                        setNewValue(val.toString());
                        setValueOpen(true);
                      }}
                      onDelete={(id) => {
                        setSelectedInvestmentId(id);
                        setDeleteOpen(true);
                      }}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Novo Investimento */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle>Adicionar Novo Ativo</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome / Código do Ativo"
                  placeholder="Ex: PETR4, Tesouro Selic 2029"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Tipo de Investimento"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  {INVESTMENT_TYPES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Preço de Mercado Atual (Opcional)"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  inputProps={{ step: '0.01' }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Criar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog: Adicionar Movimentação */}
      <Dialog open={movementOpen} onClose={() => setMovementOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddMovement}>
          <DialogTitle>Registrar Movimentação</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Operação"
                  value={moveType}
                  onChange={(e) => setMoveType(e.target.value as any)}
                  required
                >
                  <MenuItem value="BUY">Compra (Aporte)</MenuItem>
                  <MenuItem value="SELL">Venda (Retirada)</MenuItem>
                  <MenuItem value="DIVIDEND">Dividendos / Rendimentos</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label={moveType === 'DIVIDEND' ? 'Quantidade de Cotas/Ações' : 'Quantidade'}
                  value={moveQty}
                  onChange={(e) => setMoveQty(e.target.value)}
                  inputProps={{ step: '0.000001' }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label={moveType === 'DIVIDEND' ? 'Valor por Cota/Ação' : 'Preço Unitário'}
                  value={movePrice}
                  onChange={(e) => setMovePrice(e.target.value)}
                  inputProps={{ step: '0.0001' }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data da Operação"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMovementOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" color="secondary">Registrar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog: Atualizar Cotação */}
      <Dialog open={valueOpen} onClose={() => setValueOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleUpdateValue}>
          <DialogTitle>Atualizar Valor Atual de Mercado</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Novo Valor Atual do Ativo"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  inputProps={{ step: '0.01' }}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setValueOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Atualizar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Deseja excluir este investimento?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta ação é irreversível e excluirá todo o histórico de compras, vendas e rendimentos associados a este ativo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Excluir</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Investments;
