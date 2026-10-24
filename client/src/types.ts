export type Priority = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Card {
  id: number;
  column_id: number;
  title: string;
  description: string;
  priority: Priority;
  position: number;
  due_date: string | null;
  created_at: string;
}

export interface Column {
  id: number;
  board_id: number;
  title: string;
  position: number;
  cards: Card[];
}

export interface BoardSummary {
  id: number;
  title: string;
  created_at: string;
  card_count: number;
  done_count: number;
}

export interface Board {
  id: number;
  title: string;
  created_at: string;
  columns: Column[];
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};
