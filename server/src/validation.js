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
