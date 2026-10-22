import type { Board, BoardSummary, Card, Column, Priority, User } from './types';

const TOKEN_KEY = 'fluxo.token';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* armazenamento indisponível: sessão dura só até recarregar */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* idem */
    }
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Disparado quando a API responde 401 numa rota autenticada. */
export const LOGOUT_EVENT = 'fluxo:logout';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      tokenStore.clear();
      window.dispatchEvent(new Event(LOGOUT_EVENT));
    }
    throw new ApiError(res.status, data.error ?? 'Algo deu errado. Tente novamente.');
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

interface AuthResponse {
  token: string;
  user: User;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/register', { name, email, password }),
  login: (email: string, password: string) => request<AuthResponse>('POST', '/auth/login', { email, password }),
  me: () => request<{ user: User }>('GET', '/auth/me'),

  listBoards: () => request<BoardSummary[]>('GET', '/boards'),
  createBoard: (title: string) => request<Board>('POST', '/boards', { title }),
  getBoard: (id: number) => request<Board>('GET', `/boards/${id}`),
  renameBoard: (id: number, title: string) => request<Board>('PATCH', `/boards/${id}`, { title }),
  deleteBoard: (id: number) => request<void>('DELETE', `/boards/${id}`),

  createColumn: (boardId: number, title: string) => request<Column>('POST', `/boards/${boardId}/columns`, { title }),
  renameColumn: (id: number, title: string) => request<Column>('PATCH', `/columns/${id}`, { title }),
  deleteColumn: (id: number) => request<void>('DELETE', `/columns/${id}`),

  createCard: (columnId: number, title: string) => request<Card>('POST', `/columns/${columnId}/cards`, { title }),
  updateCard: (id: number, data: Partial<{ title: string; description: string; priority: Priority }>) =>
    request<Card>('PATCH', `/cards/${id}`, data),
  deleteCard: (id: number) => request<void>('DELETE', `/cards/${id}`),
  moveCard: (id: number, columnId: number, position: number) =>
    request<Card>('PATCH', `/cards/${id}/move`, { columnId, position }),
};
