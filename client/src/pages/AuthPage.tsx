import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { Logo } from '../components/Logo';
import { isCommonEmail, PASSWORD_RULES } from '../validation';

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    if (mode === 'register') {
      if (!isCommonEmail(email)) {
        return setError('Use um e-mail de um provedor comum (Gmail, Outlook, Hotmail, iCloud, Yahoo…)');
      }
      if (!PASSWORD_RULES.every((r) => r.test(password))) return setError('A senha ainda não atende todos os requisitos');
    }
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(String(form.get('name')), email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setBusy(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <main className="auth">
      <section className="auth__hero">
        <Logo />
        <h1>
          Organize o trabalho.<br />
          <em>Mova o que importa.</em>
        </h1>
        <p>Quadros Kanban com arrastar e soltar, prioridades e foco no que está andando.</p>
        <div className="auth__preview" aria-hidden="true">
          {[['A fazer', 3], ['Fazendo', 2], ['Feito', 4]].map(([t, n]) => (
            <div key={t} className="auth__preview-col">
              <span>{t}</span>
              {Array.from({ length: n as number }, (_, i) => <i key={i} style={{ width: `${60 + ((i * 17) % 35)}%` }} />)}
            </div>
          ))}
        </div>
      </section>

      <section className="auth__panel">
        <form className="auth__form" onSubmit={handleSubmit}>
          <h2>{isLogin ? 'Entrar' : 'Criar conta'}</h2>
          <p className="muted">{isLogin ? 'Bem-vindo de volta.' : 'Leva menos de um minuto.'}</p>

          {!isLogin && (
            <label>
              Nome
              <input name="name" required minLength={2} autoComplete="name" />
            </label>
          )}
          <label>
            E-mail
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={isLogin ? 1 : 10}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={isLogin ? undefined : 'password-rules'}
            />
          </label>
          {!isLogin && (
            <ul id="password-rules" className="pw-rules">
              {PASSWORD_RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.label} className={ok ? 'is-ok' : ''}>
                    <span aria-hidden="true">{ok ? '✓' : '•'}</span> {r.label}
                  </li>
                );
              })}
            </ul>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'Aguarde…' : isLogin ? 'Entrar' : 'Criar conta'}
          </button>

          <p className="auth__switch">
            {isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              className="link"
              onClick={() => {
                setMode(isLogin ? 'register' : 'login');
                setError('');
              }}
            >
              {isLogin ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
