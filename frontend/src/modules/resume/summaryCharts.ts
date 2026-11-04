import { roundCurrency } from '../../utils/currency';

interface ChartTransaction {
  type: string;
  value: number;
  date: string;
  dueDate?: string;
  effectiveDate?: string;
  effective: boolean;
  categoryId: string;
}

interface ChartCategory {
  id: string;
  name: string;
  parentCategoryId?: string;
  icon?: string;
  color?: string;
}

export function buildSummaryCharts(transactions: ChartTransaction[], categories: ChartCategory[], month: number, year: number) {
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 6 + index, 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      name: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      Receitas: 0,
      Despesas: 0,
    };
  });
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, { name: string; icon?: string; color?: string; value: number }>();

  transactions.forEach((transaction) => {
    const date = transaction.effective && transaction.effectiveDate
      ? transaction.effectiveDate : transaction.dueDate || transaction.date;
    const [transactionYear, transactionMonth] = date.split('-').map(Number);
    const period = monthly.find((item) => item.year === transactionYear && item.month === transactionMonth);
    const value = Number(transaction.value || 0);
    if (period && transaction.type === 'REVENUE') period.Receitas += value;
    if (period && transaction.type === 'EXPENSE') period.Despesas += value;

    if (transaction.type !== 'EXPENSE' || transactionMonth !== month || transactionYear !== year) return;
    let category = categoryMap.get(transaction.categoryId);
    const visited = new Set<string>();
    while (category?.parentCategoryId && !visited.has(category.id)) {
      visited.add(category.id);
      const parent = categoryMap.get(category.parentCategoryId);
      if (!parent) break;
      category = parent;
    }
    const id = category?.id || 'uncategorized';
    const entry = totals.get(id) || { name: category?.name || 'Sem categoria', icon: category?.icon, color: category?.color, value: 0 };
    entry.value += value;
    totals.set(id, entry);
  });

  const expenses = [...totals.entries()]
    .map(([id, entry]) => ({ id, ...entry, value: roundCurrency(entry.value) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = expenses.reduce((sum, entry) => sum + entry.value, 0);
  return {
    monthly: monthly.map((period) => ({ ...period, Receitas: roundCurrency(period.Receitas), Despesas: roundCurrency(period.Despesas) })),
    ranking: expenses.map((entry) => ({ ...entry, percent: entry.value / total * 100 })),
  };
}
