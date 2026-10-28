const mongoose = require('mongoose');

// Cached copy of anime data + a live view counter that powers "Trending now".
const animeSchema = new mongoose.Schema(
  {
    malId: { type: Number, unique: true, index: true },
    title: String,
    titleEnglish: String,
    titleJapanese: String,
    image: String,
    synopsis: String,
    score: Number,
    episodes: Number,
    year: Number,
    status: String,
    type: String,
    genres: [String],
    trailer: String,
    views: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

animeSchema.index({ title: 'text', titleEnglish: 'text', titleJapanese: 'text' });

module.exports = mongoose.model('Anime', animeSchema);
