import { io } from 'socket.io-client';

// One shared connection. The login token is sent on every (re)connect.
export const socket = io({
  autoConnect: false,
  auth: (cb) => cb({ token: localStorage.getItem('token') }),
});
