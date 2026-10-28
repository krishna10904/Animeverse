# AnimeVerse (MERN + real time)

Anime browser with English / 日本語 switch, now with a **real-time backend** built on Socket.io.

## Real-time features
| Feature | How it works |
|---|---|
| Live visitors counter | server broadcasts `online` on every connect / disconnect |
| "N watching now" per anime | each anime is a Socket.io room (`anime:<id>`) |
| Live comments + typing indicator | REST `POST` saves to MongoDB, server emits `comment:new` to the room |
| New-release push notifications | server polls Jikan every `POLL_MINUTES` and emits `releases:update` |
| Trending now leaderboard | every opened anime gets +1 view, server emits `trending:update` |
| Watchlist sync across tabs/devices | server emits `watchlist:update` to the user's private room |

## REST API
```
POST   /api/auth/register            {username,email,password}
POST   /api/auth/login               {email,password}
GET    /api/auth/me                  (Bearer token)

GET    /api/anime/latest | /top | /search?q=
GET    /api/anime/trending/now
GET    /api/anime/:id                (also counts a view)
GET    /api/anime/:id/comments
POST   /api/anime/:id/comments       {text}          (login)
DELETE /api/anime/:id/comments/:cid                  (login, own comments)

GET    /api/watchlist                                (login)
POST   /api/watchlist/:malId  |  DELETE /api/watchlist/:malId   (login)

GET    /api/health
GET    /api/dev/simulate-release     (dev only: fakes a new-episode push)
```

## Socket events
```
client -> server : anime:join(id)  anime:leave(id)  typing(id)
server -> client : online  viewers  typing  comment:new  comment:deleted
                   releases:update  trending:update  watchlist:update
```

## Run it
MongoDB is **required** now (accounts, comments, trending). Local MongoDB or a free Atlas cluster both work.

```bash
npm run install-all
cp server/.env.example server/.env      # Windows: copy server\.env.example server\.env
npm run dev
```
Open http://localhost:5173

## See the real-time in action
1. Open the site in **two browser windows**; the online counter shows 2.
2. Create an account in each, open the same anime in both, and post a comment. It appears in both instantly.
3. Open http://localhost:5000/api/dev/simulate-release; a "New update" toast pops up in every window.

## Production
```bash
npm run build
npm start      # API + sockets + built site on http://localhost:5000
```
Set a strong `JWT_SECRET` and `NODE_ENV=production` when you deploy. Use a host that supports WebSockets (Render, Railway, Fly.io).
