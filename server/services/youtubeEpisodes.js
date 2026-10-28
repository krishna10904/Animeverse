const DEFAULT_CHANNELS = [
  // Official Muse Asia channel
  'UCGbshtvS9t-8CW11W7TooQg',
  // Official Ani-One India channel
  'UC67pLBZ_z4Gd46t6mW7uHjA',
];

const API_BASE = 'https://www.googleapis.com/youtube/v3';

const isConfigured = () => Boolean(process.env.YOUTUBE_API_KEY);

function getChannelIds() {
  const configured = (process.env.YOUTUBE_OFFICIAL_CHANNEL_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_CHANNELS;
}

async function searchOfficialEpisodes(title) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const queryTitle = String(title || '').trim().slice(0, 120);
  if (!queryTitle) return [];

  const channels = getChannelIds();
  const results = await Promise.all(channels.map(async (channelId) => {
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      type: 'video',
      channelId,
      q: `${queryTitle} episode`,
      maxResults: '8',
      order: 'relevance',
      videoEmbeddable: 'true',
      videoDuration: 'long',
      safeSearch: 'strict',
    });

    const res = await fetch(`${API_BASE}/search?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      // Never log the request URL because it contains the API key.
      throw new Error(`YouTube Data API responded ${res.status}`);
    }

    const json = await res.json();
    return (json.items || []).flatMap((item) => {
      const videoId = item.id?.videoId;
      const snippet = item.snippet;
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '') || !snippet?.title) return [];
      return [{
        videoId,
        title: snippet.title,
        channelTitle: snippet.channelTitle || 'Official channel',
        publishedAt: snippet.publishedAt || null,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        // Build embed URLs only from validated YouTube video IDs.
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      }];
    });
  }));

  const seen = new Set();
  return results.flat().filter((item) => {
    if (seen.has(item.videoId)) return false;
    seen.add(item.videoId);
    return true;
  });
}

module.exports = { isConfigured, searchOfficialEpisodes };
