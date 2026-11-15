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
import EmergencyFund from './components/EmergencyFund.jsx';

const VIEWS = [
  { key: 'expenses', label: '🧾 Gastos' },
  { key: 'financing', label: '🏠 Financiamento' },
  { key: 'reserve', label: '🛡️ Reserva' },
];

export default function App() {
  const [view, setView] = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [debts, setDebts] = useState([]);
  const [fundSettings, setFundSettings] = useState({ months: 6, savedCents: 0, essentialCategoryIds: [] });
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterPaymentId, setFilterPaymentId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [exp, cats, pms, sims, debtList, fund] = await Promise.all([
      api.expenses.list(),
      api.categories.list(),
      api.paymentMethods.list(),
      api.financingSimulations.list(),
      api.debts.list(),
      api.emergencyFund.get(),
    ]);
    setExpenses(exp);
    setCategories(cats);
    setPaymentMethods(pms);
    setSimulations(sims);
    setDebts(debtList);
    setFundSettings(fund);
    setFilterCategoryId((f) => (f && !cats.some((c) => String(c.id) === f) ? '' : f));
    setFilterPaymentId((f) => (f && !pms.some((p) => String(p.id) === f) ? '' : f));
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

  const financingActions = {
    create: (data) => run(async () => {
      const created = await api.financingSimulations.create(data);
      await loadAll();
      return created;
    }),
    update: (id, data) => run(async () => {
      const updated = await api.financingSimulations.update(id, data);
      await loadAll();
      return updated;
    }),
    remove: (sim) => {
      if (!window.confirm(`Excluir simulação "${sim.name}"?`)) return false;
      return run(async () => {
        await api.financingSimulations.remove(sim.id);
        await loadAll();
      });
    },
  };

  const debtActions = {
    create: (data) => run(async () => {
      await api.debts.create(data);
      await loadAll();
    }),
    update: (id, data) => run(async () => {
      await api.debts.update(id, data);
      await loadAll();
    }),
    remove: (id) => run(async () => {
      await api.debts.remove(id);
      await loadAll();
    }),
  };

  const saveFundSettings = (data) => run(async () => {
    const saved = await api.emergencyFund.update(data);
    setFundSettings(saved);
  });

  const byPayment = filterPaymentId
    ? expenses.filter((e) => String(e.paymentMethodId) === filterPaymentId)
    : expenses;
  const visible = filterCategoryId
    ? byPayment.filter((e) => String(e.categoryId) === filterCategoryId)
    : byPayment;
  const activeFilterName = [
    filterCategoryId && categories.find((c) => String(c.id) === filterCategoryId)?.name,
    filterPaymentId && paymentMethods.find((p) => String(p.id) === filterPaymentId)?.name,
  ].filter(Boolean).join(' · ');

  return (
    <div className="container">
      <header className="header">
        <h1>💰 Meus Gastos</h1>
        <nav className="view-tabs" aria-label="Seções">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              className={`view-tab ${view === v.key ? 'active' : ''}`}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </nav>
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

      {view === 'expenses' && (
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
            <CategoryFilter
              categories={categories}
              value={filterCategoryId}
              onChange={setFilterCategoryId}
              paymentMethods={paymentMethods}
              paymentValue={filterPaymentId}
              onPaymentChange={setFilterPaymentId}
            />
          </div>

          <ExpenseCharts
            expenses={byPayment}
            filteredExpenses={visible}
            activeCategoryName={activeFilterName}
          />

          <ExpenseList
            expenses={visible}
            loading={loading}
            filtered={Boolean(filterCategoryId || filterPaymentId)}
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

      {view === 'financing' && (
        <FinancingSimulator
          simulations={simulations}
          actions={financingActions}
          onError={setError}
        />
      )}

      {view === 'reserve' && (
        <EmergencyFund
          expenses={expenses}
          categories={categories}
          debts={debts}
          settings={fundSettings}
          onSaveSettings={saveFundSettings}
          debtActions={debtActions}
          onError={setError}
        />
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
