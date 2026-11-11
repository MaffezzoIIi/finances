import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { today } from '../utils/money.js';
import { toExpensePayload } from './expensePayload.js';
import OptionSelect from './OptionSelect.jsx';

export default function ExpenseForm({ categories, paymentMethods, onSubmit, onError, categoryActions, paymentActions }) {
  const [draft, setDraft] = useState({
    description: '', amount: '', date: today(), categoryId: '', paymentMethodId: '',
  });
  const [saving, setSaving] = useState(false);
  const descriptionRef = useRef(null);
  const set = (field) => (value) => setDraft((d) => ({ ...d, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const { data, error } = toExpensePayload(draft);
    if (error) return onError(error);
    setSaving(true);
    const ok = await onSubmit(data);
    setSaving(false);
    if (ok) {
      // Keep date/category/payment to speed up entering several expenses.
      setDraft((d) => ({ ...d, description: '', amount: '' }));
      descriptionRef.current?.focus();
    }
  };

  return (
    <form className="expense-form" onSubmit={submit}>
      <input
        ref={descriptionRef}
        className="f-desc"
        placeholder="Descrição do gasto"
        aria-label="Descrição"
        maxLength={200}
        value={draft.description}
        onChange={(e) => set('description')(e.target.value)}
      />
      <input
        className="f-amount"
        placeholder="0,00"
        aria-label="Valor (R$)"
        inputMode="decimal"
        value={draft.amount}
        onChange={(e) => set('amount')(e.target.value)}
      />
      <input
        className="f-date"
        type="date"
        aria-label="Data"
        value={draft.date}
        onChange={(e) => set('date')(e.target.value)}
      />
      <OptionSelect
        value={draft.categoryId}
        onChange={set('categoryId')}
        options={categories}
        onCreate={categoryActions.create}
        placeholder="Categoria"
        newLabel="+ Nova categoria…"
        ariaLabel="Categoria"
      />
      <OptionSelect
        value={draft.paymentMethodId}
        onChange={set('paymentMethodId')}
        options={paymentMethods}
        onCreate={paymentActions.create}
        placeholder="Pagamento"
        newLabel="+ Nova forma…"
        ariaLabel="Forma de pagamento"
      />
      <button type="submit" className="btn btn-primary" disabled={saving}>
        <Plus size={18} /> Adicionar
      </button>
    </form>
  );
}
