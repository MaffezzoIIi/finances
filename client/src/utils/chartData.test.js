import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAvailableMonths,
  buildCategoryBreakdown,
  buildMonthlySeries,
  formatMonthShort,
  formatMonthLabel,
} from './chartData.js';

const SAMPLE = [
  { date: '2026-11-04', amountCents: 3000, categoryName: 'Alimentação' },
  { date: '2026-11-10', amountCents: 7000, categoryName: 'Moradia' },
  { date: '2026-10-15', amountCents: 5000, categoryName: 'Alimentação' },
];

test('getAvailableMonths returns unique months descending', () => {
  assert.deepEqual(getAvailableMonths(SAMPLE), ['2026-11', '2026-10']);
  assert.deepEqual(getAvailableMonths([]), []);
});

test('buildCategoryBreakdown groups, sorts, and calculates percentages', () => {
  const nov = buildCategoryBreakdown(SAMPLE, '2026-11');
  assert.equal(nov.totalCents, 10000);
  assert.equal(nov.items.length, 2);
  assert.equal(nov.items[0].categoryName, 'Moradia');
  assert.equal(nov.items[0].amountCents, 7000);
  assert.equal(nov.items[0].percent, 70);
  assert.equal(nov.items[1].categoryName, 'Alimentação');
  assert.equal(nov.items[1].percent, 30);

  const all = buildCategoryBreakdown(SAMPLE, 'all');
  assert.equal(all.totalCents, 15000);
  assert.equal(all.items[0].categoryName, 'Alimentação');
  assert.equal(all.items[0].amountCents, 8000);

  const empty = buildCategoryBreakdown(SAMPLE, '2026-01');
  assert.deepEqual(empty, { totalCents: 0, items: [] });
});

test('buildMonthlySeries returns continuous window ending at refMonth', () => {
  const series = buildMonthlySeries(SAMPLE, '2026-11', 4);
  assert.deepEqual(
    series.map((s) => [s.month, s.label, s.amountCents, s.heightPercent]),
    [
      ['2026-08', 'Ago/26', 0, 0],
      ['2026-09', 'Set/26', 0, 0],
      ['2026-10', 'Out/26', 5000, 50],
      ['2026-11', 'Nov/26', 10000, 100],
    ],
  );
});

test('formatMonthShort and formatMonthLabel', () => {
  assert.equal(formatMonthShort('2026-11'), 'Nov/26');
  assert.equal(formatMonthLabel('2026-11'), 'Novembro 2026');
});
