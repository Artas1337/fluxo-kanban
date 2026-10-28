# Fluxo — Kanban full-stack

Gerenciador de tarefas no estilo Kanban: quadros, colunas e cartões com **arrastar e soltar**, prioridades, busca e autenticação.

![CI](https://github.com/Artas1337/fluxo-kanban/actions/workflows/ci.yml/badge.svg)

> Projeto de portfólio — TypeScript de ponta a ponta, API REST testada e interface responsiva com tema claro/escuro.

## Funcionalidades

- Cadastro e login com **JWT** e senhas com hash **bcrypt**
- Quadros com colunas padrão (*A fazer*, *Em andamento*, *Concluído*)
- **Drag and drop** de cartões entre colunas e dentro da mesma coluna (mouse, toque e teclado)
- Prioridade (baixa, média, alta), descrição e data de criação em cada cartão
- **Data de entrega** com selo de prazo (hoje, amanhã, atrasado) e contador de cartões atrasados
- Busca e filtro por prioridade
- Renomear quadros e colunas com duplo clique
- Progresso de cada quadro (percentual de cartões na última coluna)
- Dados isolados por usuário: acessar recurso de outra pessoa retorna `404`
- Tema claro/escuro automático e layout mobile

## Stack

| Camada   | Tecnologias |
|----------|-------------|
| Frontend | React 19, TypeScript, Vite, React Router, dnd-kit, CSS puro com design tokens |
| Backend  | Node.js, Express 5, TypeScript, Zod (validação), JWT, bcrypt |
| Banco    | SQLite nativo do Node (`node:sqlite`) — sem dependência nativa para compilar |
| Testes   | Vitest + Supertest (testes de integração da API) |
| CI       | GitHub Actions (testes + build a cada push) |

## Arquitetura

```
fluxo-kanban/
├── server/            API REST
│   ├── src/
│   │   ├── app.ts       monta o Express (injeção do banco → fácil de testar)
│   │   ├── db.ts        schema SQLite + helper de transação
│   │   ├── auth.ts      cadastro, login, middleware JWT
│   │   ├── boards.ts    quadros, colunas, cartões e movimentação
│   │   └── errors.ts    erros HTTP + tratamento centralizado
│   └── tests/         testes de integração
└── client/            SPA React
    └── src/
        ├── api.ts       cliente HTTP tipado
        ├── auth.tsx     contexto de autenticação
        ├── pages/       Login, Quadros, Quadro
        └── components/  Coluna, Cartão, Modal…
```

**Ordenação dos cartões:** cada cartão tem uma `position` inteira e contígua (0..n-1) dentro da coluna. Mover um cartão roda numa transação que fecha o espaço na coluna de origem e abre na de destino, então a ordem nunca fica com buracos ou duplicada. A interface atualiza de forma otimista e recarrega do servidor se a requisição falhar.

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST   | `/api/auth/register` | Cria conta |
| POST   | `/api/auth/login` | Retorna token JWT |
| GET    | `/api/auth/me` | Usuário logado |
| GET    | `/api/boards` | Lista quadros com contagem de cartões |
| POST   | `/api/boards` | Cria quadro (com colunas padrão) |
| GET    | `/api/boards/:id` | Quadro com colunas e cartões |
| PATCH / DELETE | `/api/boards/:id` | Renomeia / exclui |
| POST   | `/api/boards/:id/columns` | Cria coluna |
| PATCH / DELETE | `/api/columns/:id` | Renomeia / exclui coluna |
| POST   | `/api/columns/:id/cards` | Cria cartão |
| PATCH / DELETE | `/api/cards/:id` | Edita / exclui cartão |
| PATCH  | `/api/cards/:id/move` | Move para `{ columnId, position }` |

## Como rodar

Requer **Node.js 22.13+**.

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3333

Outros comandos:

```bash
npm test        # testes da API
npm run build   # compila API e frontend
```

Variáveis de ambiente (opcionais): `API_PORT` (padrão `3333`), `DB_FILE` (padrão `data/fluxo.db`), `JWT_SECRET` (**defina em produção**).

## Próximos passos

- Reordenar colunas com drag and drop
- Etiquetas coloridas nos cartões
- Compartilhar quadros com outros usuários
- Deploy (Render/Railway para a API, Vercel para o frontend)

## Licença

MIT — veja [LICENSE](LICENSE).

---

Feito por **Arthur Martins** · [LinkedIn](https://linkedin.com/in/arthur-martins-2547553b6) · [GitHub](https://github.com/Artas1337)
