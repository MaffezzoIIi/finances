import { Filter } from 'lucide-react';

export default function CategoryFilter({ categories, value, onChange, paymentMethods = [], paymentValue = '', onPaymentChange }) {
  return (
    <div className="filter">
      <Filter size={16} />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filtrar por categoria">
        <option value="">Todas as categorias</option>
        {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
      </select>
      <select value={paymentValue} onChange={(e) => onPaymentChange?.(e.target.value)} aria-label="Filtrar por forma de pagamento">
        <option value="">Todas as formas de pagamento</option>
        {paymentMethods.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
      </select>
    </div>
  );
}
