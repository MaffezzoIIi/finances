const MAX_MONTHS = 600; // 50 years
const FGTS_INTERVAL = 24; // minimum months between FGTS uses on the same loan
// shortcut: FGTS grows at the legal 3% a.a. only (ignores TR and profit sharing), add them if precision matters.
const FGTS_MONTHLY_YIELD = 1.03 ** (1 / 12) - 1;

// Month-by-month payoff of an existing loan paying a fixed amount per month.
// FGTS: current balance is used now (month 0), then the accumulated balance every 24 months.
// shortcut: TR correction is ignored and fees are a fixed R$/month, so real terms run a bit longer.
export function simulateFinancing(sim, { useFgts = true } = {}) {
  const rate = (1 + sim.annualRateBps / 10000) ** (1 / 12) - 1;
  const net = sim.monthlyPaymentCents - sim.monthlyFeesCents; // part that pays interest + principal
  const deposit = useFgts ? sim.fgtsMonthlyDepositCents : 0;
  let balance = sim.balanceCents;
  let fgts = useFgts ? sim.fgtsBalanceCents : 0;
  let totalInterest = 0;
  let totalPaid = 0;
  let fgtsUsed = 0;
  let month = 0;

  const applyFgts = () => {
    const amount = Math.min(Math.floor(fgts), balance);
    balance -= amount;
    fgts -= amount;
    fgtsUsed += amount;
    return amount;
  };

  const fgtsNow = applyFgts();
  const series = [{ month: 0, balanceCents: balance, interestCents: 0, fgtsCents: fgtsNow }];

  while (balance > 0 && month < MAX_MONTHS) {
    month += 1;
    const interest = Math.round(balance * rate);
    const paid = Math.min(net, balance + interest);
    balance += interest - paid;
    totalInterest += interest;
    totalPaid += paid + sim.monthlyFeesCents;
    fgts = fgts * (1 + FGTS_MONTHLY_YIELD) + deposit;
    const fgtsCents = month % FGTS_INTERVAL === 0 ? applyFgts() : 0;
    series.push({ month, balanceCents: balance, interestCents: interest, fgtsCents });
  }

  return {
    paidOff: balance === 0,
    months: month,
    totalInterestCents: totalInterest,
    totalPaidCents: totalPaid,
    fgtsUsedCents: fgtsUsed,
    firstInterestCents: series[1]?.interestCents ?? 0,
    series,
  };
}

// Groups the monthly series by contract year (month 0 belongs to year 1).
export function toYearlyRows(series) {
  const rows = [];
  for (const p of series) {
    const year = Math.max(1, Math.ceil(p.month / 12));
    const row = (rows[year - 1] ??= { year, balanceCents: 0, interestCents: 0, fgtsCents: 0 });
    row.balanceCents = p.balanceCents;
    row.interestCents += p.interestCents;
    row.fgtsCents += p.fgtsCents;
  }
  return rows;
}

// "10,5" or "10.5" -> 1050 basis points; null when invalid or above 100%.
export function parseRate(input) {
  const s = String(input ?? '').trim().replace(/\s*%$/, '');
  if (!/^\d{1,3}([,.]\d{1,2})?$/.test(s)) return null;
  const bps = Math.round(Number(s.replace(',', '.')) * 100);
  return bps <= 10000 ? bps : null;
}

// 1050 -> "10,50"
export const bpsToInput = (bps) => (bps / 100).toFixed(2).replace('.', ',');

// ("2026-11", 14) -> "2028-01"
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 27 -> "2 anos e 3 meses"
export function formatDuration(months) {
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return plural(rest, 'mês', 'meses');
  const y = plural(years, 'ano', 'anos');
  return rest ? `${y} e ${plural(rest, 'mês', 'meses')}` : y;
}
