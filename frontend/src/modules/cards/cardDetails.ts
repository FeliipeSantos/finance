import { roundCurrency } from '../../utils/currency';

export interface DetailCard {
  id: string;
  name: string;
  bank: string;
  brand: string;
  color?: string;
  customIconUrl?: string;
  accountId?: string;
  limitTotal: number;
  initialInvoice?: number;
  closingDay: number;
  dueDay: number;
}

export interface DetailTransaction {
  id: string;
  recurrenceGroupId?: string;
  creditCardId?: string;
  categoryId?: string;
  description: string;
  value: number;
  date: string;
  dueDate?: string;
  effectiveDate?: string;
  effective: boolean;
}

export interface DetailCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  parentCategoryId?: string;
}

export const invoiceDate = (tx: DetailTransaction) =>
  tx.effective && tx.effectiveDate ? tx.effectiveDate : tx.dueDate || tx.date;

export const invoiceItems = (transactions: DetailTransaction[], month: number, year: number) =>
  transactions.filter((tx) => {
    const [y, m] = invoiceDate(tx).split('-').map(Number);
    return y === year && m === month;
  });

export const totalValue = (transactions: DetailTransaction[]) =>
  roundCurrency(transactions.reduce((sum, tx) => sum + Number(tx.value || 0), 0));

export const invoicePaid = (transactions: DetailTransaction[]) =>
  transactions.length > 0 && transactions.every((tx) => tx.effective);

export function categoryRanking(transactions: DetailTransaction[], categories: DetailCategory[]) {
  const grouped = new Map<string, { category: DetailCategory; total: number }>();
  transactions.filter((tx) => Number(tx.value) > 0).forEach((tx) => {
    const selected = categories.find((category) => category.id === tx.categoryId);
    const category = (selected?.parentCategoryId ? categories.find((item) => item.id === selected.parentCategoryId) : selected)
      || selected || { id: 'uncategorized', name: 'Sem categoria', color: '#7E8494' };
    const row = grouped.get(category.id) || { category, total: 0 };
    row.total = roundCurrency(row.total + Number(tx.value));
    grouped.set(category.id, row);
  });
  const total = [...grouped.values()].reduce((sum, row) => sum + row.total, 0);
  return [...grouped.values()].sort((a, b) => b.total - a.total)
    .map((row) => ({ ...row, percentage: total ? row.total / total * 100 : 0 }));
}

export function dailyStatement(transactions: DetailTransaction[]) {
  const groups = new Map<string, DetailTransaction[]>();
  transactions.forEach((tx) => groups.set(tx.date, [...(groups.get(tx.date) || []), tx]));
  let remaining = totalValue(transactions);
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => {
    const subtotal = totalValue(items);
    const balance = remaining;
    remaining = roundCurrency(remaining - subtotal);
    return { date, items, subtotal, balance };
  });
}
