import { useEffect, useState } from 'react';
import { formatBRL, today } from '../utils/money.js';
import {
  buildCategoryBreakdown,
  buildMonthlySeries,
  formatMonthLabel,
  getAvailableMonths,
} from '../utils/chartData.js';

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Donut({ items, totalCents }) {
  let offset = 0;
  return (
    <svg className="donut-svg" viewBox="0 0 120 120" aria-label="Gráfico de gastos por categoria">
      <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth="18" />
      {items.map((item) => {
        const dash = (item.amountCents / totalCents) * CIRCUMFERENCE;
        const el = (
          <circle
            key={item.categoryName}
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={item.color}
            strokeWidth="18"
            strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        );
        offset += dash;
        return el;
      })}
      <text x="60" y="56" textAnchor="middle" className="donut-label">Total</text>
      <text x="60" y="70" textAnchor="middle" className="donut-total">{formatBRL(totalCents)}</text>
    </svg>
  );
}

export default function ExpenseCharts({ expenses, filteredExpenses, activeCategoryName }) {
  const currentMonth = today().slice(0, 7);
  const availableMonths = getAvailableMonths(expenses);
  const defaultMonth = availableMonths.includes(currentMonth)
    ? currentMonth
    : availableMonths[0] ?? currentMonth;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  useEffect(() => {
    if (selectedMonth !== 'all' && availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths.includes(currentMonth) ? currentMonth : availableMonths[0]);
    }
  }, [availableMonths.join(','), currentMonth, selectedMonth]);

  const monthOptions = [...new Set([currentMonth, ...availableMonths])].sort().reverse();
  const breakdown = buildCategoryBreakdown(expenses, selectedMonth);
  const refMonth = availableMonths[0] > currentMonth ? availableMonths[0] : currentMonth;
  const monthlySeries = buildMonthlySeries(filteredExpenses, refMonth, 6);

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <div className="chart-header">
          <h3>Gastos por Categoria</h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Mês do gráfico de categorias"
          >
            <option value="all">Todos os meses</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        </div>

        {breakdown.items.length === 0 ? (
          <div className="chart-empty">Nenhum gasto registrado neste período.</div>
        ) : (
          <div className="cat-chart-body">
            <Donut items={breakdown.items} totalCents={breakdown.totalCents} />
            <ul className="cat-list">
              {breakdown.items.map((item) => (
                <li key={item.categoryName} className="cat-row">
                  <div className="cat-row-top">
                    <span className="cat-name">
                      <span className="cat-dot" style={{ background: item.color }} />
                      {item.categoryName}
                    </span>
                    <span className="cat-values">
                      <strong>{formatBRL(item.amountCents)}</strong>
                      <span className="muted small"> ({item.percent}%)</span>
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div
                      className="cat-bar-fill"
                      style={{ width: `${item.percent}%`, background: item.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3>
            Evolução Mensal
            {activeCategoryName && <span className="badge" style={{ marginLeft: 8 }}>{activeCategoryName}</span>}
          </h3>
          <span className="muted small">Últimos 6 meses</span>
        </div>

        <div className="month-bars" role="list" aria-label="Evolução mensal dos últimos 6 meses">
          {monthlySeries.map((item) => {
            const isSelected = selectedMonth === item.month;
            return (
              <button
                key={item.month}
                type="button"
                role="listitem"
                className={`month-bar-col ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedMonth(item.month)}
                title={`${formatMonthLabel(item.month)}: ${formatBRL(item.amountCents)} (clique para ver categorias)`}
              >
                <span className="month-bar-value">
                  {item.amountCents > 0 ? formatBRL(item.amountCents) : '—'}
                </span>
                <div className="month-bar-track">
                  <div
                    className="month-bar-fill"
                    style={{ height: `${item.amountCents > 0 ? Math.max(item.heightPercent, 6) : 0}%` }}
                  />
                </div>
                <span className="month-bar-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
