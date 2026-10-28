import { pickTitle } from '../i18n';

export default function AnimeCard({ anime, lang, t, onOpen, badge }) {
  const title = pickTitle(anime, lang);
  return (
    <button className="card" onClick={() => onOpen(anime)} title={title}>
      <img src={anime.image} alt={title} loading="lazy" />
      <div className="card-shade" />
      <div className="card-info">
        <span className="card-title" lang={lang}>{title}</span>
        {badge != null ? (
          <span className="card-ep small">🔥 {badge}</span>
        ) : (
          <span className="card-ep">{anime.episodes || t.unknown}</span>
        )}
      </div>
    </button>
  );
}
