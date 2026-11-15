import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthsBetween,
  endMonthFromRemaining,
  getAverageWindow,
  buildEssentialBreakdown,
  debtInstallmentsInHorizon,
  computeEmergencyFund,
} from './emergencyFund.js';

const cats = [
  { id: 1, name: 'Moradia' },
  { id: 2, name: 'Alimentação' },
  { id: 3, name: 'Lazer' },
];

test('monthsBetween and endMonthFromRemaining', () => {
  assert.equal(monthsBetween('2026-11', '2027-03'), 4);
  assert.equal(monthsBetween('2026-11', '2026-11'), 0);
  assert.equal(monthsBetween('2026-11', '2026-09'), -2);
  assert.equal(endMonthFromRemaining('2026-11', 4), '2027-03');
});

test('getAverageWindow skips current month and empty months', () => {
  const expenses = [
    { date: '2026-11-05', categoryId: 1, amountCents: 100000 }, // current month: ignored
    { date: '2026-10-10', categoryId: 1, amountCents: 100000 },
    // 2026-09 has no expenses: skipped
    { date: '2026-08-15', categoryId: 2, amountCents: 50000 },
    { date: '2026-07-01', categoryId: 1, amountCents: 100000 }, // outside 3-month lookback
  ];
  assert.deepEqual(getAverageWindow(expenses, '2026-11'), ['2026-10', '2026-08']);
});

test('debtInstallmentsInHorizon caps at remaining and handles ongoing/paid-off', () => {
  assert.equal(debtInstallmentsInHorizon({ endMonth: null }, '2026-11', 6), 6);
  assert.equal(debtInstallmentsInHorizon({ endMonth: '2027-01' }, '2026-11', 6), 2);
  assert.equal(debtInstallmentsInHorizon({ endMonth: '2027-10' }, '2026-11', 6), 6);
  assert.equal(debtInstallmentsInHorizon({ endMonth: '2026-10' }, '2026-11', 6), 0);
});

test('computeEmergencyFund combines essential average and debts in horizon', () => {
  const expenses = [
    { date: '2026-10-01', categoryId: 1, amountCents: 200000 },
    { date: '2026-10-02', categoryId: 3, amountCents: 999999 }, // Lazer not essential
    { date: '2026-09-01', categoryId: 1, amountCents: 200000 },
    { date: '2026-09-02', categoryId: 2, amountCents: 100000 },
  ];
  const debts = [
    { id: 1, name: 'Carro', monthlyPaymentCents: 100000, endMonth: '2027-01' }, // 2 left
    { id: 2, name: 'Consignado', monthlyPaymentCents: 50000, endMonth: null }, // ongoing -> 6
  ];
  const res = computeEmergencyFund({
    expenses,
    categories: cats,
    debts,
    essentialCategoryIds: [1, 2],
    months: 6,
    savedCents: 500000,
    currentMonth: '2026-11',
  });

  // Essential total across 2026-10 and 2026-09: 2000 + 3000 = 5000 -> avg 2500/month
  assert.equal(res.essentialAvgCents, 250000);
  // Debts: 2 * 1000 + 6 * 500 = 5000
  assert.equal(res.debtsInHorizonCents, 500000);
  // Target: 6 * 2500 + 5000 = 20000
  assert.equal(res.targetCents, 2000000);
  assert.equal(res.missingCents, 1500000);
  assert.equal(res.percent, 25);
  assert.equal(res.breakdown.length, 2);
});

test('buildEssentialBreakdown returns 0 when window is empty', () => {
  const res = buildEssentialBreakdown([], cats, [1, 2], []);
  assert.deepEqual(res.map((r) => r.monthlyAvgCents), [0, 0]);
});
