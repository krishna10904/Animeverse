require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { initSockets } = require('./sockets');
const { startPoller } = require('./services/releasePoller');
const Anime = require('./models/Anime');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = initSockets(server);
app.set('io', io);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/anime', require('./routes/anime'));
app.get('/api/health', (req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1, online: io.engine.clientsCount })
);

// Dev helper: pretend a new episode just dropped, so you can see the live push without waiting
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/dev/simulate-release', async (req, res) => {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Needs MongoDB.' });
    const [item] = await Anime.aggregate([{ $sample: { size: 1 } }]);
    if (!item) return res.status(404).json({ message: 'Open the site once first so anime get cached.' });
    io.emit('releases:update', { items: [item] });
    res.json({ pushed: item.title });
  });
}

// Serve the built React app in production
const dist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(dist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(dist, 'index.html'), (err) => err && next());
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/animeverse', { serverSelectionTimeoutMS: 4000 })
  .then(() => console.log('MongoDB connected'))
  .catch((e) => console.warn('MongoDB not connected (browsing works; accounts, comments and trending need it):', e.message));

server.listen(PORT, () => {
  console.log(`API + realtime server on http://localhost:${PORT}`);
  startPoller(io);
});
