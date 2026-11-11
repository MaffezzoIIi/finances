import { Filter } from 'lucide-react';

export default function CategoryFilter({ categories, value, onChange }) {
  return (
    <label className="filter">
      <Filter size={16} />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filtrar por categoria">
        <option value="">Todas as categorias</option>
        {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
      </select>
    </label>
  );
}
