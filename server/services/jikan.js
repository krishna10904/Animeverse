const mongoose = require('mongoose');
const Anime = require('../models/Anime');

const JIKAN = 'https://api.jikan.moe/v4';
const cache = new Map();
const TTL = 10 * 60 * 1000; // stay friendly with Jikan's rate limit

const dbReady = () => mongoose.connection.readyState === 1;

function normalize(a) {
  return {
    malId: a.mal_id,
    title: a.title,
    titleEnglish: a.title_english || a.title,
    titleJapanese: a.title_japanese || a.title,
    image:
      a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || '',
    synopsis: a.synopsis || '',
    score: a.score || 0,
    episodes: a.episodes || 0,
    year: a.year || a.aired?.prop?.from?.year || null,
    status: a.status || '',
    type: a.type || '',
    genres: (a.genres || []).map((g) => g.name),
    trailer: a.trailer?.url || '',
  };
}

async function jikan(path, { fresh = false } = {}) {
  const hit = cache.get(path);
  if (!fresh && hit && Date.now() - hit.t < TTL) return hit.data;
  const res = await fetch(`${JIKAN}${path}`);
  if (!res.ok) throw new Error(`Jikan responded ${res.status}`);
  const json = await res.json();
  cache.set(path, { t: Date.now(), data: json });
  return json;
}

async function saveToDb(list) {
  if (!dbReady() || !list.length) return;
  try {
    await Anime.bulkWrite(
      list.map((a) => ({ updateOne: { filter: { malId: a.malId }, update: { $set: a }, upsert: true } })),
      { ordered: false }
    );
  } catch (e) {
    console.warn('Cache write skipped:', e.message);
  }
}

const dedupe = (list) => {
  const seen = new Set();
  return list.filter((a) => (seen.has(a.malId) ? false : seen.add(a.malId)));
};

module.exports = { jikan, normalize, saveToDb, dedupe, dbReady };
