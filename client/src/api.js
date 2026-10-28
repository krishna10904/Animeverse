async function request(url, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const body = (obj) => ({ method: 'POST', body: JSON.stringify(obj) });

export const getLatest = () => request('/api/anime/latest');
export const getTop = () => request('/api/anime/top');
export const searchAnime = (q) => request(`/api/anime/search?q=${encodeURIComponent(q)}`);
export const getAnime = (id) => request(`/api/anime/${id}`);
export const getStreamingProviders = (id) => request(`/api/anime/${id}/streaming`);
export const getEpisodes = (id, title) => request(`/api/anime/${id}/episodes?title=${encodeURIComponent(title || '')}`);
export const getTrending = () => request('/api/anime/trending/now');

export const getComments = (id) => request(`/api/anime/${id}/comments`);
export const postComment = (id, text) => request(`/api/anime/${id}/comments`, body({ text }));
export const deleteComment = (id, cid) => request(`/api/anime/${id}/comments/${cid}`, { method: 'DELETE' });

export const register = (username, email, password) => request('/api/auth/register', body({ username, email, password }));
export const login = (email, password) => request('/api/auth/login', body({ email, password }));
export const me = () => request('/api/auth/me');

export const getWatchlist = () => request('/api/watchlist');
export const addWatch = (id) => request(`/api/watchlist/${id}`, { method: 'POST' });
export const removeWatch = (id) => request(`/api/watchlist/${id}`, { method: 'DELETE' });
