import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { centsToInput, formatBRL, parseBRL, today } from '../utils/money.js';
import { formatMonthShort } from '../utils/chartData.js';
import { computeEmergencyFund } from '../utils/emergencyFund.js';
import DebtList from './DebtList.jsx';

const toDraft = (s) => ({
  months: String(s.months),
  saved: s.savedCents ? centsToInput(s.savedCents) : '',
  essentialIds: s.essentialCategoryIds,
});

function parseSavedCents(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 0;
  return parseBRL(trimmed);
}

export default function EmergencyFund({
  expenses,
  categories,
  debts,
  settings,
  onSaveSettings,
  debtActions,
  onError,
}) {
  const [draft, setDraft] = useState(() => toDraft(settings));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(toDraft(settings));
  }, [settings]);

  const currentMonth = today().slice(0, 7);
  const parsedMonths = Number(draft.months);
  const monthsValid = Number.isInteger(parsedMonths) && parsedMonths >= 1 && parsedMonths <= 60;
  const parsedSaved = parseSavedCents(draft.saved);
  const months = monthsValid ? parsedMonths : settings.months;
  const savedCents = parsedSaved === null ? settings.savedCents : parsedSaved;

  const result = computeEmergencyFund({
    expenses,
    categories,
    debts,
    essentialCategoryIds: draft.essentialIds,
    months,
    savedCents,
    currentMonth,
  });

  const toggleCategory = (id) => {
    setDraft((d) => ({
      ...d,
      essentialIds: d.essentialIds.includes(id)
        ? d.essentialIds.filter((x) => x !== id)
        : [...d.essentialIds, id],
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!monthsValid) return onError('O número de meses deve ser entre 1 e 60.');
    if (parsedSaved === null) return onError('Valor já guardado inválido.');
    setSaving(true);
    await onSaveSettings({
      months: parsedMonths,
      savedCents: parsedSaved,
      essentialCategoryIds: draft.essentialIds,
    });
    setSaving(false);
  };

  const windowLabel = result.windowMonths.length > 0
    ? result.windowMonths.map(formatMonthShort).join(', ')
    : null;

  return (
    <div className="reserve-view">
      <div className="fin-grid">
        <form className="fin-form" onSubmit={save}>
          <label className="field">
            <span>Meses de reserva</span>
            <input
              type="number"
              min="1"
              max="60"
              value={draft.months}
              onChange={(e) => setDraft((d) => ({ ...d, months: e.target.value }))}
            />
            <small className="muted">XP / InfoMoney: 3–6m (CLT/estável), 6–12m (autônomo/PJ)</small>
          </label>

          <label className="field">
            <span>Valor já guardado (R$)</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={draft.saved}
              onChange={(e) => setDraft((d) => ({ ...d, saved: e.target.value }))}
            />
          </label>

          <div className="field">
            <span>Categorias essenciais</span>
            <div className="cat-checks">
              {categories.map((c) => (
                <label key={c.id} className="check-item">
                  <input
                    type="checkbox"
                    checked={draft.essentialIds.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
            <small className="muted">
              Dica: lance parcelas de dívidas em uma categoria desmarcada (ex.: Dívidas) para não contar duas vezes.
            </small>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={18} /> Salvar
            </button>
          </div>
        </form>

        <div className="fin-results">
          {!windowLabel && (
            <div className="fin-message warn">
              Ainda não há gastos em meses anteriores fechados para calcular a média. Por enquanto, apenas as dívidas entram na meta.
            </div>
          )}

          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-label">Custo essencial médio/mês</div>
              <div className="stat-value">{formatBRL(result.essentialAvgCents)}</div>
              <div className="muted small">{windowLabel ? `Base: ${windowLabel}` : 'Sem meses fechados'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Dívidas no período ({months}m)</div>
              <div className="stat-value">{formatBRL(result.debtsInHorizonCents)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Meta da reserva</div>
              <div className="stat-value">{formatBRL(result.targetCents)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Já guardado</div>
              <div className="stat-value good">{formatBRL(savedCents)}</div>
              <div className="muted small">{result.percent}% da meta</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Falta guardar</div>
              <div className="stat-value">{formatBRL(result.missingCents)}</div>
            </div>
          </div>

          <div className="progress-card">
            <div className="progress-head">
              <span>Progresso da reserva</span>
              <strong>{result.percent}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${result.percent}%` }} />
            </div>
          </div>

          <div className="table-wrap">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Categoria essencial</th>
                  <th className="num">Média mensal</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.length === 0 ? (
                  <tr><td colSpan={2} className="empty">Nenhuma categoria essencial marcada.</td></tr>
                ) : result.breakdown.map((b) => (
                  <tr key={b.categoryId}>
                    <td>{b.categoryName}</td>
                    <td className="num">{formatBRL(b.monthlyAvgCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DebtList
        debts={debts}
        horizonMonths={months}
        currentMonth={currentMonth}
        actions={debtActions}
        onError={onError}
      />
    </div>
  );
}
