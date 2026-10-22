import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Topbar } from '../components/Topbar';
import { InlineForm } from '../components/InlineForm';
import type { BoardSummary } from '../types';

export function BoardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listBoards().then(setBoards).catch((e) => setError(e.message));
  }, []);

  const createBoard = async (title: string) => {
    const board = await api.createBoard(title);
    navigate(`/boards/${board.id}`);
  };

  const deleteBoard = async (board: BoardSummary) => {
    if (!confirm(`Excluir o quadro "${board.title}" e todos os cartões?`)) return;
    await api.deleteBoard(board.id);
    setBoards((prev) => prev?.filter((b) => b.id !== board.id) ?? null);
  };

  const firstName = user?.name.split(' ')[0];

  return (
    <>
      <Topbar />
      <main className="boards">
        <div className="boards__head">
          <div>
            <p className="eyebrow">Olá, {firstName}</p>
            <h1>Seus quadros</h1>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="boards__grid">
          <div className="board-tile board-tile--new">
            <InlineForm
              triggerLabel="Novo quadro"
              placeholder="Ex.: TCC, Freelas, Estudos…"
              submitLabel="Criar"
              onSubmit={createBoard}
            />
          </div>

          {boards === null && !error && [0, 1, 2].map((i) => <div key={i} className="board-tile board-tile--skeleton" />)}

          {boards?.map((board) => {
            const pct = board.card_count ? Math.round((board.done_count / board.card_count) * 100) : 0;
            return (
              <article key={board.id} className="board-tile">
                <Link to={`/boards/${board.id}`} className="board-tile__link">
                  <h2>{board.title}</h2>
                  <p className="muted">
                    {board.card_count} {board.card_count === 1 ? 'cartão' : 'cartões'} · {pct}% concluído
                  </p>
                  <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </Link>
                <button
                  type="button"
                  className="icon-btn board-tile__delete"
                  aria-label={`Excluir ${board.title}`}
                  onClick={() => deleteBoard(board)}
                >
                  ×
                </button>
              </article>
            );
          })}
        </div>

        {boards?.length === 0 && (
          <p className="empty">Nenhum quadro ainda. Crie o primeiro — ele já vem com as colunas A fazer, Em andamento e Concluído.</p>
        )}
      </main>
    </>
  );
}
