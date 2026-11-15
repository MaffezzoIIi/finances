import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBRL, formatBRL, centsToInput, formatDate } from './money.js';

test('parseBRL', () => {
  assert.equal(parseBRL('12,50'), 1250);
  assert.equal(parseBRL('12,5'), 1250);
  assert.equal(parseBRL('12'), 1200);
  assert.equal(parseBRL('1.234,56'), 123456);
  assert.equal(parseBRL('1234,56'), 123456);
  assert.equal(parseBRL(' R$ 35,90 '), 3590);
  assert.equal(parseBRL('0,10'), 10);
  assert.equal(parseBRL('0'), null);
  assert.equal(parseBRL(''), null);
  assert.equal(parseBRL('abc'), null);
  assert.equal(parseBRL('-5'), null);
  assert.equal(parseBRL('1,234'), null);
  assert.equal(parseBRL('12.5'), null);
});

test('formatBRL', () => {
  assert.equal(formatBRL(3590).replace(/\s/g, ' '), 'R$ 35,90');
  assert.equal(formatBRL(123456).replace(/\s/g, ' '), 'R$ 1.234,56');
});

test('centsToInput / formatDate', () => {
  assert.equal(centsToInput(123456), '1234,56');
  assert.equal(centsToInput(1200), '12,00');
  assert.equal(formatDate('2026-11-04'), '04/11/2026');
});
