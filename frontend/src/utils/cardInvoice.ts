export interface CardBillingInfo {
  closingDay: number;
  dueDay: number;
}

export interface InvoicePeriod {
  closingDate: Date;
  dueDate: Date;
}

// Ambas as datas são ancoradas no mês/ano exibido na tela (que corresponde ao
// mês de vencimento, já que é assim que as transações de cartão já são
// filtradas hoje via effectiveDate/dueDate). Se o dia de fechamento for maior
// que o dia de vencimento (ex.: fecha dia 25, vence dia 5), o fechamento cai
// no mês anterior ao vencimento; senão, fica no mesmo mês.
// Simplificação: ignora dynamicClosing/dueBusinessDays (ajuste de dia útil).
export const getInvoicePeriod = (card: CardBillingInfo, dueMonth: number, dueYear: number): InvoicePeriod => {
  const dueDate = new Date(dueYear, dueMonth - 1, card.dueDay);

  let closingMonth = dueMonth;
  let closingYear = dueYear;
  if (card.closingDay > card.dueDay) {
    closingMonth -= 1;
    if (closingMonth < 1) {
      closingMonth = 12;
      closingYear -= 1;
    }
  }
  const closingDate = new Date(closingYear, closingMonth - 1, card.closingDay);

  return { closingDate, dueDate };
};

export const isInvoiceClosed = (closingDate: Date, today: Date = new Date()): boolean => today >= closingDate;

export interface UpcomingInvoiceOption {
  dueDateISO: string; // 'YYYY-MM-DD', ancorado no dia de vencimento do cartão
  month: number;
  year: number;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const nextMonth = (month: number, year: number): { month: number; year: number } =>
  month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };

export const prevMonth = (month: number, year: number): { month: number; year: number } =>
  month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };

const toOption = (card: CardBillingInfo, month: number, year: number): UpcomingInvoiceOption => {
  const { dueDate } = getInvoicePeriod(card, month, year);
  return {
    dueDateISO: `${dueDate.getFullYear()}-${pad2(dueDate.getMonth() + 1)}-${pad2(dueDate.getDate())}`,
    month,
    year,
  };
};

// Primeira fatura ainda aberta (que não fechou até referenceDate) — é para
// ela que uma despesa nova do cartão é lançada por padrão.
export const getFirstOpenInvoice = (
  card: CardBillingInfo,
  referenceDate: Date = new Date()
): UpcomingInvoiceOption => {
  let month = referenceDate.getMonth() + 1;
  let year = referenceDate.getFullYear();

  while (isInvoiceClosed(getInvoicePeriod(card, month, year).closingDate, referenceDate)) {
    ({ month, year } = nextMonth(month, year));
  }

  return toOption(card, month, year);
};

// Faturas selecionáveis para lançar uma despesa: `monthsBack` faturas antes
// da primeira ainda aberta (para reclassificar um lançamento numa fatura já
// fechada) e `monthsForward` a partir dela (incluindo-a) — cobre lançar em
// faturas futuras, não só na do mês corrente/seguinte.
export const getInvoiceOptions = (
  card: CardBillingInfo,
  referenceDate: Date = new Date(),
  monthsBack = 12,
  monthsForward = 12
): UpcomingInvoiceOption[] => {
  const anchor = getFirstOpenInvoice(card, referenceDate);

  let month = anchor.month;
  let year = anchor.year;
  for (let i = 0; i < monthsBack; i++) {
    ({ month, year } = prevMonth(month, year));
  }

  const options: UpcomingInvoiceOption[] = [];
  for (let i = 0; i < monthsBack + monthsForward; i++) {
    options.push(toOption(card, month, year));
    ({ month, year } = nextMonth(month, year));
  }
  return options;
};
