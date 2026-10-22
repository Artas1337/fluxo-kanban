export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <rect x="7" y="8" width="5" height="16" rx="2" fill="#fff" />
        <rect x="14" y="8" width="5" height="11" rx="2" fill="#fff" opacity=".85" />
        <rect x="21" y="8" width="5" height="7" rx="2" fill="#fff" opacity=".7" />
      </svg>
      Fluxo
    </span>
  );
}
