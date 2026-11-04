import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  ButtonGroup,
} from '@mui/material';
import {
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalanceWallet as NetWorthIcon,
  GetApp as DownloadIcon,
  PieChart as CategoryIcon,
  BarChart as AccountIcon,
  ShowChart as FlowIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface CategoryReportItem {
  categoryName: string;
  value: number;
  color: string;
  percentage: number;
}

interface AccountReportItem {
  accountName: string;
  balance: number;
  color: string;
}

interface CashFlowReportItem {
  month: string;
  revenues: number;
  expenses: number;
  balance: number;
}

interface InvestmentReportItem {
  investmentName: string;
  type: string;
  averagePrice: number;
  quantity: number;
  costValue: number;
  currentValue: number;
  profitability: number;
  profitabilityPercentage: number;
}

interface DashboardReport {
  totalBalance: number;
  totalInvested: number;
  totalNetWorth: number;
  monthlyRevenues: number;
  monthlyExpenses: number;
  monthlySavings: number;
  expensesByCategory: CategoryReportItem[];
  balanceByAccount: AccountReportItem[];
  cashFlow: CashFlowReportItem[];
  investments: InvestmentReportItem[];
}

const COLORS = ['#00D2FF', '#9D4EDD', '#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#EC4899', '#6366F1'];

const Reports: React.FC = () => {
  const [data, setData] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      setData(res.data);
    } catch (err) {
      setError('Erro ao carregar relatórios gráficos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const responseType = format === 'csv' ? 'text' : 'blob';
      const res = await api.get(`/reports/export/${format}`, { responseType: responseType as any });
      
      const mimeTypes = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
      };
      
      const extensions = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

      const blob = format === 'csv' ? new Blob([res.data], { type: mimeTypes[format] }) : res.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.${extensions[format]}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao gerar exportação.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!data) {
    return <Alert severity="warning">Nenhum dado disponível para relatórios.</Alert>;
  }

  // Group investments by type for the pie chart
  const investmentsByTypeMap = data.investments.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + Number(curr.currentValue || 0);
    return acc;
  }, {} as Record<string, number>);

  const investmentChartData = Object.entries(investmentsByTypeMap).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }));

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Seção de Título & Exportações */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--color-text-primary, #FFF)" }}>
          Painel de Relatórios Analíticos
        </Typography>
        
        <ButtonGroup variant="contained" aria-label="outlined primary button group">
          <Button
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
            sx={{ bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)", color: "var(--color-text-primary, #FFF)", '&:hover': { bgcolor: "rgba(var(--color-overlay-rgb, 255, 255, 255), 0.1)" } }}
          >
            Exportar CSV
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('excel')}
            sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: "var(--color-income, #10B981)", '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)' } }}
          >
            Excel (XLSX)
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('pdf')}
            sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: "var(--color-expense, #EF4444)", '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}
          >
            Relatório PDF
          </Button>
        </ButtonGroup>
      </Box>

      {/* Grid de Balanço */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(0, 210, 255, 0.1)', color: '#00D2FF' }}>
                <NetWorthIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">Patrimônio Líquido</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  R$ {data.totalNetWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: "var(--color-income, #10B981)" }}>
                <IncomeIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">Receitas (Mês Atual)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--color-income, #10B981)" }}>
                  R$ {data.monthlyRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: "var(--color-expense, #EF4444)" }}>
                <ExpenseIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">Despesas (Mês Atual)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--color-expense, #EF4444)" }}>
                  R$ {data.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos Principais */}
      <Grid container spacing={3}>
        {/* Fluxo de Caixa Anual */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400, mb: 3, background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <FlowIcon sx={{ color: '#00D2FF' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Fluxo de Caixa Anual (Receitas x Despesas)</Typography>
              </Box>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={data.cashFlow} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenues" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" />
                  <XAxis dataKey="month" stroke="var(--color-text-secondary, #9CA3AF)" />
                  <YAxis stroke="var(--color-text-secondary, #9CA3AF)" />
                  <Tooltip contentStyle={{ background: '#111827', border: "1px solid var(--color-border)" }} />
                  <Area type="monotone" dataKey="revenues" name="Receitas" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenues)" />
                  <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Despesas por Categoria */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400, mb: 3, background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CategoryIcon sx={{ color: '#9D4EDD' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Gastos por Categoria</Typography>
              </Box>
              {data.expensesByCategory.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="75%">
                  <Typography variant="body2" color="text.secondary">Nenhuma despesa registrada neste mês.</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={data.expensesByCategory}
                      dataKey="value"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label={({ categoryName, percentage }) => `${categoryName} (${percentage.toFixed(0)}%)`}
                    >
                      {data.expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: "1px solid var(--color-border)" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Saldos por Conta */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 350, background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AccountIcon sx={{ color: "var(--color-income, #10B981)" }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Distribuição de Saldo por Conta</Typography>
              </Box>
              {data.balanceByAccount.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="75%">
                  <Typography variant="body2" color="text.secondary">Nenhuma conta ativa cadastrada.</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={data.balanceByAccount}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-overlay-rgb, 255, 255, 255), 0.05)" />
                    <XAxis dataKey="accountName" stroke="var(--color-text-secondary, #9CA3AF)" />
                    <YAxis stroke="var(--color-text-secondary, #9CA3AF)" />
                    <Tooltip contentStyle={{ background: '#111827', border: "1px solid var(--color-border)" }} />
                    <Bar dataKey="balance" name="Saldo (R$)">
                      {data.balanceByAccount.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alocação de Investimentos */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 350, background: 'rgba(17, 24, 39, 0.7)', border: "1px solid var(--color-border)" }}>
            <CardContent sx={{ height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CategoryIcon sx={{ color: '#00D2FF' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Alocação por Tipo de Ativo</Typography>
              </Box>
              {investmentChartData.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="75%">
                  <Typography variant="body2" color="text.secondary">Nenhum investimento cadastrado.</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={investmentChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      fill="#8884d8"
                      label={({ name }) => name}
                    >
                      {investmentChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: "1px solid var(--color-border)" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
