import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { centsToInput, formatBRL } from '../utils/money.js';
import { formatMonthShort } from '../utils/chartData.js';
import { debtInstallmentsInHorizon, monthsBetween } from '../utils/emergencyFund.js';
import { toDebtPayload } from './debtPayload.js';

const EMPTY = { name: '', payment: '', remaining: '' };

const toDraft = (debt, currentMonth) => ({
  name: debt.name,
  payment: centsToInput(debt.monthlyPaymentCents),
  remaining: debt.endMonth ? String(Math.max(0, monthsBetween(currentMonth, debt.endMonth))) : '',
});

function RemainingLabel({ endMonth, currentMonth }) {
  if (!endMonth) return <span className="muted">Contínua</span>;
  const rem = monthsBetween(currentMonth, endMonth);
  if (rem <= 0) return <span className="badge">Quitada</span>;
  return <span>{rem}x (até {formatMonthShort(endMonth)})</span>;
}

function DebtEditRow({ debt, currentMonth, onSave, onCancel, onError }) {
  const [draft, setDraft] = useState(() => toDraft(debt, currentMonth));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const { data, error } = toDebtPayload(draft, currentMonth);
    if (error) return onError(error);
    setSaving(true);
    await onSave(debt.id, data);
    setSaving(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    else if (e.key === 'Escape') onCancel();
  };

  return (
    <tr className="editing">
      <td>
        <input
          value={draft.name}
          maxLength={100}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          onKeyDown={onKeyDown}
          aria-label="Nome da dívida"
        />
      </td>
      <td className="num">
        <input
          inputMode="decimal"
          value={draft.payment}
          onChange={(e) => setDraft((d) => ({ ...d, payment: e.target.value }))}
          onKeyDown={onKeyDown}
          aria-label="Parcela mensal"
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          max="600"
          placeholder="Contínua"
          value={draft.remaining}
          onChange={(e) => setDraft((d) => ({ ...d, remaining: e.target.value }))}
          onKeyDown={onKeyDown}
          aria-label="Parcelas restantes"
        />
      </td>
      <td className="num muted">—</td>
      <td className="actions">
        <button className="icon-btn ok" onClick={save} disabled={saving} title="Salvar (Enter)" aria-label="Salvar">
          <Check size={16} />
        </button>
        <button className="icon-btn" onClick={onCancel} title="Cancelar (Esc)" aria-label="Cancelar">
          <X size={16} />
        </button>
      </td>
    </tr>
  );
}

export default function DebtList({ debts, horizonMonths, currentMonth, actions, onError }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    const { data, error } = toDebtPayload(draft, currentMonth);
    if (error) return onError(error);
    setSaving(true);
    const ok = await actions.create(data);
    setSaving(false);
    if (ok) setDraft(EMPTY);
  };

  const saveEdit = async (id, data) => {
    const ok = await actions.update(id, data);
    if (ok) setEditingId(null);
  };

  const remove = async (debt) => {
    if (!window.confirm(`Excluir a dívida "${debt.name}"?`)) return;
    await actions.remove(debt.id);
    if (editingId === debt.id) setEditingId(null);
  };

  return (
    <section className="debt-section">
      <h2>Dívidas e parcelas</h2>
      <form className="expense-form debt-form" onSubmit={add}>
        <label className="field grow">
          <span>Dívida</span>
          <input
            value={draft.name}
            maxLength={100}
            placeholder="Ex.: Financiamento carro, consignado…"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </label>
        <label className="field amount">
          <span>Parcela/mês (R$)</span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={draft.payment}
            onChange={(e) => setDraft((d) => ({ ...d, payment: e.target.value }))}
          />
        </label>
        <label className="field remaining">
          <span>Parcelas restantes</span>
          <input
            type="number"
            min="0"
            max="600"
            placeholder="Contínua"
            value={draft.remaining}
            onChange={(e) => setDraft((d) => ({ ...d, remaining: e.target.value }))}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Plus size={18} /> Adicionar
        </button>
      </form>

      <div className="table-wrap">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Dívida</th>
              <th className="num">Parcela/mês</th>
              <th>Restantes</th>
              <th className="num">Na reserva ({horizonMonths}m)</th>
              <th className="actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {debts.length === 0 ? (
              <tr><td colSpan={5} className="empty">Nenhuma dívida cadastrada.</td></tr>
            ) : debts.map((d) => (editingId === d.id ? (
              <DebtEditRow
                key={d.id}
                debt={d}
                currentMonth={currentMonth}
                onSave={saveEdit}
                onCancel={() => setEditingId(null)}
                onError={onError}
              />
            ) : (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td className="num">{formatBRL(d.monthlyPaymentCents)}</td>
                <td><RemainingLabel endMonth={d.endMonth} currentMonth={currentMonth} /></td>
                <td className="num">
                  {formatBRL(d.monthlyPaymentCents * debtInstallmentsInHorizon(d, currentMonth, horizonMonths))}
                </td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setEditingId(d.id)} title="Editar" aria-label="Editar">
                    <Pencil size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => remove(d)} title="Excluir" aria-label="Excluir">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
