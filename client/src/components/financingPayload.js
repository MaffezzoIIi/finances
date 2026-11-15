import { parseBRL } from '../utils/money.js';
import { parseRate } from '../utils/financing.js';

// Empty or zero -> 0; otherwise a valid BRL amount or null.
const optionalCents = (s) => (/^\s*(0+(,0{1,2})?)?\s*$/.test(s ?? '') ? 0 : parseBRL(s));

// Validates the simulator form. Returns { data } ready for the API/calculation or { error }.
// The name is only required to save, so it is checked by the caller.
export function toFinancingPayload(draft) {
  const balanceCents = parseBRL(draft.balance);
  const annualRateBps = parseRate(draft.rate);
  const monthlyPaymentCents = parseBRL(draft.payment);
  const monthlyFeesCents = optionalCents(draft.fees);
  const fgtsBalanceCents = optionalCents(draft.fgtsBalance);
  const fgtsMonthlyDepositCents = optionalCents(draft.fgtsDeposit);

  if (balanceCents === null) return { error: 'Informe o saldo devedor (ex.: 300.000,00).' };
  if (annualRateBps === null) return { error: 'Informe os juros ao ano entre 0 e 100 (ex.: 10,5).' };
  if (monthlyPaymentCents === null) return { error: 'Informe o pagamento mensal (ex.: 3.500,00).' };
  if (monthlyFeesCents === null) return { error: 'Informe um valor válido para seguros/taxas.' };
  if (monthlyFeesCents >= monthlyPaymentCents) return { error: 'As taxas não podem ser maiores que o pagamento.' };
  if (fgtsBalanceCents === null) return { error: 'Informe um saldo de FGTS válido.' };
  if (fgtsMonthlyDepositCents === null) return { error: 'Informe um depósito de FGTS válido.' };

  return {
    data: {
      name: draft.name.trim(),
      balanceCents,
      annualRateBps,
      monthlyPaymentCents,
      monthlyFeesCents,
      fgtsBalanceCents,
      fgtsMonthlyDepositCents,
    },
  };
}
