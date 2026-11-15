async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

const crud = (path) => ({
  list: () => request('GET', path),
  create: (data) => request('POST', path, data),
  update: (id, data) => request('PUT', `${path}/${id}`, data),
  remove: (id) => request('DELETE', `${path}/${id}`),
});

export const api = {
  expenses: crud('/expenses'),
  categories: crud('/categories'),
  paymentMethods: crud('/payment-methods'),
  financingSimulations: crud('/financing-simulations'),
  debts: crud('/debts'),
  emergencyFund: {
    get: () => request('GET', '/emergency-fund'),
    update: (data) => request('PUT', '/emergency-fund', data),
  },
};
