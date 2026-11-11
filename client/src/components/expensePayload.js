import { parseBRL } from '../utils/money.js';

// Shared by the create form and the inline edit row.
// Returns { data } ready for the API or { error } with a user-facing message.
export function toExpensePayload(draft) {
  const amountCents = parseBRL(draft.amount);
  if (!draft.description.trim()) return { error: 'Informe a descrição.' };
  if (amountCents === null) return { error: 'Informe um valor válido (ex.: 12,50).' };
  if (!draft.date) return { error: 'Informe a data.' };
  if (!draft.categoryId) return { error: 'Escolha uma categoria.' };
  if (!draft.paymentMethodId) return { error: 'Escolha a forma de pagamento.' };
  return {
    data: {
      description: draft.description.trim(),
      amountCents,
      date: draft.date,
      categoryId: Number(draft.categoryId),
      paymentMethodId: Number(draft.paymentMethodId),
    },
  };
}
