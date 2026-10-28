import { pickTitle } from '../i18n';

export default function Hero({ anime, lang, t, onOpen }) {
  if (!anime) return null;
  return (
    <section
      className="hero"
      onClick={() => onOpen(anime)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(anime)}
    >
      <img src={anime.image} alt="" className="hero-bg" />
      <div className="hero-shade" />
      <div className="hero-body">
        <span className="hero-tag">{t.heroLabel}</span>
        <h1 lang={lang}>{pickTitle(anime, lang)}</h1>
        <p>{(anime.synopsis || t.noSynopsis).slice(0, 180)}…</p>
        <div className="hero-meta">
          {anime.score > 0 && <b>★ {anime.score}</b>}
          {anime.type && <span>{anime.type}</span>}
          {anime.genres.slice(0, 3).map((g) => (
            <span key={g}>{g}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
