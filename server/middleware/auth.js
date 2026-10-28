const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in the environment before starting in production.');
}

// In development, use a per-process random secret instead of a predictable hard-coded value.
// Development tokens expire when the server restarts unless JWT_SECRET is configured locally.
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn('[auth] JWT_SECRET is not set; using a temporary development-only secret.');
}

const sign = (user) =>
  jwt.sign({ id: String(user._id), username: user.username }, SECRET, { expiresIn: '7d' });
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

// Accounts, comments and watchlists need MongoDB.
function needDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database is offline. Start MongoDB to use accounts and comments.' });
  }
  next();
}

module.exports = { sign, verify, requireAuth, needDb };
