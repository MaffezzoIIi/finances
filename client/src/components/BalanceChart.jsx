const W = 640;
const H = 220;
const PAD = { l: 78, r: 14, t: 10, b: 26 };

const compactBRL = (cents) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' });

// Outstanding balance over time; one polyline per scenario.
export default function BalanceChart({ lines }) {
  const maxMonth = Math.max(1, ...lines.map((l) => l.series.at(-1).month));
  const maxBalance = Math.max(1, ...lines.flatMap((l) => l.series.map((p) => p.balanceCents)));
  const x = (month) => PAD.l + (month / maxMonth) * (W - PAD.l - PAD.r);
  const y = (cents) => PAD.t + (1 - cents / maxBalance) * (H - PAD.t - PAD.b);

  const years = Math.ceil(maxMonth / 12);
  const step = Math.max(1, Math.ceil(years / 6));
  const yearTicks = [];
  for (let yr = 0; yr * 12 <= maxMonth; yr += step) yearTicks.push(yr);

  return (
    <>
      <svg className="balance-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Saldo devedor ao longo do tempo">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line className="chart-grid" x1={PAD.l} x2={W - PAD.r} y1={y(maxBalance * f)} y2={y(maxBalance * f)} />
            <text className="chart-axis" x={PAD.l - 8} y={y(maxBalance * f) + 4} textAnchor="end">
              {compactBRL(maxBalance * f)}
            </text>
          </g>
        ))}
        {yearTicks.map((yr) => (
          <text key={yr} className="chart-axis" x={x(yr * 12)} y={H - 6} textAnchor="middle">
            {yr === 0 ? 'hoje' : `${yr} ${yr === 1 ? 'ano' : 'anos'}`}
          </text>
        ))}
        {lines.map((l) => (
          <polyline
            key={l.label}
            fill="none"
            stroke={l.color}
            strokeWidth="2.5"
            strokeDasharray={l.dashed ? '6 5' : undefined}
            strokeLinejoin="round"
            points={l.series.map((p) => `${x(p.month).toFixed(1)},${y(p.balanceCents).toFixed(1)}`).join(' ')}
          />
        ))}
      </svg>
      <div className="chart-legend">
        {lines.map((l) => (
          <span key={l.label}>
            <span className={`legend-line ${l.dashed ? 'dashed' : ''}`} style={{ borderColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </>
  );
}
