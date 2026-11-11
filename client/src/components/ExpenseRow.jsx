import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { centsToInput, formatBRL, formatDate } from '../utils/money.js';
import { toExpensePayload } from './expensePayload.js';
import OptionSelect from './OptionSelect.jsx';

function EditRow({ expense, onSave, onCancel, onError, categories, paymentMethods, categoryActions, paymentActions }) {
  const [draft, setDraft] = useState({
    description: expense.description,
    amount: centsToInput(expense.amountCents),
    date: expense.date,
    categoryId: String(expense.categoryId),
    paymentMethodId: String(expense.paymentMethodId),
  });
  const set = (field) => (value) => setDraft((d) => ({ ...d, [field]: value }));

  const save = () => {
    const { data, error } = toExpensePayload(draft);
    if (error) return onError(error);
    onSave(expense.id, data);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  return (
    <tr className="editing" onKeyDown={onKeyDown}>
      <td><input type="date" aria-label="Data" value={draft.date} onChange={(e) => set('date')(e.target.value)} /></td>
      <td>
        <input autoFocus aria-label="Descrição" maxLength={200} value={draft.description}
          onChange={(e) => set('description')(e.target.value)} />
      </td>
      <td>
        <OptionSelect value={draft.categoryId} onChange={set('categoryId')} options={categories}
          onCreate={categoryActions.create} placeholder="Categoria" newLabel="+ Nova categoria…" ariaLabel="Categoria" />
      </td>
      <td>
        <OptionSelect value={draft.paymentMethodId} onChange={set('paymentMethodId')} options={paymentMethods}
          onCreate={paymentActions.create} placeholder="Pagamento" newLabel="+ Nova forma…" ariaLabel="Forma de pagamento" />
      </td>
      <td className="num">
        <input className="amount-input" aria-label="Valor (R$)" inputMode="decimal" value={draft.amount}
          onChange={(e) => set('amount')(e.target.value)} />
      </td>
      <td className="actions">
        <button className="icon-btn ok" onClick={save} aria-label="Salvar" title="Salvar (Enter)"><Check size={18} /></button>
        <button className="icon-btn" onClick={onCancel} aria-label="Cancelar" title="Cancelar (Esc)"><X size={18} /></button>
      </td>
    </tr>
  );
}

export default function ExpenseRow({ expense, editing, onEdit, onDelete, ...editProps }) {
  if (editing) return <EditRow expense={expense} {...editProps} />;

  return (
    <tr>
      <td className="muted">{formatDate(expense.date)}</td>
      <td>{expense.description}</td>
      <td><span className="badge">{expense.categoryName}</span></td>
      <td className="muted">{expense.paymentMethodName}</td>
      <td className="num">{formatBRL(expense.amountCents)}</td>
      <td className="actions">
        <button className="icon-btn edit" onClick={() => onEdit(expense.id)} aria-label="Editar" title="Editar">
          <Pencil size={18} />
        </button>
        <button className="icon-btn delete" onClick={() => onDelete(expense)} aria-label="Excluir" title="Excluir">
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}
