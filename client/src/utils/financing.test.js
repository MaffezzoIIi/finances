import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonths, bpsToInput, formatDuration, parseRate, simulateFinancing, toYearlyRows,
} from './financing.js';
import { toFinancingPayload } from '../components/financingPayload.js';

const base = {
  balanceCents: 100000,
  annualRateBps: 0,
  monthlyPaymentCents: 1000,
  monthlyFeesCents: 0,
  fgtsBalanceCents: 0,
  fgtsMonthlyDepositCents: 0,
};

test('0% interest pays off in balance / payment months', () => {
  const r = simulateFinancing(base);
  assert.equal(r.paidOff, true);
  assert.equal(r.months, 100);
  assert.equal(r.totalInterestCents, 0);
  assert.equal(r.totalPaidCents, 100000);
  assert.equal(r.series.at(-1).balanceCents, 0);
});

test('fees are paid on top and do not amortize', () => {
  const r = simulateFinancing({ ...base, monthlyPaymentCents: 1100, monthlyFeesCents: 100 });
  assert.equal(r.months, 100);
  assert.equal(r.totalPaidCents, 110000);
});

test('paying the Price installment for 360 months pays off in ~360 months', () => {
  const B = 30000000;
  const i = 1.12 ** (1 / 12) - 1;
  const pmt = Math.ceil((B * i) / (1 - (1 + i) ** -360));
  const r = simulateFinancing({ ...base, balanceCents: B, annualRateBps: 1200, monthlyPaymentCents: pmt });
  assert.equal(r.paidOff, true);
  assert.ok(r.months >= 359 && r.months <= 360, `months=${r.months}`);
  assert.ok(r.totalInterestCents > 0);
});

test('current FGTS is used at month 0 and shortens the term', () => {
  const r = simulateFinancing({ ...base, fgtsBalanceCents: 50000 });
  assert.equal(r.series[0].fgtsCents, 50000);
  assert.equal(r.fgtsUsedCents, 50000);
  assert.equal(r.months, 50);

  const off = simulateFinancing({ ...base, fgtsBalanceCents: 50000 }, { useFgts: false });
  assert.equal(off.months, 100);
  assert.equal(off.fgtsUsedCents, 0);
});

test('FGTS bigger than the balance pays it off immediately', () => {
  const r = simulateFinancing({ ...base, fgtsBalanceCents: 999999 });
  assert.equal(r.paidOff, true);
  assert.equal(r.months, 0);
  assert.equal(r.fgtsUsedCents, 100000);
});

test('monthly FGTS deposits are applied only every 24 months', () => {
  const sim = { ...base, balanceCents: 30000000, annualRateBps: 1050, monthlyPaymentCents: 350000, fgtsMonthlyDepositCents: 40000 };
  const r = simulateFinancing(sim);
  const used = r.series.filter((p) => p.fgtsCents > 0).map((p) => p.month);
  assert.ok(used.length > 0);
  assert.ok(used.every((m) => m > 0 && m % 24 === 0), used.join(','));
  assert.equal(used[0], 24);
  // 24 deposits plus 3% a.a. yield, a bit above 24 x 400
  assert.ok(r.series[24].fgtsCents > 960000 && r.series[24].fgtsCents < 990000);

  const off = simulateFinancing(sim, { useFgts: false });
  assert.ok(r.months < off.months);
  assert.ok(r.totalInterestCents < off.totalInterestCents);
});

test('payment that does not cover the interest never pays off', () => {
  const r = simulateFinancing({ ...base, annualRateBps: 1200, monthlyPaymentCents: 900 });
  assert.equal(r.paidOff, false);
  assert.equal(r.months, 600);
  assert.ok(r.firstInterestCents > 900);
});

test('toYearlyRows totals match the monthly series', () => {
  const r = simulateFinancing({ ...base, balanceCents: 5000000, annualRateBps: 1000, monthlyPaymentCents: 100000, fgtsBalanceCents: 300000 });
  const rows = toYearlyRows(r.series);
  assert.equal(rows.length, Math.ceil(r.months / 12));
  assert.deepEqual(rows.map((x) => x.year), rows.map((_, idx) => idx + 1));
  assert.equal(rows.reduce((s, x) => s + x.interestCents, 0), r.totalInterestCents);
  assert.equal(rows.reduce((s, x) => s + x.fgtsCents, 0), r.fgtsUsedCents);
  assert.equal(rows[0].fgtsCents, 300000);
  assert.equal(rows.at(-1).balanceCents, 0);
});

test('parseRate / bpsToInput', () => {
  assert.equal(parseRate('10,5'), 1050);
  assert.equal(parseRate('10.5'), 1050);
  assert.equal(parseRate(' 9,99 % '), 999);
  assert.equal(parseRate('0'), 0);
  assert.equal(parseRate('100'), 10000);
  assert.equal(parseRate('100,01'), null);
  assert.equal(parseRate(''), null);
  assert.equal(parseRate('-1'), null);
  assert.equal(parseRate('abc'), null);
  assert.equal(bpsToInput(1050), '10,50');
});

test('addMonths / formatDuration', () => {
  assert.equal(addMonths('2026-11', 14), '2028-01');
  assert.equal(addMonths('2026-11', 0), '2026-11');
  assert.equal(formatDuration(0), '0 meses');
  assert.equal(formatDuration(1), '1 mês');
  assert.equal(formatDuration(12), '1 ano');
  assert.equal(formatDuration(27), '2 anos e 3 meses');
  assert.equal(formatDuration(13), '1 ano e 1 mês');
});

test('toFinancingPayload', () => {
  const valid = { name: ' Apê ', balance: '300.000,00', rate: '10,5', payment: '3.500,00', fees: '', fgtsBalance: '0', fgtsDeposit: '400' };
  assert.deepEqual(toFinancingPayload(valid), {
    data: {
      name: 'Apê',
      balanceCents: 30000000,
      annualRateBps: 1050,
      monthlyPaymentCents: 350000,
      monthlyFeesCents: 0,
      fgtsBalanceCents: 0,
      fgtsMonthlyDepositCents: 40000,
    },
  });
  assert.ok(toFinancingPayload({ ...valid, balance: '' }).error);
  assert.ok(toFinancingPayload({ ...valid, rate: '101' }).error);
  assert.ok(toFinancingPayload({ ...valid, payment: '0' }).error);
  assert.ok(toFinancingPayload({ ...valid, fees: '3.500,00' }).error);
  assert.ok(toFinancingPayload({ ...valid, fgtsDeposit: 'abc' }).error);
});
