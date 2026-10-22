import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Logo } from './Logo';

export function Topbar({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const initials = user?.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="topbar">
      <Link to="/" className="topbar__brand"><Logo /></Link>
      <div className="topbar__center">{children}</div>
      <div className="topbar__user">
        <span className="avatar" title={user?.email}>{initials}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>Sair</button>
      </div>
    </header>
  );
}
