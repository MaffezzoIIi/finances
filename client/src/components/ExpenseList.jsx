import { formatBRL } from '../utils/money.js';
import ExpenseRow from './ExpenseRow.jsx';

export default function ExpenseList({ expenses, loading, filtered, editingId, onEdit, onCancelEdit, onSave, onDelete, ...rest }) {
  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="table-wrap">
      <table className="expense-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Pagamento</th>
            <th className="num">Valor</th>
            <th className="actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty">
                {loading ? 'Carregando…' : filtered ? 'Nenhum gasto encontrado para este filtro.' : 'Nenhum gasto cadastrado.'}
              </td>
            </tr>
          ) : (
            expenses.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                editing={editingId === e.id}
                onEdit={onEdit}
                onDelete={onDelete}
                onCancel={onCancelEdit}
                onSave={onSave}
                {...rest}
              />
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>
              Total{filtered ? ' (filtrado)' : ''} · {expenses.length} gasto(s)
            </td>
            <td className="num total">{formatBRL(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
