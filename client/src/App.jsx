import { useCallback, useEffect, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { api } from './api.js';
import { formatBRL } from './utils/money.js';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import ExpenseCharts from './components/ExpenseCharts.jsx';
import CategoryFilter from './components/CategoryFilter.jsx';
import ManagePanel from './components/ManagePanel.jsx';
import FinancingSimulator from './components/FinancingSimulator.jsx';

const VIEWS = [
  { key: 'expenses', label: '🧾 Gastos' },
  { key: 'financing', label: '🏠 Financiamento' },
];

export default function App() {
  const [view, setView] = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [exp, cats, pms, sims] = await Promise.all([
      api.expenses.list(),
      api.categories.list(),
      api.paymentMethods.list(),
      api.financingSimulations.list(),
    ]);
    setExpenses(exp);
    setCategories(cats);
    setPaymentMethods(pms);
    setSimulations(sims);
    setFilterCategoryId((f) => (f && !cats.some((c) => String(c.id) === f) ? '' : f));
  }, []);

  // Runs an action, shows API errors in the banner; returns the result or null on failure.
  const run = useCallback(async (fn) => {
    try {
      return (await fn()) ?? true;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, []);

  useEffect(() => {
    run(loadAll).finally(() => setLoading(false));
  }, [run, loadAll]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const lookupActions = (kind) => ({
    create: (name) => run(async () => {
      const item = await api[kind].create({ name });
      await loadAll();
      return item;
    }),
    rename: (id, name) => run(async () => {
      await api[kind].update(id, { name });
      await loadAll();
    }),
    remove: (item) => {
      if (!window.confirm(`Excluir "${item.name}"?`)) return;
      return run(async () => {
        await api[kind].remove(item.id);
        await loadAll();
      });
    },
  });
  const categoryActions = lookupActions('categories');
  const paymentActions = lookupActions('paymentMethods');

  const addExpense = (data) => run(async () => {
    await api.expenses.create(data);
    await loadAll();
  });

  const saveExpense = (id, data) => run(async () => {
    await api.expenses.update(id, data);
    setEditingId(null);
    await loadAll();
  });

  const deleteExpense = (expense) => {
    if (!window.confirm(`Excluir "${expense.description}" (${formatBRL(expense.amountCents)})?`)) return;
    run(async () => {
      await api.expenses.remove(expense.id);
      if (editingId === expense.id) setEditingId(null);
      await loadAll();
    });
  };

  const simulationActions = {
    create: (data) => run(async () => {
      const sim = await api.financingSimulations.create(data);
      await loadAll();
      return sim;
    }),
    update: (id, data) => run(async () => {
      await api.financingSimulations.update(id, data);
      await loadAll();
    }),
    remove: (sim) => {
      if (!window.confirm(`Excluir a simulação "${sim.name}"?`)) return null;
      return run(async () => {
        await api.financingSimulations.remove(sim.id);
        await loadAll();
      });
    },
  };

  const visible = filterCategoryId
    ? expenses.filter((e) => String(e.categoryId) === filterCategoryId)
    : expenses;
  const activeCategoryName = filterCategoryId
    ? categories.find((c) => String(c.id) === filterCategoryId)?.name
    : '';

  return (
    <div className="container">
      <header className="header">
        <h1>💰 Meus Gastos</h1>
        <button className="btn btn-ghost" onClick={() => setManageOpen(true)} title="Gerenciar categorias e formas de pagamento">
          <Settings size={18} /> Gerenciar
        </button>
      </header>

      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button className="icon-btn" onClick={() => setError('')} aria-label="Fechar aviso"><X size={16} /></button>
        </div>
      )}

      <nav className="tabs view-tabs">
        {VIEWS.map((v) => (
          <button key={v.key} className={`tab ${view === v.key ? 'active' : ''}`} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </nav>

      {view === 'financing' ? (
        <FinancingSimulator simulations={simulations} actions={simulationActions} onError={setError} />
      ) : (
        <>
          <ExpenseForm
            categories={categories}
            paymentMethods={paymentMethods}
            onSubmit={addExpense}
            onError={setError}
            categoryActions={categoryActions}
            paymentActions={paymentActions}
          />

          <div className="toolbar">
            <CategoryFilter categories={categories} value={filterCategoryId} onChange={setFilterCategoryId} />
          </div>

          <ExpenseCharts
            expenses={expenses}
            filteredExpenses={visible}
            activeCategoryName={activeCategoryName}
          />

          <ExpenseList
            expenses={visible}
            loading={loading}
            filtered={!!filterCategoryId}
            editingId={editingId}
            onEdit={setEditingId}
            onCancelEdit={() => setEditingId(null)}
            onSave={saveExpense}
            onDelete={deleteExpense}
            onError={setError}
            categories={categories}
            paymentMethods={paymentMethods}
            categoryActions={categoryActions}
            paymentActions={paymentActions}
          />
        </>
      )}
      <ManagePanel
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        tabs={[
          { key: 'categories', label: 'Categorias', items: categories, actions: categoryActions },
          { key: 'paymentMethods', label: 'Formas de pagamento', items: paymentMethods, actions: paymentActions },
        ]}
      />
    </div>
  );
}
