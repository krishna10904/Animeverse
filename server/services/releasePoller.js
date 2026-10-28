const { jikan, normalize, saveToDb, dedupe } = require('./jikan');

let known = null; // Map(malId -> episodes)

async function check(io) {
  try {
    const json = await jikan('/seasons/now?limit=24&sfw=true', { fresh: true });
    const list = dedupe((json.data || []).map(normalize));
    saveToDb(list);

    if (known) {
      const items = list.filter((a) => !known.has(a.malId) || known.get(a.malId) !== a.episodes);
      if (items.length) {
        console.log(`[poller] ${items.length} release update(s) pushed to clients`);
        io.emit('releases:update', { items });
      }
    }
    known = new Map(list.map((a) => [a.malId, a.episodes]));
  } catch (e) {
    console.warn('[poller] skipped:', e.message);
  }
}

function startPoller(io) {
  const minutes = Number(process.env.POLL_MINUTES) || 5;
  check(io);
  setInterval(() => check(io), minutes * 60 * 1000);
  console.log(`[poller] checking for new releases every ${minutes} min`);
}

module.exports = { startPoller };
