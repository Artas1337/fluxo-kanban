import { useState, type FormEvent } from 'react';

interface Props {
  placeholder: string;
  submitLabel: string;
  triggerLabel: string;
  onSubmit: (value: string) => Promise<unknown> | void;
  className?: string;
}

/** Botão "+ Adicionar" que vira um campo de texto ao ser clicado. */
export function InlineForm({ placeholder, submitLabel, triggerLabel, onSubmit, className }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  if (!open) {
    return (
      <button type="button" className={`add-trigger ${className ?? ''}`} onClick={() => setOpen(true)}>
        <span aria-hidden="true">+</span> {triggerLabel}
      </button>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    await onSubmit(text);
    setValue('');
  };

  return (
    <form className={`inline-form ${className ?? ''}`} onSubmit={handleSubmit}>
      <input
        autoFocus
        value={value}
        maxLength={120}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      />
      <div className="inline-form__actions">
        <button type="submit" className="btn btn--primary btn--sm">{submitLabel}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}
