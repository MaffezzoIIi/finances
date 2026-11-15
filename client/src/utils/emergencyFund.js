import { addMonths } from './financing.js';

export function monthsBetween(fromYm, toYm) {
  const [fy, fm] = fromYm.split('-').map(Number);
  const [ty, tm] = toYm.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function endMonthFromRemaining(currentMonth, remaining) {
  return addMonths(currentMonth, remaining);
}

export function getAverageWindow(expenses, currentMonth, count = 3) {
  const activeMonths = new Set(expenses.map((e) => e.date.slice(0, 7)));
  const window = [];
  for (let i = 1; i <= count; i++) {
    const ym = addMonths(currentMonth, -i);
    if (activeMonths.has(ym)) window.push(ym);
  }
  return window;
}

export function buildEssentialBreakdown(expenses, categories, essentialCategoryIds, windowMonths) {
  const count = windowMonths.length;
  const essentialSet = new Set(essentialCategoryIds);
  const windowSet = new Set(windowMonths);
  const totals = new Map();

  for (const e of expenses) {
    if (!essentialSet.has(e.categoryId)) continue;
    if (!windowSet.has(e.date.slice(0, 7))) continue;
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amountCents);
  }

  return categories
    .filter((c) => essentialSet.has(c.id))
    .map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      monthlyAvgCents: count > 0 ? Math.round((totals.get(c.id) ?? 0) / count) : 0,
    }))
    .sort((a, b) => b.monthlyAvgCents - a.monthlyAvgCents || a.categoryName.localeCompare(b.categoryName));
}

export function debtInstallmentsInHorizon(debt, currentMonth, horizonMonths) {
  if (!debt.endMonth) return horizonMonths;
  const remaining = Math.max(0, monthsBetween(currentMonth, debt.endMonth));
  return Math.min(remaining, horizonMonths);
}

export function computeEmergencyFund({
  expenses,
  categories,
  debts,
  essentialCategoryIds,
  months,
  savedCents,
  currentMonth,
}) {
  const windowMonths = getAverageWindow(expenses, currentMonth);
  const breakdown = buildEssentialBreakdown(expenses, categories, essentialCategoryIds, windowMonths);

  let essentialTotalCents = 0;
  if (windowMonths.length > 0) {
    const essentialSet = new Set(essentialCategoryIds);
    const windowSet = new Set(windowMonths);
    for (const e of expenses) {
      if (essentialSet.has(e.categoryId) && windowSet.has(e.date.slice(0, 7))) {
        essentialTotalCents += e.amountCents;
      }
    }
  }

  const essentialAvgCents = windowMonths.length > 0
    ? Math.round(essentialTotalCents / windowMonths.length)
    : 0;

  let debtsInHorizonCents = 0;
  for (const d of debts) {
    debtsInHorizonCents += d.monthlyPaymentCents * debtInstallmentsInHorizon(d, currentMonth, months);
  }

  const targetCents = essentialAvgCents * months + debtsInHorizonCents;
  const missingCents = Math.max(0, targetCents - savedCents);
  const percent = targetCents > 0
    ? Math.min(100, Math.round((savedCents / targetCents) * 1000) / 10)
    : (savedCents > 0 ? 100 : 0);

  return {
    windowMonths,
    breakdown,
    essentialAvgCents,
    debtsInHorizonCents,
    targetCents,
    missingCents,
    percent,
  };
}
