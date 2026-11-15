import { useState } from 'react';
import { FilePlus, Save, Trash2 } from 'lucide-react';
import { centsToInput, formatBRL, today } from '../utils/money.js';
import { formatMonthLabel } from '../utils/chartData.js';
import {
  addMonths, bpsToInput, formatDuration, simulateFinancing, toYearlyRows,
} from '../utils/financing.js';
import { toFinancingPayload } from './financingPayload.js';
import BalanceChart from './BalanceChart.jsx';

const EMPTY = { name: '', balance: '', rate: '', payment: '', fees: '', fgtsBalance: '', fgtsDeposit: '' };

const FIELDS = [
  { key: 'balance', label: 'Saldo devedor atual (R$)', placeholder: '300.000,00' },
  { key: 'rate', label: 'Juros efetivos (% ao ano)', placeholder: '10,5', hint: 'Taxa efetiva anual do contrato' },
  { key: 'payment', label: 'Pagamento mensal (R$)', placeholder: '3.500,00', hint: 'Total que você vai pagar por mês' },
  { key: 'fees', label: 'Seguros + taxas por mês (R$)', placeholder: '0,00', hint: 'MIP, DFI e taxa de administração (opcional)' },
  { key: 'fgtsBalance', label: 'Saldo do FGTS hoje (R$)', placeholder: '0,00', hint: 'Usado agora para amortizar (opcional)' },
  { key: 'fgtsDeposit', label: 'Depósito mensal do FGTS (R$)', placeholder: '0,00', hint: '8% do salário bruto; usado a cada 2 anos (opcional)' },
];

const optionalInput = (cents) => (cents ? centsToInput(cents) : '');
const toDraft = (s) => ({
  name: s.name,
  balance: centsToInput(s.balanceCents),
  rate: bpsToInput(s.annualRateBps),
  payment: centsToInput(s.monthlyPaymentCents),
  fees: optionalInput(s.monthlyFeesCents),
  fgtsBalance: optionalInput(s.fgtsBalanceCents),
  fgtsDeposit: optionalInput(s.fgtsMonthlyDepositCents),
});

