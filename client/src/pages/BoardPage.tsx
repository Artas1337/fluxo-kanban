import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { api } from '../api';
import { Topbar } from '../components/Topbar';
import { KanbanColumn } from '../components/KanbanColumn';
import { CardView } from '../components/CardItem';
import { CardModal } from '../components/CardModal';
import { EditableTitle } from '../components/EditableTitle';
import { InlineForm } from '../components/InlineForm';
import { dueStatus } from '../due';
import { PRIORITY_LABEL, type Board, type Card, type Column, type Priority } from '../types';

type DndId = string | number;
const cardIdOf = (id: DndId) => Number(String(id).replace('card-', ''));

export function BoardPage() {
  const boardId = Number(useParams().id);
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [openCardId, setOpenCardId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const dragOrigin = useRef<number | null>(null);

  const reload = useCallback(() => {
    api
      .getBoard(boardId)
      .then(setBoard)
      .catch((e) => (e.status === 404 ? navigate('/', { replace: true }) : setError(e.message)));
  }, [boardId, navigate]);

  useEffect(reload, [reload]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filtering = query.trim() !== '' || priorityFilter !== 'all';
  const visibleCards = useCallback(
    (column: Column) => {
      if (!filtering) return column.cards;
      const q = query.trim().toLowerCase();
      return column.cards.filter(
        (c) =>
          (priorityFilter === 'all' || c.priority === priorityFilter) &&
          (!q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
      );
    },
    [filtering, query, priorityFilter],
  );

  const stats = useMemo(() => {
    const all = board?.columns.flatMap((c) => c.cards) ?? [];
    const last = board?.columns.at(-1);
    const pending = all.filter((c) => c.column_id !== last?.id);
    return {
      total: all.length,
      done: last?.cards.length ?? 0,
      high: all.filter((c) => c.priority === 'high').length,
      late: pending.filter((c) => c.due_date && dueStatus(c.due_date).tone === 'late').length,
    };
  }, [board]);

  if (error) return <><Topbar /><p className="form-error page-error">{error}</p></>;
  if (!board) return <><Topbar /><div className="splash">Carregando quadro…</div></>;

  // ---------- helpers de estado ----------

  const updateColumns = (fn: (cols: Column[]) => Column[]) =>
    setBoard((b) => (b ? { ...b, columns: fn(b.columns) } : b));

  const columnOf = (id: DndId): Column | undefined => {
    const key = String(id);
    if (key.startsWith('col-')) return board.columns.find((c) => c.id === Number(key.slice(4)));
    const cardId = cardIdOf(id);
    return board.columns.find((c) => c.cards.some((k) => k.id === cardId));
  };

  const findCard = (cardId: number) => board.columns.flatMap((c) => c.cards).find((k) => k.id === cardId);

  // ---------- drag and drop ----------

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveCard(findCard(cardIdOf(active.id)) ?? null);
    dragOrigin.current = columnOf(active.id)?.id ?? null;
  };

  /** Ao passar por cima de outra coluna, move o cartão para lá imediatamente (feedback visual). */
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = columnOf(active.id);
    const to = columnOf(over.id);
    if (!from || !to || from.id === to.id) return;

    const cardId = cardIdOf(active.id);
    updateColumns((cols) => {
      const card = cols.find((c) => c.id === from.id)!.cards.find((k) => k.id === cardId)!;
      const target = cols.find((c) => c.id === to.id)!;
      const overIndex = String(over.id).startsWith('card-')
        ? target.cards.findIndex((k) => k.id === cardIdOf(over.id))
        : -1;
      const index = overIndex >= 0 ? overIndex : target.cards.length;
      return cols.map((c) => {
        if (c.id === from.id) return { ...c, cards: c.cards.filter((k) => k.id !== cardId) };
        if (c.id === to.id) {
          const moved = { ...card, column_id: to.id };
          return { ...c, cards: [...c.cards.slice(0, index), moved, ...c.cards.slice(index)] };
        }
        return c;
      });
    });
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveCard(null);
    const column = columnOf(active.id);
    if (!over || !column) {
      if (dragOrigin.current !== column?.id) reload();
      return;
    }

    const cardId = cardIdOf(active.id);
    const oldIndex = column.cards.findIndex((k) => k.id === cardId);
    const overIndex = column.cards.findIndex((k) => k.id === cardIdOf(over.id));
    const newIndex = String(over.id).startsWith('card-') && overIndex >= 0 ? overIndex : oldIndex;

    const changedColumn = dragOrigin.current !== column.id;
    if (!changedColumn && oldIndex === newIndex) return;

    if (oldIndex !== newIndex) {
      updateColumns((cols) =>
        cols.map((c) => (c.id === column.id ? { ...c, cards: arrayMove(c.cards, oldIndex, newIndex) } : c)),
      );
    }
    try {
      await api.moveCard(cardId, column.id, newIndex);
    } catch {
      reload(); // servidor é a fonte da verdade: se falhar, volta ao estado real
    }
  };

  // ---------- ações ----------

  const addCard = async (columnId: number, title: string) => {
    const card = await api.createCard(columnId, title);
    updateColumns((cols) => cols.map((c) => (c.id === columnId ? { ...c, cards: [...c.cards, card] } : c)));
  };

  const addColumn = async (title: string) => {
    const column = await api.createColumn(board.id, title);
    updateColumns((cols) => [...cols, column]);
  };

  const renameColumn = async (columnId: number, title: string) => {
    updateColumns((cols) => cols.map((c) => (c.id === columnId ? { ...c, title } : c)));
    await api.renameColumn(columnId, title).catch(reload);
  };

  const deleteColumn = async (column: Column) => {
    const msg = column.cards.length
      ? `Excluir "${column.title}" e seus ${column.cards.length} cartões?`
      : `Excluir a coluna "${column.title}"?`;
    if (!confirm(msg)) return;
    updateColumns((cols) => cols.filter((c) => c.id !== column.id));
    await api.deleteColumn(column.id).catch(reload);
  };

  const renameBoard = async (title: string) => {
    setBoard((b) => (b ? { ...b, title } : b));
    await api.renameBoard(board.id, title).catch(reload);
  };

  const openCard = openCardId !== null ? findCard(openCardId) : undefined;
  const openCardColumn = openCard && board.columns.find((c) => c.id === openCard.column_id);

  return (
    <>
      <Topbar>
        <Link to="/" className="crumb">Quadros</Link>
        <span className="crumb-sep">/</span>
        <EditableTitle as="h1" value={board.title} className="board-title" onSave={renameBoard} />
      </Topbar>

      <div className="toolbar">
        <div className="toolbar__stats">
          <span><strong>{stats.total}</strong> cartões</span>
          <span><strong>{stats.done}</strong> concluídos</span>
          <span className="stat--high"><strong>{stats.high}</strong> alta prioridade</span>
          {stats.late > 0 && <span className="stat--late"><strong>{stats.late}</strong> atrasado(s)</span>}
        </div>
        <div className="toolbar__filters">
          <input
            type="search"
            className="search"
            placeholder="Buscar cartões…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            aria-label="Filtrar por prioridade"
          >
            <option value="all">Todas as prioridades</option>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </div>
      </div>
      {filtering && <p className="filter-note">Filtro ativo — arrastar fica desativado até limpar a busca.</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveCard(null);
          reload();
        }}
      >
        <main className="board">
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={visibleCards(column)}
              dragDisabled={filtering}
              onAddCard={addCard}
              onRename={renameColumn}
              onDelete={deleteColumn}
              onOpenCard={(card) => setOpenCardId(card.id)}
            />
          ))}
          <div className="column column--ghost">
            <InlineForm triggerLabel="Nova coluna" placeholder="Nome da coluna" submitLabel="Criar" onSubmit={addColumn} />
          </div>
        </main>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
          {activeCard && <CardView card={activeCard} overlay />}
        </DragOverlay>
      </DndContext>

      {openCard && openCardColumn && (
        <CardModal
          card={openCard}
          columnTitle={openCardColumn.title}
          onClose={() => setOpenCardId(null)}
          onSave={async (data) => {
            const updated = await api.updateCard(openCard.id, data);
            updateColumns((cols) =>
              cols.map((c) => ({ ...c, cards: c.cards.map((k) => (k.id === updated.id ? updated : k)) })),
            );
          }}
          onDelete={async () => {
            await api.deleteCard(openCard.id);
            updateColumns((cols) => cols.map((c) => ({ ...c, cards: c.cards.filter((k) => k.id !== openCard.id) })));
          }}
        />
      )}
    </>
  );
}
