export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <defs>
          <linearGradient id="fluxo-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff9a3c" />
            <stop offset="1" stopColor="#ff4d0d" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#fluxo-logo-grad)" />
        <rect x="7" y="8" width="5" height="16" rx="2" fill="#fff" />
        <rect x="14" y="8" width="5" height="11" rx="2" fill="#fff" opacity=".85" />
        <rect x="21" y="8" width="5" height="7" rx="2" fill="#fff" opacity=".7" />
      </svg>
      Fluxo
    </span>
  );
}
