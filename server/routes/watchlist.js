const express = require('express');
const User = require('../models/User');
const Anime = require('../models/Anime');
const { requireAuth, needDb } = require('../middleware/auth');

const router = express.Router();
router.use(needDb, requireAuth);

// Update + push the new list to every open tab/device of this user in real time
async function change(req, res, op) {
  const malId = Number(req.params.malId);
  if (!malId) return res.status(400).json({ message: 'Invalid id' });
  const user = await User.findByIdAndUpdate(req.user.id, { [op]: { watchlist: malId } }, { new: true });
  req.app.get('io').to(`user:${req.user.id}`).emit('watchlist:update', user.watchlist);
  res.json(user.watchlist);
}

router.get('/', async (req, res) => {
  const user = await User.findById(req.user.id);
  const docs = await Anime.find({ malId: { $in: user.watchlist } }).select('-synopsis').lean();
  docs.sort((a, b) => user.watchlist.indexOf(b.malId) - user.watchlist.indexOf(a.malId)); // newest first
  res.json(docs);
});

router.post('/:malId', (req, res) => change(req, res, '$addToSet'));
router.delete('/:malId', (req, res) => change(req, res, '$pull'));

module.exports = router;
