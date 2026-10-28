const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const sign = (user) => jwt.sign({ id: String(user._id), username: user.username }, SECRET, { expiresIn: '7d' });
const verify = (token) => jwt.verify(token, SECRET);

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in first.' });
  try {
    req.user = verify(token);
    next();
  } catch {
    res.status(401).json({ message: 'Your session expired. Please log in again.' });
  }
}

// Accounts, comments and watchlists need MongoDB
function needDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database is offline. Start MongoDB to use accounts and comments.' });
  }
  next();
}

module.exports = { sign, verify, requireAuth, needDb };
