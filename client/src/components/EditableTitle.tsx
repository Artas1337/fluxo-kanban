import { useEffect, useState } from 'react';

interface Props {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  as?: 'h1' | 'h3';
}

/** Título que vira campo editável com duplo clique. Enter salva, Esc cancela. */
export function EditableTitle({ value, onSave, className, as: Tag = 'h3' }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    setEditing(false);
    const text = draft.trim();
    if (text && text !== value) onSave(text);
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className={`title-input ${className ?? ''}`}
        value={draft}
        maxLength={120}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <Tag className={className} title="Duplo clique para renomear" onDoubleClick={() => setEditing(true)}>
      {value}
    </Tag>
  );
}
