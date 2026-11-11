import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

const NEW = '__new__';

// <select> with a final "+ Nova…" option that turns into an inline text input.
export default function OptionSelect({ value, onChange, options, onCreate, placeholder, newLabel, ariaLabel }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  // If the selected option was deleted elsewhere, reset to the placeholder.
  const stale = value && !options.some((o) => String(o.id) === value);
  useEffect(() => {
    if (stale) onChange('');
  }, [stale, onChange]);

  const cancel = () => {
    setCreating(false);
    setName('');
  };

  const confirm = async () => {
    if (!name.trim()) return cancel();
    const item = await onCreate(name.trim());
    if (item) {
      onChange(String(item.id));
      cancel();
    }
  };

  if (creating) {
    return (
      <span className="inline-create">
        <input
          autoFocus
          value={name}
          maxLength={50}
          placeholder={newLabel.replace(/^\+\s*/, '').replace(/…$/, '')}
          aria-label={newLabel}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            // Keep Enter/Esc from reaching the parent form / editable row.
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); confirm(); }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
          }}
        />
        <button type="button" className="icon-btn ok" onClick={confirm} aria-label="Criar" title="Criar"><Check size={16} /></button>
        <button type="button" className="icon-btn" onClick={cancel} aria-label="Cancelar" title="Cancelar"><X size={16} /></button>
      </span>
    );
  }

  return (
    <select
      value={stale ? '' : value}
      aria-label={ariaLabel}
      onChange={(e) => (e.target.value === NEW ? setCreating(true) : onChange(e.target.value))}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
      <option value={NEW}>{newLabel}</option>
    </select>
  );
}
