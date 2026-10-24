import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PRIORITY_LABEL, type Card } from '../types';
import { dueStatus } from '../due';

interface Props {
  card: Card;
  onOpen?: (card: Card) => void;
  disabled?: boolean;
}

function DueChip({ date }: { date: string }) {
  const { label, tone } = dueStatus(date);
  return (
    <span className={`due due--${tone}`} title={`Entrega: ${date.split('-').reverse().join('/')}`}>
      {tone === 'late' ? '⚠ ' : ''}
      {label}
    </span>
  );
}

export function CardView({ card, overlay }: { card: Card; overlay?: boolean }) {
  return (
    <div className={`card ${overlay ? 'card--overlay' : ''}`}>
      <div className="card__meta">
        <span className={`badge badge--${card.priority}`}>{PRIORITY_LABEL[card.priority]}</span>
        {card.due_date && <DueChip date={card.due_date} />}
      </div>
      <p className="card__title">{card.title}</p>
      {card.description && (
        <p className="card__desc">{card.description}</p>
      )}
    </div>
  );
}

export function CardItem({ card, onOpen, disabled }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      className={`card-slot ${isDragging ? 'card-slot--dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={() => onOpen?.(card)}
      {...attributes}
      {...listeners}
    >
      <CardView card={card} />
    </li>
  );
}
