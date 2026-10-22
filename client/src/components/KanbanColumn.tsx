import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Card, Column } from '../types';
import { CardItem } from './CardItem';
import { EditableTitle } from './EditableTitle';
import { InlineForm } from './InlineForm';

interface Props {
  column: Column;
  cards: Card[];
  dragDisabled: boolean;
  onAddCard: (columnId: number, title: string) => Promise<unknown>;
  onRename: (columnId: number, title: string) => void;
  onDelete: (column: Column) => void;
  onOpenCard: (card: Card) => void;
}

export function KanbanColumn({ column, cards, dragDisabled, onAddCard, onRename, onDelete, onOpenCard }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}` });

  return (
    <section className={`column ${isOver ? 'column--over' : ''}`}>
      <header className="column__head">
        <EditableTitle value={column.title} className="column__title" onSave={(t) => onRename(column.id, t)} />
        <span className="count">{cards.length}</span>
        <button
          type="button"
          className="icon-btn column__delete"
          aria-label={`Excluir coluna ${column.title}`}
          onClick={() => onDelete(column)}
        >
          ×
        </button>
      </header>

      <SortableContext items={cards.map((c) => `card-${c.id}`)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="column__cards">
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onOpen={onOpenCard} disabled={dragDisabled} />
          ))}
          {cards.length === 0 && <li className="column__empty">Solte cartões aqui</li>}
        </ul>
      </SortableContext>

      <InlineForm
        triggerLabel="Adicionar cartão"
        placeholder="O que precisa ser feito?"
        submitLabel="Adicionar"
        onSubmit={(title) => onAddCard(column.id, title)}
      />
    </section>
  );
}
