import { Box } from '@mui/material';
import { transactionDescription } from '../utils/transactionDescription';

export default function TransactionDescriptionText({ description }: { description: string }) {
  const text = transactionDescription(description);
  const installment = text.match(/^(.*)\s+(\d+\/\d+)$/);
  if (!installment) return text;

  return <>{installment[1]}{' '}<Box component="span" sx={{ ml: 1, whiteSpace: 'nowrap' }}>{installment[2]}</Box></>;
}
