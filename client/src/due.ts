export type DueTone = 'late' | 'soon' | 'later';

const DAY = 24 * 60 * 60 * 1000;

function todayUTC() {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Rótulo curto e tom (atrasado / vence em até 2 dias / depois) para uma data AAAA-MM-DD. */
export function dueStatus(iso: string): { label: string; tone: DueTone } {
  const [y, m, d] = iso.split('-').map(Number);
  const diff = Math.round((Date.UTC(y, m - 1, d) - todayUTC()) / DAY);
  if (diff < 0) return { label: diff === -1 ? 'ontem' : `${-diff} dias atrás`, tone: 'late' };
  if (diff === 0) return { label: 'hoje', tone: 'soon' };
  if (diff === 1) return { label: 'amanhã', tone: 'soon' };
  if (diff === 2) return { label: 'em 2 dias', tone: 'soon' };
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  return { label: label.replace('.', ''), tone: 'later' };
}
