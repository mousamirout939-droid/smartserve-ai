import React, { useEffect, useState } from 'react';
import client from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUSES = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';

  async function load() {
    try {
      const res = await client.get('/orders', { params: filter ? { status: filter } : {} });
      setOrders(res.data.data);
    } catch (err) {
      setError('Could not load orders.');
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [filter]);

  async function updateStatus(order, status) {
    try {
      await client.put(`/orders/${order.orderId}/status`, { status });
      load();
    } catch (err) {
      setError('Failed to update order status.');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-cream">Orders</h1>
        <p className="text-sm text-muted mt-1">Live orders placed through WhatsApp and staff entry.</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`text-xs px-3 py-1.5 rounded border ${!filter ? 'border-gold-500 text-gold-400' : 'border-char-600 text-muted'}`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded border ${filter === s ? 'border-gold-500 text-gold-400' : 'border-char-600 text-muted'}`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {error && <div className="text-sauce text-sm mb-4">{error}</div>}

      <div className="ticket overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-char-700">
              <th className="px-4 py-3 font-normal">Order</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Items</th>
              <th className="px-4 py-3 font-normal">Type</th>
              <th className="px-4 py-3 font-normal">Total</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Update</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b border-char-800 align-top">
                <td className="px-4 py-3">
                  <div className="font-mono text-cream">{o.orderId}</div>
                  <div className="text-xs text-muted">{new Date(o.createdAt).toLocaleString()}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-cream">{o.customerName || 'Unnamed'}</div>
                  <div className="text-xs text-muted font-mono">{o.phone}</div>
                </td>
                <td className="px-4 py-3 text-muted">
                  {o.items.map((it) => (
                    <div key={it.itemName}>
                      {it.itemName} ×{it.quantity}
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3 text-muted">{o.orderType}</td>
                <td className="px-4 py-3 font-mono text-gold-400">{currency}{o.total}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o, e.target.value)}
                    className="bg-char-800 border border-char-600 rounded text-xs px-2 py-1 text-cream"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
