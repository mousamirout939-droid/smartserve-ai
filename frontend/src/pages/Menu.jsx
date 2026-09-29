import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

const emptyForm = {
  itemCode: '',
  name: '',
  category: '',
  description: '',
  price: '',
  imageUrl: '',
  available: true,
};

export default function Menu() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // item being edited, or 'new'
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      const res = await client.get('/menu');
      setItems(res.data.data);
    } catch (err) {
      setError('Could not load menu.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setForm(emptyForm);
    setEditing('new');
  }

  function startEdit(item) {
    setForm({
      itemCode: item.itemCode,
      name: item.name,
      category: item.category,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      available: item.available,
    });
    setEditing(item._id);
  }

  async function toggleAvailable(item) {
    try {
      await client.put(`/menu/${item._id}`, { available: !item.available });
      load();
    } catch (err) {
      setError('Failed to update availability.');
    }
  }

  async function deleteItem(item) {
    if (!confirm(`Delete ${item.name}? This can't be undone.`)) return;
    try {
      await client.delete(`/menu/${item._id}`);
      load();
    } catch (err) {
      setError('Failed to delete item.');
    }
  }

  async function saveForm(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, price: Number(form.price) };
    try {
      if (editing === 'new') {
        await client.post('/menu', payload);
      } else {
        await client.put(`/menu/${editing}`, payload);
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save item.');
    }
  }

  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';
  const grouped = items.reduce((acc, i) => {
    acc[i.category] = acc[i.category] || [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-cream">Menu</h1>
          <p className="text-sm text-muted mt-1">Changes here apply to the AI agent immediately.</p>
        </div>
        <button
          onClick={startNew}
          className="bg-gold-500 hover:bg-gold-600 text-char-950 text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          Add item
        </button>
      </div>

      {error && <div className="text-sauce text-sm mb-4">{error}</div>}

      {editing && (
        <form onSubmit={saveForm} className="ticket p-5 pt-6 mb-8 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">Item code</label>
            <input
              required
              value={form.itemCode}
              onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
              placeholder="M011"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Category</label>
            <input
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Price ({currency})</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted mb-1">Image URL</label>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="w-full bg-char-800 border border-char-600 rounded px-3 py-2 text-sm text-cream"
              placeholder="https://…"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              id="available"
            />
            <label htmlFor="available" className="text-sm text-cream">
              Available
            </label>
          </div>
          <div className="md:col-span-2 flex gap-3 pt-2">
            <button type="submit" className="bg-gold-500 hover:bg-gold-600 text-char-950 text-sm font-medium rounded px-4 py-2">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-sm text-muted hover:text-cream px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {Object.keys(grouped).map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="text-sm text-muted mb-3">{cat}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grouped[cat].map((item) => (
              <div key={item._id} className="ticket p-4 pt-5">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded mb-3" />
                )}
                <div className="flex justify-between items-start">
                  <div className="text-cream font-medium">{item.name}</div>
                  <div className="font-mono text-gold-400">{currency}{item.price}</div>
                </div>
                <p className="text-xs text-muted mt-1 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`text-xs px-2 py-1 rounded border ${
                      item.available ? 'text-herb border-herb' : 'text-sauce border-sauce'
                    }`}
                  >
                    {item.available ? 'Available' : 'Unavailable'}
                  </button>
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(item)} className="text-xs text-muted hover:text-cream">
                      Edit
                    </button>
                    <button onClick={() => deleteItem(item)} className="text-xs text-muted hover:text-sauce">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
