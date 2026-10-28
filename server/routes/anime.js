const express = require('express');
const Anime = require('../models/Anime');
const Comment = require('../models/Comment');
const { jikan, normalize, saveToDb, dedupe, dbReady } = require('../services/jikan');
const { getTrending, bump } = require('../services/trending');
const { requireAuth, needDb } = require('../middleware/auth');

const router = express.Router();

async function respond(res, path, dbFallback) {
  try {
    const json = await jikan(path);
    const list = dedupe((json.data || []).map(normalize));
    saveToDb(list);
    res.json(list);
  } catch (err) {
    console.warn(err.message);
    if (dbReady() && dbFallback) return res.json(await dbFallback());
    res.status(502).json({ message: 'Could not reach the anime data source. Try again in a moment.' });
  }
}

router.get('/latest', (req, res) =>
  respond(res, '/seasons/now?limit=24&sfw=true', () => Anime.find().sort({ updatedAt: -1 }).limit(24).lean())
);

router.get('/top', (req, res) =>
  respond(res, '/top/anime?limit=24&sfw=true', () => Anime.find().sort({ score: -1 }).limit(24).lean())
);

router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  respond(res, `/anime?q=${encodeURIComponent(q)}&limit=24&sfw=true&order_by=popularity`, () =>
    Anime.find({ $text: { $search: q } }).limit(24).lean()
  );
});

// Live leaderboard of most-viewed anime
router.get('/trending/now', async (req, res) => {
  if (!dbReady()) return res.json([]);
  res.json(await getTrending());
});

// ---- comments (REST writes, Socket.io broadcasts) ----
const lastPost = new Map(); // userId -> timestamp, basic anti-spam

router.get('/:id/comments', needDb, async (req, res) => {
  const comments = await Comment.find({ malId: Number(req.params.id) }).sort({ createdAt: -1 }).limit(50).lean();
  res.json(comments);
});

router.post('/:id/comments', needDb, requireAuth, async (req, res) => {
  const malId = Number(req.params.id);
  const text = String(req.body.text || '').trim();
  if (!malId) return res.status(400).json({ message: 'Invalid id' });
  if (!text || text.length > 500) return res.status(400).json({ message: 'Comment must be 1–500 characters.' });

  const now = Date.now();
  if (now - (lastPost.get(req.user.id) || 0) < 2000) {
    return res.status(429).json({ message: 'Slow down a little before posting again.' });
  }
  lastPost.set(req.user.id, now);

  const comment = await Comment.create({ malId, user: req.user.id, username: req.user.username, text });
  const payload = comment.toObject();
  req.app.get('io').to(`anime:${malId}`).emit('comment:new', payload);
  res.status(201).json(payload);
});

router.delete('/:id/comments/:commentId', needDb, requireAuth, async (req, res) => {
  const comment = await Comment.findOneAndDelete({ _id: req.params.commentId, user: req.user.id });
  if (!comment) return res.status(404).json({ message: 'Comment not found.' });
  req.app.get('io').to(`anime:${comment.malId}`).emit('comment:deleted', { id: String(comment._id), malId: comment.malId });
  res.json({ ok: true });
});

// ---- details (also counts a view) ----
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  try {
    const json = await jikan(`/anime/${id}/full`);
    const item = normalize(json.data);
    await saveToDb([item]);
    if (dbReady()) bump(req.app.get('io'), id);
    res.json(item);
  } catch {
    const cached = dbReady() ? await Anime.findOne({ malId: id }).lean() : null;
    if (cached) return res.json(cached);
    res.status(404).json({ message: 'Anime not found' });
  }
});

module.exports = router;
