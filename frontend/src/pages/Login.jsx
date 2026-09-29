import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { email, password });
      localStorage.setItem('smartserve_token', res.data.data.token);
      localStorage.setItem('smartserve_admin', JSON.stringify(res.data.data.admin));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-char-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl text-cream">SmartServe</div>
          <div className="text-sm text-muted mt-1">Kitchen Console</div>
        </div>

        <form onSubmit={handleSubmit} className="ticket p-6 pt-7 space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold-500"
              placeholder="admin@smartserve.ai"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold-500"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sauce text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-500 hover:bg-gold-600 text-char-950 font-medium rounded px-3 py-2 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          Default credentials come from your backend&apos;s .env (ADMIN_EMAIL / ADMIN_PASSWORD) after running{' '}
          <code className="font-mono">npm run seed</code>.
        </p>
        <Link to="/customer/login" className="block text-center text-xs text-gold-400 hover:text-gold-300 mt-4">
          Order food as a customer
        </Link>
      </div>
    </div>
  );
}
