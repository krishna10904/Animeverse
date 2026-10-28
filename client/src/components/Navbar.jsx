import { useAuth } from '../AuthContext';

export default function Navbar({ t, lang, setLang, view, setView, query, setQuery, online }) {
  const { user, openAuth, logout } = useAuth();
  return (
    <header className="nav">
      <button className="logo" onClick={() => setView('home')} aria-label="AnimeVerse home">
        anime<span>verse</span>
      </button>

      <nav className="nav-links">
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>{t.home}</button>
        <button className={view === 'top' ? 'active' : ''} onClick={() => setView('top')}>{t.anime}</button>
        {user && (
          <button className={view === 'watchlist' ? 'active' : ''} onClick={() => setView('watchlist')}>{t.watchlist}</button>
        )}
      </nav>

      <div className="nav-right">
        {online > 0 && (
          <span className="online" title="Live visitors">
            <i /> {online} {t.online}
          </span>
        )}

        <div className="lang" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'ja' ? 'on' : ''} onClick={() => setLang('ja')}>日本語</button>
        </div>

        <label className="search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M10 2a8 8 0 105.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
          </svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} />
          {query && <button type="button" className="clear" onClick={() => setQuery('')} aria-label="Clear">×</button>}
        </label>

        {user ? (
          <button className="user-btn" onClick={logout} title={t.logout}>
            <b>{user.username[0].toUpperCase()}</b> {t.logout}
          </button>
        ) : (
          <button className="user-btn primary" onClick={openAuth}>{t.login}</button>
        )}
      </div>
    </header>
  );
}
