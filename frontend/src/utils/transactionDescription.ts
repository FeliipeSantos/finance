// Fixed recurrence is stored in the legacy description suffix. Keep the
// original value in API requests; hide only the display marker.
const fixedSuffix = /\s*\[Fix[ao]\]\s*$/i;

export const isFixedTransaction = (description: string) => fixedSuffix.test(description);

export const transactionDescription = (description: string) => description.replace(fixedSuffix, '').trim();

const installmentSuffix = /\s+(\d+\/\d+)\s*$/;
export const isInstallmentTransaction = (description: string) => installmentSuffix.test(description);

export const editableTransactionDescription = (description: string) =>
  transactionDescription(description).replace(installmentSuffix, '').trim();

// Recurrence markers belong to the saved transaction, never to the editable
// description. Restore the original marker even if another number was typed.
export const restoreTransactionDescription = (description: string, original: string) => {
  const installment = original.match(installmentSuffix);
  if (installment) return `${description.replace(installmentSuffix, '').trim()} ${installment[1]}`;
  if (isFixedTransaction(original)) {
    const marker = original.match(/\[Fix[ao]\]\s*$/i)![0].trim();
    return `${transactionDescription(description)} ${marker}`;
  }
  return description;
};
