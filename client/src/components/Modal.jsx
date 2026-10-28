import { useEffect, useState } from 'react';
import { pickTitle } from '../i18n';
import { socket } from '../socket';
import * as api from '../api';
import { useAuth } from '../AuthContext';
import Comments from './Comments';

export default function Modal({ anime, lang, t, onClose }) {
  const { user, openAuth, toggleWatch } = useAuth();
  const [viewers, setViewers] = useState(0);
  const [streaming, setStreaming] = useState([]);
  const [streamingLoading, setStreamingLoading] = useState(false);
  const malId = anime?.malId;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Load licensed/official streaming-provider pages separately from trailer metadata.
  useEffect(() => {
    if (!malId) {
      setStreaming([]);
      setStreamingLoading(false);
      return;
    }

    let active = true;
    setStreaming([]);
    setStreamingLoading(true);
    api.getStreamingProviders(malId)
      .then((items) => {
        if (active) setStreaming(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (active) setStreaming([]);
      })
      .finally(() => {
        if (active) setStreamingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [malId]);

  // join this anime's live room: viewer count + comments
  useEffect(() => {
    if (!malId) return;
    setViewers(0);
    const join = () => socket.emit('anime:join', malId);
    const onViewers = ({ malId: id, count }) => id === malId && setViewers(count);
    join();
    socket.on('connect', join); // re-join after a reconnect
    socket.on('viewers', onViewers);
    return () => {
      socket.off('connect', join);
      socket.off('viewers', onViewers);
      socket.emit('anime:leave', malId);
    };
  }, [malId]);

  if (!anime) return null;
  const title = pickTitle(anime, lang);
  const sub = lang === 'ja' ? anime.titleEnglish : anime.titleJapanese;
  const saved = user?.watchlist?.includes(malId);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label={t.close}>×</button>
        <img src={anime.image} alt={title} className="modal-img" />
        <div className="modal-body">
          <h2 lang={lang}>{title}</h2>
          {sub && sub !== title && <p className="sub" lang={lang === 'ja' ? 'en' : 'ja'}>{sub}</p>}
          {viewers > 0 && <span className="viewers"><i /> {t.watching(viewers)}</span>}

          <dl className="facts">
            <div><dt>{t.score}</dt><dd>{anime.score ? `★ ${anime.score}` : '–'}</dd></div>
            <div><dt>{t.episodes}</dt><dd>{anime.episodes || t.unknown}</dd></div>
            <div><dt>{t.year}</dt><dd>{anime.year || '–'}</dd></div>
            <div><dt>{t.status}</dt><dd>{anime.status || '–'}</dd></div>
          </dl>

          <div className="chips">{anime.genres?.map((g) => <span key={g}>{g}</span>)}</div>

          <h3>{t.synopsis}</h3>
          <p className="syn">{anime.synopsis || t.noSynopsis}</p>

          <div className="actions">
            <button
              className={`btn ${saved ? 'ghost' : ''}`}
              onClick={() => (user ? toggleWatch(malId).catch(() => {}) : openAuth())}
            >
              {saved ? `✓ ${t.inList}` : `＋ ${t.addList}`}
            </button>
            {anime.trailer && (
              <a className="btn ghost" href={anime.trailer} target="_blank" rel="noreferrer">▶ {t.trailer}</a>
            )}
          </div>

          {(streamingLoading || streaming.length > 0) && (
            <section className="streaming-section">
              <h3>{t.watchOn}</h3>
              {streamingLoading ? (
                <p className="sub">{t.loadingStreams}</p>
              ) : (
                <div className="actions">
                  {streaming.map((provider) => (
                    <a
                      key={provider.url}
                      className="btn ghost"
                      href={provider.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ▶ {t.watchOn} {provider.name}
                    </a>
                  ))}
                </div>
              )}
              <p className="sub">{t.streamingNote}</p>
            </section>
          )}

          <Comments malId={malId} t={t} />
        </div>
      </div>
    </div>
  );
}
