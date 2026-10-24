import { Router } from 'express';
import { z } from 'zod';
import { transaction, type DB } from './db.js';
import { notFound } from './errors.js';
import { requireAuth } from './auth.js';

export interface Board { id: number; user_id: number; title: string; created_at: string }
export interface Column { id: number; board_id: number; title: string; position: number }
export interface Card {
  id: number;
  column_id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  position: number;
  due_date: string | null;
  created_at: string;
}

const DEFAULT_COLUMNS = ['A fazer', 'Em andamento', 'Concluído'];

const id = z.coerce.number().int().positive();
const title = z.string().trim().min(1).max(120);
const priority = z.enum(['low', 'medium', 'high']);

const boardSchema = z.object({ title });
const columnSchema = z.object({ title });
const cardCreateSchema = z.object({
  title,
  description: z.string().max(2000).optional(),
  priority: priority.optional(),
});
const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD')
  .refine((s) => new Date(s).toISOString().startsWith(s), 'Data inválida');
const cardUpdateSchema = cardCreateSchema.partial().extend({ dueDate: dueDate.nullable().optional() });
const moveSchema = z.object({ columnId: id, position: z.number().int().min(0) });

export function boardsRouter(db: DB) {
  const router = Router();
  router.use(requireAuth);

  // --- Consultas com checagem de dono (retornam 404 se o recurso não pertence ao usuário) ---

  const findBoard = (boardId: number, userId: number) => {
    const row = db.prepare('SELECT * FROM boards WHERE id = ? AND user_id = ?').get(boardId, userId);
    if (!row) throw notFound('Quadro');
    return row as unknown as Board;
  };

  const findColumn = (columnId: number, userId: number) => {
    const row = db
      .prepare('SELECT c.* FROM columns c JOIN boards b ON b.id = c.board_id WHERE c.id = ? AND b.user_id = ?')
      .get(columnId, userId);
    if (!row) throw notFound('Coluna');
    return row as unknown as Column;
  };

  const findCard = (cardId: number, userId: number) => {
    const row = db
      .prepare(
        `SELECT k.* FROM cards k
         JOIN columns c ON c.id = k.column_id
         JOIN boards b ON b.id = c.board_id
         WHERE k.id = ? AND b.user_id = ?`,
      )
      .get(cardId, userId);
    if (!row) throw notFound('Cartão');
    return row as unknown as Card;
  };

  const boardWithContent = (board: Board) => {
    const columns = db
      .prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position')
      .all(board.id) as unknown as Column[];
    const cards = db
      .prepare(
        `SELECT k.* FROM cards k JOIN columns c ON c.id = k.column_id
         WHERE c.board_id = ? ORDER BY k.position`,
      )
      .all(board.id) as unknown as Card[];
    return {
      ...board,
      columns: columns.map((col) => ({ ...col, cards: cards.filter((k) => k.column_id === col.id) })),
    };
  };

  // --- Quadros ---

  router.get('/boards', (req, res) => {
    const boards = db
      .prepare(
        `SELECT b.*,
           (SELECT COUNT(*) FROM cards k JOIN columns c ON c.id = k.column_id WHERE c.board_id = b.id) AS card_count,
           (SELECT COUNT(*) FROM cards k JOIN columns c ON c.id = k.column_id
              WHERE c.board_id = b.id AND c.position = (SELECT MAX(position) FROM columns WHERE board_id = b.id)) AS done_count
         FROM boards b WHERE b.user_id = ? ORDER BY b.created_at DESC, b.id DESC`,
      )
      .all(req.userId);
    res.json(boards);
  });

  router.post('/boards', (req, res) => {
    const data = boardSchema.parse(req.body);
    const board = transaction(db, () => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO boards (user_id, title) VALUES (?, ?)')
        .run(req.userId, data.title);
      const insertColumn = db.prepare('INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)');
      DEFAULT_COLUMNS.forEach((name, i) => insertColumn.run(lastInsertRowid, name, i));
      return findBoard(Number(lastInsertRowid), req.userId);
    });
    res.status(201).json(boardWithContent(board));
  });

  router.get('/boards/:id', (req, res) => {
    res.json(boardWithContent(findBoard(id.parse(req.params.id), req.userId)));
  });

  router.patch('/boards/:id', (req, res) => {
    const board = findBoard(id.parse(req.params.id), req.userId);
    const data = boardSchema.parse(req.body);
    db.prepare('UPDATE boards SET title = ? WHERE id = ?').run(data.title, board.id);
    res.json(findBoard(board.id, req.userId));
  });

  router.delete('/boards/:id', (req, res) => {
    const board = findBoard(id.parse(req.params.id), req.userId);
    db.prepare('DELETE FROM boards WHERE id = ?').run(board.id);
    res.status(204).end();
  });

  // --- Colunas ---

  router.post('/boards/:id/columns', (req, res) => {
    const board = findBoard(id.parse(req.params.id), req.userId);
    const data = columnSchema.parse(req.body);
    const { next } = db
      .prepare('SELECT COALESCE(MAX(position) + 1, 0) AS next FROM columns WHERE board_id = ?')
      .get(board.id) as { next: number };
    const { lastInsertRowid } = db
      .prepare('INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)')
      .run(board.id, data.title, next);
    res.status(201).json({ ...findColumn(Number(lastInsertRowid), req.userId), cards: [] });
  });

  router.patch('/columns/:id', (req, res) => {
    const column = findColumn(id.parse(req.params.id), req.userId);
    const data = columnSchema.parse(req.body);
    db.prepare('UPDATE columns SET title = ? WHERE id = ?').run(data.title, column.id);
    res.json(findColumn(column.id, req.userId));
  });

  router.delete('/columns/:id', (req, res) => {
    const column = findColumn(id.parse(req.params.id), req.userId);
    transaction(db, () => {
      db.prepare('DELETE FROM columns WHERE id = ?').run(column.id);
      db.prepare('UPDATE columns SET position = position - 1 WHERE board_id = ? AND position > ?').run(
        column.board_id,
        column.position,
      );
    });
    res.status(204).end();
  });

  // --- Cartões ---

  router.post('/columns/:id/cards', (req, res) => {
    const column = findColumn(id.parse(req.params.id), req.userId);
    const data = cardCreateSchema.parse(req.body);
    const { next } = db
      .prepare('SELECT COALESCE(MAX(position) + 1, 0) AS next FROM cards WHERE column_id = ?')
      .get(column.id) as { next: number };
    const { lastInsertRowid } = db
      .prepare('INSERT INTO cards (column_id, title, description, priority, position) VALUES (?, ?, ?, ?, ?)')
      .run(column.id, data.title, data.description ?? '', data.priority ?? 'medium', next);
    res.status(201).json(findCard(Number(lastInsertRowid), req.userId));
  });

  router.patch('/cards/:id', (req, res) => {
    const card = findCard(id.parse(req.params.id), req.userId);
    const data = cardUpdateSchema.parse(req.body);
    const { dueDate, ...rest } = data;
    const merged = { ...card, ...rest, due_date: dueDate === undefined ? card.due_date : dueDate };
    db.prepare('UPDATE cards SET title = ?, description = ?, priority = ?, due_date = ? WHERE id = ?').run(
      merged.title,
      merged.description,
      merged.priority,
      merged.due_date,
      card.id,
    );
    res.json(findCard(card.id, req.userId));
  });

  router.delete('/cards/:id', (req, res) => {
    const card = findCard(id.parse(req.params.id), req.userId);
    transaction(db, () => {
      db.prepare('DELETE FROM cards WHERE id = ?').run(card.id);
      db.prepare('UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?').run(
        card.column_id,
        card.position,
      );
    });
    res.status(204).end();
  });

  /**
   * Move um cartão para (columnId, position), mantendo as posições contíguas (0..n-1)
   * na coluna de origem e na de destino. Funciona tanto dentro da mesma coluna quanto entre colunas.
   */
  router.patch('/cards/:id/move', (req, res) => {
    const card = findCard(id.parse(req.params.id), req.userId);
    const { columnId, position } = moveSchema.parse(req.body);
    const target = findColumn(columnId, req.userId);
    const source = findColumn(card.column_id, req.userId);
    if (target.board_id !== source.board_id) throw notFound('Coluna');

    transaction(db, () => {
      // Fecha o "buraco" deixado na coluna de origem.
      db.prepare('UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ? AND id != ?').run(
        card.column_id,
        card.position,
        card.id,
      );
      const { total } = db
        .prepare('SELECT COUNT(*) AS total FROM cards WHERE column_id = ? AND id != ?')
        .get(target.id, card.id) as { total: number };
      const pos = Math.min(position, total);
      // Abre espaço na coluna de destino.
      db.prepare('UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ? AND id != ?').run(
        target.id,
        pos,
        card.id,
      );
      db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(target.id, pos, card.id);
    });

    res.json(findCard(card.id, req.userId));
  });

  return router;
}
