import { createContext, useContext, useEffect, useState } from 'react';
import { socket } from './socket';
import * as api from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  // restore session, then open the realtime connection with the right token
  useEffect(() => {
    (async () => {
      if (localStorage.getItem('token')) {
        try {
          setUser((await api.me()).user);
        } catch {
          localStorage.removeItem('token');
        }
      }
      socket.connect();
    })();
    return () => socket.disconnect();
  }, []);

  // watchlist changed in another tab/device -> update here instantly
  useEffect(() => {
    const onList = (list) => setUser((u) => (u ? { ...u, watchlist: list } : u));
    socket.on('watchlist:update', onList);
    return () => socket.off('watchlist:update', onList);
  }, []);

  const finish = ({ token, user }) => {
    localStorage.setItem('token', token);
    setUser(user);
    socket.disconnect().connect(); // reconnect so the server knows who we are
  };

  const value = {
    user,
    authOpen,
    openAuth: () => setAuthOpen(true),
    closeAuth: () => setAuthOpen(false),
    login: async (email, pw) => finish(await api.login(email, pw)),
    register: async (name, email, pw) => finish(await api.register(name, email, pw)),
    logout: () => {
      localStorage.removeItem('token');
      setUser(null);
      socket.disconnect().connect();
    },
    toggleWatch: async (malId) => {
      const list = user.watchlist.includes(malId) ? await api.removeWatch(malId) : await api.addWatch(malId);
      setUser((u) => ({ ...u, watchlist: list }));
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
