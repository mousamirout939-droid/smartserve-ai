import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import customerClient from '../api/customerClient.js';

const emptyForm = { name: '', email: '', password: '', phone: '', address: '' };

export default function CustomerLogin() {
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = registering ? '/customer-auth/register' : '/customer-auth/login';
      const payload = registering ? form : { email: form.email, password: form.password };
      const response = await customerClient.post(endpoint, payload);
      localStorage.setItem('smartserve_customer_token', response.data.data.token);
      localStorage.setItem('smartserve_customer', JSON.stringify(response.data.data.customer));
      navigate('/order');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-char-900 px-4 py-10 text-cream">
      <div className="mx-auto max-w-5xl grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <section className="hidden lg:block">
          <p className="text-xs uppercase tracking-[0.25em] text-gold-400">SmartServe Kitchen</p>
          <h1 className="font-display text-6xl leading-none mt-4 max-w-lg">Good food, on your time.</h1>
          <p className="mt-5 max-w-md text-muted leading-relaxed">Browse today&apos;s menu, place your order, and keep an eye on the minutes until it reaches your table.</p>
          <div className="mt-8 flex gap-3 text-xs text-muted">
            <span className="border border-char-600 px-3 py-2">Freshly prepared</span>
            <span className="border border-char-600 px-3 py-2">Live order updates</span>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-7">
            <div className="font-display text-3xl">SmartServe</div>
            <p className="text-sm text-muted mt-1">{registering ? 'Create your guest account' : 'Welcome back to the table'}</p>
          </div>

          <form onSubmit={submit} className="ticket p-6 pt-7 space-y-4">
            {registering && (
              <>
                <Field label="Your name" value={form.name} onChange={(value) => update('name', value)} required />
                <Field label="Phone number" value={form.phone} onChange={(value) => update('phone', value)} required />
                <Field label="Delivery address (optional)" value={form.address} onChange={(value) => update('address', value)} />
              </>
            )}
            <Field label="Email" type="email" value={form.email} onChange={(value) => update('email', value)} required />
            <Field label="Password" type="password" value={form.password} onChange={(value) => update('password', value)} required />

            {error && <div className="text-sauce text-sm">{error}</div>}
            <button disabled={loading} className="w-full bg-gold-500 hover:bg-gold-600 text-char-950 font-medium px-4 py-3 transition-colors disabled:opacity-60">
              {loading ? 'Please wait…' : registering ? 'Create account' : 'Sign in and order'}
            </button>
          </form>

          <button onClick={() => { setRegistering(!registering); setError(''); }} className="w-full text-sm text-muted hover:text-gold-400 mt-4">
            {registering ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </button>
          <Link to="/login" className="block text-center text-xs text-muted hover:text-cream mt-6">Kitchen staff sign in</Link>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-char-800 border border-char-600 px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold-500" />
    </label>
  );
}
