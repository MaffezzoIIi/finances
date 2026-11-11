# 💰 Meus Gastos

Controle simples de gastos pessoais: cadastrar, listar, editar, classificar e excluir.

- **Frontend:** React + Vite (`client/`)
- **Backend:** Node.js + Express (`server/`)
- **Banco:** SQLite (módulo nativo `node:sqlite`), arquivo `server/data/finances.db`

Requer **Node.js 22.13+** (testado no 24).

## Rodando

```bash
npm run install:all   # instala dependências da raiz, server e client
npm run dev           # API em :3001 e frontend em http://localhost:5173
```

## Testes e build

```bash
npm test              # testes da API + utilitários do frontend
npm run build         # build de produção do frontend (client/dist)
```

## Funcionalidades

- **Gráficos de gastos**: rosca + barras de participação por categoria (com filtro por mês ou todos os meses) e evolução mensal dos últimos 6 meses.
- Cadastro de gasto: descrição, valor (formato `12,50`), data, categoria e forma de pagamento.
- Lista ordenada pela data mais recente, com ✏️ edição inline (Enter salva, Esc cancela) e 🗑️ exclusão com confirmação.
- Filtro por categoria e total no rodapé (respeita o filtro).
- Categorias e formas de pagamento pré-definidas; crie novas direto no select ("+ Nova…") ou
  no painel ⚙️ **Gerenciar**, onde também é possível renomear e excluir.
  Itens em uso por algum gasto não podem ser excluídos.

## API

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/api/expenses` | Lista (`?categoryId=` opcional) / cria |
| PUT/DELETE | `/api/expenses/:id` | Atualiza / exclui |
| GET/POST | `/api/categories` | Lista (com `usageCount`) / cria |
| PUT/DELETE | `/api/categories/:id` | Renomeia / exclui (409 se em uso) |
| GET/POST | `/api/payment-methods` | Idem categorias |
| PUT/DELETE | `/api/payment-methods/:id` | Idem categorias |
