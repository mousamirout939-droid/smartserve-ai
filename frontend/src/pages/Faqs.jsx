import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

const emptyForm = { question: '', answer: '', category: 'general' };

export default function Faqs() {
  const [faqs, setFaqs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await client.get('/faqs');
      setFaqs(res.data.data);
    } catch (err) {
      setError('Could not load FAQs.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setForm(emptyForm);
    setEditing('new');
  }

  function startEdit(faq) {
    setForm({ question: faq.question, answer: faq.answer, category: faq.category });
    setEditing(faq._id);
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (editing === 'new') await client.post('/faqs', form);
      else await client.put(`/faqs/${editing}`, form);
      setEditing(null);
      load();
    } catch (err) {
      setError('Failed to save FAQ.');
    }
  }

  async function remove(faq) {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await client.delete(`/faqs/${faq._id}`);
      load();
    } catch (err) {
      setError('Failed to delete FAQ.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-cream">FAQs</h1>
          <p className="text-sm text-muted mt-1">What the AI tells customers about hours, delivery, and policy.</p>
        </div>
        <button onClick={startNew} className="bg-gold-500 hover:bg-gold-600 text-char-950 text-sm font-medium rounded px-4 py-2">
          Add FAQ
        </button>
      </div>

      {error && <div className="text-sauce text-sm mb-4">{error}</div>}

      {editing && (
        <form onSubmit={save} className="ticket p-5 pt-6 mb-8 space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Question</label>
            <input
              required
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Answer</label>
            <textarea
              required
              rows={3}
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
              placeholder="hours, delivery, payment, refund…"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-gold-500 hover:bg-gold-600 text-char-950 text-sm font-medium rounded px-4 py-2">
              Save
            </button>
            <button type="button" onClick={() => setEditing(null)} className="text-sm text-muted hover:text-cream px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {faqs.map((f) => (
          <div key={f._id} className="ticket p-4 pt-5">
            <div className="flex justify-between items-start">
              <div className="text-cream font-medium">{f.question}</div>
              <span className="text-xs font-mono text-muted">{f.category}</span>
            </div>
            <p className="text-sm text-muted mt-1">{f.answer}</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => startEdit(f)} className="text-xs text-muted hover:text-cream">
                Edit
              </button>
              <button onClick={() => remove(f)} className="text-xs text-muted hover:text-sauce">
                Delete
              </button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && <div className="text-muted text-sm">No FAQs yet.</div>}
      </div>
    </div>
  );
}
