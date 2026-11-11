import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';

function LookupItem({ item, actions }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const cancel = () => { setEditing(false); setName(item.name); };
  const save = async () => {
    if (!name.trim() || name.trim() === item.name) return cancel();
    if (await actions.rename(item.id, name.trim())) setEditing(false);
  };

  const inUse = item.usageCount > 0;

  if (editing) {
    return (
      <li className="lookup-item editing">
        <input
          autoFocus
          value={name}
          maxLength={50}
          aria-label="Novo nome"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') { e.stopPropagation(); cancel(); }
          }}
        />
        <button className="icon-btn ok" onClick={save} aria-label="Salvar" title="Salvar"><Check size={18} /></button>
        <button className="icon-btn" onClick={cancel} aria-label="Cancelar" title="Cancelar"><X size={18} /></button>
      </li>
    );
  }

  return (
    <li className="lookup-item">
      <span className="lookup-name">{item.name}</span>
      <span className="muted small">{item.usageCount} gasto(s)</span>
      <button className="icon-btn edit" onClick={() => setEditing(true)} aria-label={`Renomear ${item.name}`} title="Renomear">
        <Pencil size={18} />
      </button>
      <button
        className="icon-btn delete"
        onClick={() => actions.remove(item)}
        disabled={inUse}
        aria-label={`Excluir ${item.name}`}
        title={inUse ? `Em uso por ${item.usageCount} gasto(s)` : 'Excluir'}
      >
        <Trash2 size={18} />
      </button>
    </li>
  );
}

function LookupManager({ items, actions, label }) {
  const [name, setName] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (await actions.create(name.trim())) setName('');
  };

  return (
    <>
      <form className="lookup-add" onSubmit={add}>
        <input value={name} maxLength={50} placeholder={`Nova ${label.toLowerCase()}`} aria-label={`Nova ${label}`}
          onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn btn-primary"><Plus size={18} /> Adicionar</button>
      </form>
      <ul className="lookup-list">
        {items.map((item) => <LookupItem key={item.id} item={item} actions={actions} />)}
      </ul>
    </>
  );
}

const SINGULAR = { categories: 'Categoria', paymentMethods: 'Forma de pagamento' };

export default function ManagePanel({ open, onClose, tabs }) {
  const [active, setActive] = useState(tabs[0].key);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const tab = tabs.find((t) => t.key === active);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-label="Gerenciar">
        <header className="drawer-header">
          <h2>Gerenciar</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar" title="Fechar (Esc)"><X size={20} /></button>
        </header>
        <nav className="tabs">
          {tabs.map((t) => (
            <button key={t.key} className={`tab ${t.key === active ? 'active' : ''}`} onClick={() => setActive(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        <LookupManager key={tab.key} items={tab.items} actions={tab.actions} label={SINGULAR[tab.key]} />
      </aside>
    </div>
  );
}
