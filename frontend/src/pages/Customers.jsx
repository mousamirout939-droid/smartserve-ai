import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';

  useEffect(() => {
    client
      .get('/customers')
      .then((res) => setCustomers(res.data.data))
      .catch(() => setError('Could not load customers.'));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-cream">Customers</h1>
        <p className="text-sm text-muted mt-1">Everyone who has messaged the WhatsApp line.</p>
      </div>

      {error && <div className="text-sauce text-sm mb-4">{error}</div>}

      <div className="ticket overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-char-700">
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Phone</th>
              <th className="px-4 py-3 font-normal">Orders</th>
              <th className="px-4 py-3 font-normal">Total spent</th>
              <th className="px-4 py-3 font-normal">First seen</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id} className="border-b border-char-800">
                <td className="px-4 py-3 text-cream">{c.name || '—'}</td>
                <td className="px-4 py-3 font-mono text-muted">{c.phone}</td>
                <td className="px-4 py-3 text-muted">{c.orderCount}</td>
                <td className="px-4 py-3 font-mono text-gold-400">{currency}{c.totalSpent}</td>
                <td className="px-4 py-3 text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
