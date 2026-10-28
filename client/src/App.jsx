import { useEffect, useState, useCallback, useRef } from 'react';
import { strings, pickTitle } from './i18n';
import * as api from './api';
import { socket } from './socket';
import { useAuth } from './AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AnimeCard from './components/AnimeCard';
import Modal from './components/Modal';
import AuthModal from './components/AuthModal';

export default function App() {
  const { user } = useAuth();
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const [view, setView] = useState('home'); // home | top | watchlist
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [online, setOnline] = useState(0);
  const [trending, setTrending] = useState([]);
  const [toasts, setToasts] = useState([]);
  const reqId = useRef(0);

  const t = strings[lang];

  // refs so socket handlers always see the latest values
  const live = useRef({});
  live.current = { lang, view, debounced };

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 450);
    return () => clearTimeout(id);
  }, [query]);

  // leaving the watchlist when logging out
  useEffect(() => {
    if (!user && view === 'watchlist') setView('home');
  }, [user, view]);

  const watchKey = view === 'watchlist' ? user?.watchlist.join(',') : '';

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setFailed(false);
    try {
      const data = debounced
        ? await api.searchAnime(debounced)
        : view === 'top'
        ? await api.getTop()
        : view === 'watchlist'
        ? await api.getWatchlist()
        : await api.getLatest();
      if (id === reqId.current) setList(data); // ignore out-of-date responses
    } catch {
      if (id === reqId.current) {
        setFailed(true);
        setList([]);
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [debounced, view, watchKey]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- realtime ----------
  const pushToast = useCallback((text) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-2), { id, text }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 6000);
  }, []);

  useEffect(() => {
    api.getTrending().then(setTrending).catch(() => {});

    const onOnline = (n) => setOnline(n);
    const onTrending = (items) => setTrending(items);
    const onReleases = ({ items }) => {
      const { lang, view, debounced } = live.current;
      const first = pickTitle(items[0], lang);
      pushToast(`${strings[lang].newUpdate}: ${first}${items.length > 1 ? ` +${items.length - 1}` : ''}`);
      if (view === 'home' && !debounced) {
        setList((prev) => [...items, ...prev.filter((p) => !items.some((i) => i.malId === p.malId))].slice(0, 24));
      }
    };

    socket.on('online', onOnline);
    socket.on('trending:update', onTrending);
    socket.on('releases:update', onReleases);
    return () => {
      socket.off('online', onOnline);
      socket.off('trending:update', onTrending);
      socket.off('releases:update', onReleases);
    };
  }, [pushToast]);

  const open = async (anime) => {
    setSelected(anime);
    try {
      setSelected(await api.getAnime(anime.malId));
    } catch {}
  };

  const heading = debounced ? t.results(debounced) : view === 'top' ? t.top : view === 'watchlist' ? t.myList : t.latest;
  const isHome = !debounced && view === 'home';
  const featured = isHome && list.length > 0 ? [...list].sort((a, b) => b.score - a.score)[0] : null;
  const emptyText = view === 'watchlist' && !debounced ? t.emptyList : t.noResults;

  return (
    <>
      <Navbar
        t={t} lang={lang} setLang={setLang} online={online}
        view={view} setView={(v) => { setQuery(''); setView(v); }}
        query={query} setQuery={setQuery}
      />

      <main className="page">
        <Hero anime={featured} lang={lang} t={t} onOpen={open} />

        {isHome && trending.length > 0 && (
          <>
            <h3 className="subheading" lang={lang}>{t.trending}</h3>
            <div className="strip">
              {trending.map((a) => (
                <AnimeCard key={a.malId} anime={a} lang={lang} t={t} onOpen={open} badge={a.views} />
              ))}
            </div>
          </>
        )}

        <h2 className="heading" lang={lang}>{heading}</h2>

        {failed && (
          <div className="state">
            <p>{t.error}</p>
            <button className="btn" onClick={load}>{t.retry}</button>
          </div>
        )}

        {!failed && !loading && list.length === 0 && <div className="state"><p>{emptyText}</p></div>}

        <div className="grid">
          {loading
            ? Array.from({ length: 9 }).map((_, i) => <div key={i} className="card skeleton" />)
            : list.map((a) => <AnimeCard key={a.malId} anime={a} lang={lang} t={t} onOpen={open} />)}
        </div>
      </main>

      <Modal anime={selected} lang={lang} t={t} onClose={() => setSelected(null)} />
      <AuthModal t={t} />

      <div className="toasts" aria-live="polite">
        {toasts.map((x) => <div key={x.id} className="toast">{x.text}</div>)}
      </div>
    </>
  );
}
