import { roundCurrency } from '../../utils/currency';

interface Account { id: string; balanceInitial: number }
interface Transaction {
  accountId?: string; destinationAccountId?: string; creditCardId?: string;
  type: string; value: number; date: string; dueDate?: string; effectiveDate?: string; effective?: boolean;
}
interface Card { id: string; accountId?: string | null }

export function accountMonthSummary(account: Account, transactions: Transaction[], cards: Card[], month: number, year: number) {
  const period = year * 12 + month;
  let opening = Number(account.balanceInitial || 0);
  let effectiveDuring = 0;
  let pending = 0;
  let revenues = 0;
  let expenses = 0;
  let transfersIn = 0;
  let transfersOut = 0;
  for (const tx of transactions) {
    const date = tx.effective && tx.effectiveDate ? tx.effectiveDate : tx.dueDate || tx.date;
    const [txYear, txMonth] = (date || '').split('-').map(Number);
    if (!txYear || !txMonth) continue;
    const txPeriod = txYear * 12 + txMonth;
    if (txPeriod > period) continue;
    const accountId = cards.find((card) => card.id === tx.creditCardId)?.accountId || tx.accountId;
    const value = Number(tx.value || 0);
    const source = accountId === account.id;
    const destination = tx.destinationAccountId === account.id;
    let delta = 0;
    if (source && tx.type === 'REVENUE') delta += value;
    if (source && (tx.type === 'EXPENSE' || tx.type === 'TRANSFER')) delta -= value;
    if (destination && tx.type === 'TRANSFER') delta += value;
    if (tx.effective) {
      if (txPeriod < period) opening += delta;
      else effectiveDuring += delta;
    } else pending += delta;
    if (txPeriod !== period) continue;
    if (source && tx.type === 'REVENUE') revenues += value;
    if (source && tx.type === 'EXPENSE') expenses += value;
    if (source && tx.type === 'TRANSFER') transfersOut += value;
    if (destination && tx.type === 'TRANSFER') transfersIn += value;
  }
  return {
    opening: roundCurrency(opening), balance: roundCurrency(opening + effectiveDuring),
    forecast: roundCurrency(opening + effectiveDuring + pending),
    revenues: roundCurrency(revenues), expenses: roundCurrency(expenses),
    transfersIn: roundCurrency(transfersIn), transfersOut: roundCurrency(transfersOut),
  };
}
