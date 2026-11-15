export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateName(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw new HttpError(400, 'O nome é obrigatório.');
  if (name.length > 50) throw new HttpError(400, 'O nome deve ter no máximo 50 caracteres.');
  return name;
}

export function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function exists(db, table, id) {
  return Number.isInteger(id) && !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
}

export function validateExpense(db, body = {}) {
  const errors = [];
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const { amountCents, date, categoryId, paymentMethodId } = body;

  if (!description) errors.push('A descrição é obrigatória.');
  else if (description.length > 200) errors.push('A descrição deve ter no máximo 200 caracteres.');
  if (!Number.isInteger(amountCents) || amountCents <= 0) errors.push('O valor deve ser maior que zero.');
  if (!isValidDate(date)) errors.push('Data inválida.');
  if (!exists(db, 'categories', categoryId)) errors.push('Categoria inválida.');
  if (!exists(db, 'payment_methods', paymentMethodId)) errors.push('Forma de pagamento inválida.');

  if (errors.length) throw new HttpError(400, errors.join(' '));
  return { description, amountCents, date, categoryId, paymentMethodId };
}

const isCents = (v, min) => Number.isInteger(v) && v >= min;

export function validateSimulation(body = {}) {
  const errors = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const {
    balanceCents, annualRateBps, monthlyPaymentCents,
    monthlyFeesCents = 0, fgtsBalanceCents = 0, fgtsMonthlyDepositCents = 0,
  } = body;

  if (!name) errors.push('O nome é obrigatório.');
  else if (name.length > 100) errors.push('O nome deve ter no máximo 100 caracteres.');
  if (!isCents(balanceCents, 1)) errors.push('O saldo devedor deve ser maior que zero.');
  if (!Number.isInteger(annualRateBps) || annualRateBps < 0 || annualRateBps > 10000) {
    errors.push('A taxa de juros deve ser entre 0% e 100% ao ano.');
  }
  if (!isCents(monthlyPaymentCents, 1)) errors.push('O pagamento mensal deve ser maior que zero.');
  if (!isCents(monthlyFeesCents, 0)) errors.push('Seguros/taxas inválidos.');
  else if (monthlyFeesCents >= monthlyPaymentCents) errors.push('As taxas não podem ser maiores que o pagamento.');
  if (!isCents(fgtsBalanceCents, 0)) errors.push('Saldo do FGTS inválido.');
  if (!isCents(fgtsMonthlyDepositCents, 0)) errors.push('Depósito mensal do FGTS inválido.');

  if (errors.length) throw new HttpError(400, errors.join(' '));
  return {
    name, balanceCents, annualRateBps, monthlyPaymentCents,
    monthlyFeesCents, fgtsBalanceCents, fgtsMonthlyDepositCents,
  };
}
