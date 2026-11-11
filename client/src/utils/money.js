// "1.234,56" -> 123456 ; returns null for invalid or non-positive values.
export function parseBRL(input) {
  const s = String(input ?? '').trim().replace(/^R\$\s*/, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(Number(s.replace(/\./g, '').replace(',', '.')) * 100);
  return cents > 0 ? cents : null;
}

// 123456 -> "1234,56" (value for editable inputs)
export const centsToInput = (cents) => (cents / 100).toFixed(2).replace('.', ',');

// 123456 -> "R$ 1.234,56"
export const formatBRL = (cents) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// "2026-11-04" -> "04/11/2026"
export const formatDate = (iso) => iso.split('-').reverse().join('/');

// Today's date in local time as "YYYY-MM-DD"
export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
