import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db.js';

let app: Express;

beforeEach(() => {
  app = createApp(openDatabase(':memory:'));
});

async function signUp(email = 'ana@teste.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Ana', email, password: 'segredo123' });
  return { token: res.body.token as string, auth: { Authorization: `Bearer ${res.body.token}` } };
}

async function createBoard(auth: Record<string, string>, title = 'Projeto') {
  const res = await request(app).post('/api/boards').set(auth).send({ title });
  return res.body;
}

describe('autenticação', () => {
  it('cadastra, faz login e retorna o usuário logado', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ANA@teste.com', password: 'segredo123' });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toEqual({ id: 1, name: 'Ana', email: 'ana@teste.com' });

    const login = await request(app).post('/api/auth/login').send({ email: 'ana@teste.com', password: 'segredo123' });
    expect(login.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.body.user.email).toBe('ana@teste.com');
  });

  it('rejeita e-mail duplicado, senha errada e dados inválidos', async () => {
    await signUp();
    const dup = await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@teste.com', password: '123456' });
    expect(dup.status).toBe(409);

    const wrong = await request(app).post('/api/auth/login').send({ email: 'ana@teste.com', password: 'errada' });
    expect(wrong.status).toBe(401);

    const invalid = await request(app).post('/api/auth/register').send({ name: 'A', email: 'x', password: '1' });
    expect(invalid.status).toBe(400);
    expect(Object.keys(invalid.body.details)).toEqual(['name', 'email', 'password']);
  });

  it('bloqueia rotas protegidas sem token', async () => {
    expect((await request(app).get('/api/boards')).status).toBe(401);
    expect((await request(app).get('/api/boards').set('Authorization', 'Bearer lixo')).status).toBe(401);
  });
});

describe('quadros', () => {
  it('cria quadro com as colunas padrão', async () => {
    const { auth } = await signUp();
    const board = await createBoard(auth);
    expect(board.columns.map((c: { title: string }) => c.title)).toEqual(['A fazer', 'Em andamento', 'Concluído']);

    const list = await request(app).get('/api/boards').set(auth);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].card_count).toBe(0);
  });

  it('isola os dados entre usuários', async () => {
    const ana = await signUp('ana@teste.com');
    const bia = await signUp('bia@teste.com');
    const board = await createBoard(ana.auth);

    expect((await request(app).get(`/api/boards/${board.id}`).set(bia.auth)).status).toBe(404);
    expect((await request(app).delete(`/api/boards/${board.id}`).set(bia.auth)).status).toBe(404);
    const col = board.columns[0].id;
    expect((await request(app).post(`/api/columns/${col}/cards`).set(bia.auth).send({ title: 'x' })).status).toBe(404);
  });

  it('exclui quadro em cascata', async () => {
    const { auth } = await signUp();
    const board = await createBoard(auth);
    await request(app).post(`/api/columns/${board.columns[0].id}/cards`).set(auth).send({ title: 'x' });
    expect((await request(app).delete(`/api/boards/${board.id}`).set(auth)).status).toBe(204);
    expect((await request(app).get('/api/boards').set(auth)).body).toEqual([]);
  });
});

describe('cartões', () => {
  async function setup() {
    const { auth } = await signUp();
    const board = await createBoard(auth);
    const [todo, doing] = board.columns;
    const titles = ['A', 'B', 'C'];
    const cards = [];
    for (const title of titles) {
      cards.push((await request(app).post(`/api/columns/${todo.id}/cards`).set(auth).send({ title })).body);
    }
    const titlesIn = async (columnIndex: number) => {
      const res = await request(app).get(`/api/boards/${board.id}`).set(auth);
      return res.body.columns[columnIndex].cards.map((k: { title: string; position: number }) => `${k.title}${k.position}`);
    };
    return { auth, board, todo, doing, cards, titlesIn };
  }

  it('cria cartões em ordem e edita campos', async () => {
    const { auth, cards, titlesIn } = await setup();
    expect(await titlesIn(0)).toEqual(['A0', 'B1', 'C2']);

    const res = await request(app).patch(`/api/cards/${cards[1].id}`).set(auth).send({ priority: 'high', description: 'urgente' });
    expect(res.body).toMatchObject({ title: 'B', priority: 'high', description: 'urgente' });
  });

  it('reordena dentro da mesma coluna', async () => {
    const { auth, todo, cards, titlesIn } = await setup();
    await request(app).patch(`/api/cards/${cards[0].id}/move`).set(auth).send({ columnId: todo.id, position: 2 });
    expect(await titlesIn(0)).toEqual(['B0', 'C1', 'A2']);
    await request(app).patch(`/api/cards/${cards[0].id}/move`).set(auth).send({ columnId: todo.id, position: 0 });
    expect(await titlesIn(0)).toEqual(['A0', 'B1', 'C2']);
  });

  it('move entre colunas mantendo posições contíguas', async () => {
    const { auth, doing, cards, titlesIn } = await setup();
    await request(app).patch(`/api/cards/${cards[1].id}/move`).set(auth).send({ columnId: doing.id, position: 0 });
    await request(app).patch(`/api/cards/${cards[0].id}/move`).set(auth).send({ columnId: doing.id, position: 99 });
    expect(await titlesIn(0)).toEqual(['C0']);
    expect(await titlesIn(1)).toEqual(['B0', 'A1']);
  });

  it('reorganiza posições ao excluir', async () => {
    const { auth, cards, titlesIn } = await setup();
    await request(app).delete(`/api/cards/${cards[0].id}`).set(auth);
    expect(await titlesIn(0)).toEqual(['B0', 'C1']);
  });
});
