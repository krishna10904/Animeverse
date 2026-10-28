import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import { useAuth } from '../AuthContext';
import { getComments, postComment, deleteComment } from '../api';

export default function Comments({ malId, t }) {
  const { user, openAuth } = useAuth();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState('');
  const [err, setErr] = useState('');
  const lastTyping = useRef(0);

  useEffect(() => {
    let alive = true;
    getComments(malId).then((d) => alive && setItems(d)).catch(() => {});

    const onNew = (c) => c.malId === malId && setItems((p) => (p.some((x) => x._id === c._id) ? p : [c, ...p]));
    const onDel = ({ id }) => setItems((p) => p.filter((x) => x._id !== id));
    let timer;
    const onTyping = ({ malId: id, username }) => {
      if (id !== malId) return;
      setTyping(username);
      clearTimeout(timer);
      timer = setTimeout(() => setTyping(''), 2000);
    };

    socket.on('comment:new', onNew);
    socket.on('comment:deleted', onDel);
    socket.on('typing', onTyping);
    return () => {
      alive = false;
      clearTimeout(timer);
      socket.off('comment:new', onNew);
      socket.off('comment:deleted', onDel);
      socket.off('typing', onTyping);
    };
  }, [malId]);

  const onChange = (e) => {
    setText(e.target.value);
    if (Date.now() - lastTyping.current > 1500) {
      lastTyping.current = Date.now();
      socket.emit('typing', malId);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setErr('');
    try {
      await postComment(malId, text); // the live event adds it to everyone's screen
      setText('');
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <section className="comments">
      <h3>{t.comments} <span className="live-dot" /></h3>

      {user ? (
        <form onSubmit={send} className="comment-form">
          <input value={text} onChange={onChange} placeholder={t.writeComment} maxLength={500} />
          <button className="btn" disabled={!text.trim()}>{t.post}</button>
        </form>
      ) : (
        <button className="link" onClick={openAuth}>{t.loginToComment}</button>
      )}

      {err && <p className="form-err">{err}</p>}
      <p className="typing">{typing ? t.typing(typing) : '\u00a0'}</p>

      <ul>
        {items.length === 0 && <li className="empty">{t.noComments}</li>}
        {items.map((c) => (
          <li key={c._id}>
            <b>{c.username}</b>
            <time>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            <p>{c.text}</p>
            {user && c.user === user.id && (
              <button className="del" onClick={() => deleteComment(malId, c._id).catch(() => {})}>{t.del}</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
