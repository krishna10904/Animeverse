const Anime = require('../models/Anime');

const FIELDS = 'malId title titleEnglish titleJapanese image score episodes views';

const getTrending = () =>
  Anime.find({ views: { $gt: 0 } }).sort({ views: -1, updatedAt: -1 }).limit(10).select(FIELDS).lean();

let timer = null;

// +1 view, then tell everyone the leaderboard changed (at most once every 3 seconds)
function bump(io, malId) {
  Anime.updateOne({ malId }, { $inc: { views: 1 } }).exec().catch(() => {});
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    try {
      io.emit('trending:update', await getTrending());
    } catch {}
  }, 3000);
}

module.exports = { getTrending, bump };
