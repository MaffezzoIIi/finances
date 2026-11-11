export const PALETTE = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function formatMonthShort(ym) {
  const [y, m] = ym.split('-');
  return `${MONTHS_SHORT[Number(m) - 1]}/${y.slice(2)}`;
}

export function formatMonthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MONTHS_FULL[Number(m) - 1]} ${y}`;
}

export function getAvailableMonths(expenses) {
  const set = new Set(expenses.map((e) => e.date.slice(0, 7)));
  return [...set].sort().reverse();
}

export function buildCategoryBreakdown(expenses, month = 'all') {
  const filtered = month === 'all' ? expenses : expenses.filter((e) => e.date.slice(0, 7) === month);
  const totalCents = filtered.reduce((sum, e) => sum + e.amountCents, 0);
  if (totalCents === 0) return { totalCents: 0, items: [] };

  const byCat = new Map();
  for (const e of filtered) {
    byCat.set(e.categoryName, (byCat.get(e.categoryName) ?? 0) + e.amountCents);
  }

  const items = [...byCat.entries()]
    .map(([categoryName, amountCents]) => ({ categoryName, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .map((item, idx) => ({
      ...item,
      percent: Math.round((item.amountCents / totalCents) * 1000) / 10,
      color: PALETTE[idx % PALETTE.length],
    }));

  return { totalCents, items };
}

export function buildMonthlySeries(expenses, refMonth, count = 6) {
  const [refY, refM] = refMonth.split('-').map(Number);
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(refY, refM - 1 - i, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    months.push(ym);
  }

  const sums = new Map(months.map((m) => [m, 0]));
  for (const e of expenses) {
    const ym = e.date.slice(0, 7);
    if (sums.has(ym)) sums.set(ym, sums.get(ym) + e.amountCents);
  }

  const maxCents = Math.max(0, ...sums.values());
  return months.map((month) => {
    const amountCents = sums.get(month);
    return {
      month,
      label: formatMonthShort(month),
      amountCents,
      heightPercent: maxCents > 0 ? Math.round((amountCents / maxCents) * 100) : 0,
    };
  });
}
