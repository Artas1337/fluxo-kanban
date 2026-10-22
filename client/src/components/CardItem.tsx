import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PRIORITY_LABEL, type Card } from '../types';

interface Props {
  card: Card;
  onOpen?: (card: Card) => void;
  disabled?: boolean;
}

export function CardView({ card, overlay }: { card: Card; overlay?: boolean }) {
  return (
    <div className={`card ${overlay ? 'card--overlay' : ''}`}>
      <span className={`badge badge--${card.priority}`}>{PRIORITY_LABEL[card.priority]}</span>
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
