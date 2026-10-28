const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sign, requireAuth, needDb } = require('../middleware/auth');

const router = express.Router();
router.use(needDb);

const publicUser = (u) => ({ id: String(u._id), username: u.username, email: u.email, watchlist: u.watchlist || [] });

router.post('/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (username.length < 3 || username.length > 20) return res.status(400).json({ message: 'Username must be 3–20 characters.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const taken = await User.findOne({ $or: [{ email }, { username }] });
    if (taken) return res.status(409).json({ message: 'That username or email is already in use.' });

    const user = await User.create({ username, email, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ message: 'Could not create the account. Try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password))) {
      return res.status(401).json({ message: 'Wrong email or password.' });
    }
    res.json({ token: sign(user), user: publicUser(user) });
  } catch {
    res.status(500).json({ message: 'Could not log in. Try again.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