function Stat({ label, value, sub, good }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${good ? 'good' : ''}`}>{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

function Results({ data }) {
  const withFgts = simulateFinancing(data);
  const hasFgts = data.fgtsBalanceCents > 0 || data.fgtsMonthlyDepositCents > 0;
  const withoutFgts = hasFgts ? simulateFinancing(data, { useFgts: false }) : null;

  if (!withFgts.paidOff) {
    return (
      <div className="fin-message warn">
        Com esses valores a dívida não é quitada em 50 anos. Os juros do 1º mês são{' '}
        <strong>{formatBRL(withFgts.firstInterestCents)}</strong> e sobram{' '}
        <strong>{formatBRL(data.monthlyPaymentCents - data.monthlyFeesCents)}</strong> do pagamento para eles.
        Aumente o pagamento mensal.
      </div>
    );
  }

  const payoff = formatMonthLabel(addMonths(today().slice(0, 7), withFgts.months));
  const lines = [{ label: hasFgts ? 'Com FGTS' : 'Saldo devedor', color: '#4f46e5', series: withFgts.series }];
  if (withoutFgts?.paidOff) lines.push({ label: 'Sem FGTS', color: '#9ca3af', dashed: true, series: withoutFgts.series });

  return (
    <>
      <div className="stat-cards">
        <Stat
          label="Quitação em"
          value={withFgts.months ? formatDuration(withFgts.months) : 'Agora'}
          sub={withFgts.months ? payoff : 'Quitado com o FGTS'}
        />
        <Stat label="Juros totais" value={formatBRL(withFgts.totalInterestCents)} />
        <Stat label="Pago do bolso" value={formatBRL(withFgts.totalPaidCents)} sub="Pagamentos + taxas" />
        {hasFgts && <Stat label="FGTS utilizado" value={formatBRL(withFgts.fgtsUsedCents)} />}
        {withoutFgts && (
          <Stat
            label="Economia com FGTS"
            good
            value={withoutFgts.paidOff ? `${formatDuration(withoutFgts.months - withFgts.months)} a menos` : 'Essencial'}
            sub={withoutFgts.paidOff
              ? `${formatBRL(withoutFgts.totalInterestCents - withFgts.totalInterestCents)} a menos em juros`
              : 'Sem FGTS não quita em 50 anos'}
          />
        )}
      </div>

      {withFgts.months > 0 && (
        <div className="chart-card">
          <div className="chart-header"><h3>Saldo devedor ao longo do tempo</h3></div>
          <BalanceChart lines={lines} />
        </div>
      )}

      <div className="table-wrap">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Ano</th>
              <th className="num">Saldo no fim do ano</th>
              <th className="num">Juros pagos</th>
              {hasFgts && <th className="num">FGTS usado</th>}
            </tr>
          </thead>
          <tbody>
            {toYearlyRows(withFgts.series).map((r) => (
              <tr key={r.year}>
                <td>{r.year}º ano</td>
                <td className="num">{formatBRL(r.balanceCents)}</td>
                <td className="num">{formatBRL(r.interestCents)}</td>
                {hasFgts && <td className="num">{r.fgtsCents ? formatBRL(r.fgtsCents) : '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function FinancingSimulator({ simulations, actions, onError }) {
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const select = (id) => {
    setSelectedId(id);
    const sim = simulations.find((s) => String(s.id) === id);
    setDraft(sim ? toDraft(sim) : EMPTY);
  };

  const { data, error } = toFinancingPayload(draft);
  const pristine = !draft.balance && !draft.rate && !draft.payment;

  const save = async (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return onError('Informe um nome para salvar a simulação.');
    if (error) return onError(error);
    setSaving(true);
    const result = selectedId
      ? await actions.update(Number(selectedId), data)
      : await actions.create(data);
    setSaving(false);
    if (result?.id) setSelectedId(String(result.id));
  };

  const remove = async () => {
    const sim = simulations.find((s) => String(s.id) === selectedId);
    if (sim && (await actions.remove(sim))) select('');
  };

  return (
    <div className="fin-grid">
      <form className="fin-form" onSubmit={save}>
        <div className="fin-saved">
          <select value={selectedId} onChange={(e) => select(e.target.value)} aria-label="Simulações salvas">
            <option value="">Nova simulação</option>
            {simulations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" className="icon-btn" onClick={() => select('')} aria-label="Nova simulação" title="Nova simulação">
            <FilePlus size={18} />
          </button>
        </div>

        <label className="field">
          <span>Nome</span>
          <input value={draft.name} maxLength={100} placeholder="Ex.: Apartamento Caixa" onChange={set('name')} />
        </label>
        {FIELDS.map((f) => (
          <label key={f.key} className="field">
            <span>{f.label}</span>
            <input inputMode="decimal" value={draft[f.key]} placeholder={f.placeholder} onChange={set(f.key)} />
            {f.hint && <small className="muted">{f.hint}</small>}
          </label>
        ))}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={18} /> {selectedId ? 'Salvar alterações' : 'Salvar'}
          </button>
          {selectedId && (
            <button type="button" className="btn btn-ghost" onClick={remove}>
              <Trash2 size={18} /> Excluir
            </button>
          )}
        </div>
      </form>

      <div className="fin-results">
        {pristine ? (
          <div className="fin-message">Preencha o saldo devedor, os juros e o pagamento mensal para ver em quanto tempo você quita o financiamento.</div>
        ) : error ? (
          <div className="fin-message">{error}</div>
        ) : (
          <Results data={data} />
        )}
        <p className="muted small">
          Estimativa: não considera a correção pela TR; seguros/taxas fixos; FGTS rende 3% a.a. e é usado agora e a cada 24 meses.
        </p>
      </div>
    </div>
  );
}
