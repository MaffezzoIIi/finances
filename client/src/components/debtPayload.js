import { parseBRL } from '../utils/money.js';
import { endMonthFromRemaining } from '../utils/emergencyFund.js';

export function toDebtPayload(draft, currentMonth) {
  const name = draft.name.trim();
  if (!name) return { error: 'Informe o nome da dívida.' };

  const monthlyPaymentCents = parseBRL(draft.payment);
  if (!monthlyPaymentCents) return { error: 'Informe uma parcela mensal válida (ex.: 450,00).' };

  const rawRemaining = String(draft.remaining ?? '').trim();
  let endMonth = null;
  if (rawRemaining !== '') {
    const n = Number(rawRemaining);
    if (!Number.isInteger(n) || n < 0 || n > 600) {
      return { error: 'Parcelas restantes deve ser um número inteiro (ou vazio para contínua).' };
    }
    endMonth = endMonthFromRemaining(currentMonth, n);
  }

  return { data: { name, monthlyPaymentCents, endMonth } };
}
