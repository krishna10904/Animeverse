import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function AuthModal({ t }) {
  const { authOpen, closeAuth, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!authOpen) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.username, form.email, form.password);
      closeAuth();
      setForm({ username: '', email: '', password: '' });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={closeAuth}>
      <form className="auth" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="modal-close" onClick={closeAuth} aria-label={t.close}>×</button>
        <h2>{mode === 'login' ? t.login : t.register}</h2>

        {mode === 'register' && (
          <label>{t.username}<input value={form.username} onChange={set('username')} required minLength={3} maxLength={20} autoComplete="username" /></label>
        )}
        <label>{t.email}<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>{t.password}<input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>

        {err && <p className="form-err" role="alert">{err}</p>}

        <button className="btn" disabled={busy}>{mode === 'login' ? t.login : t.register}</button>
        <button type="button" className="link" onClick={() => { setErr(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
          {mode === 'login' ? t.noAccount : t.haveAccount}
        </button>
      </form>
    </div>
  );
}
