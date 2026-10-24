import { useEffect, useState, type FormEvent } from 'react';
import { PRIORITY_LABEL, type Card, type Priority } from '../types';

interface Props {
  card: Card;
  columnTitle: string;
  onClose: () => void;
  onSave: (data: { title: string; description: string; priority: Priority; dueDate: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export function CardModal({ card, columnTitle, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [priority, setPriority] = useState<Priority>(card.priority);
  const [dueDate, setDueDate] = useState(card.due_date ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    await onSave({ title: title.trim(), description, priority, dueDate: dueDate || null });
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('Excluir este cartão?')) return;
    setBusy(true);
    await onDelete();
    onClose();
  };

  const created = new Date(card.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label="Editar cartão" onSubmit={handleSubmit}>
        <header className="modal__head">
          <p className="eyebrow">Em {columnTitle} · criado em {created}</p>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>×</button>
        </header>

        <input
          className="modal__title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Título"
          autoFocus
        />

        <fieldset className="priority-picker">
          <legend>Prioridade</legend>
          {PRIORITIES.map((p) => (
            <label key={p} className={`chip chip--${p} ${priority === p ? 'chip--active' : ''}`}>
              <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} />
              {PRIORITY_LABEL[p]}
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="due-date">Data de entrega</label>
          <div className="due-field">
            <input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            {dueDate && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDueDate('')}>Remover</button>
            )}
          </div>
        </div>

        <label className="field">
          Descrição
          <textarea
            rows={6}
            maxLength={2000}
            value={description}
            placeholder="Detalhes, links, critérios de pronto…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <footer className="modal__foot">
          <button type="button" className="btn btn--danger-ghost" onClick={handleDelete} disabled={busy}>Excluir</button>
          <div className="spacer" />
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={busy}>Salvar</button>
        </footer>
      </form>
    </div>
  );
}
