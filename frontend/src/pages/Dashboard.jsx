import React, { useEffect, useState } from 'react';
import client from '../api/client.js';
import StatCard from '../components/StatCard.jsx';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [s, i] = await Promise.all([
          client.get('/analytics/dashboard'),
          client.get('/analytics/ai-insights'),
        ]);
        setSummary(s.data.data);
        setInsights(i.data.data);
      } catch (err) {
        setError('Could not load dashboard data. Is the backend running and seeded?');
      }
    }
    load();
  }, []);

  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">Overview</h1>
        <p className="text-sm text-muted mt-1">Today&apos;s activity across the WhatsApp ordering line.</p>
      </div>

      {error && <div className="text-sauce text-sm mb-4">{error}</div>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Today's orders" value={summary.todayOrders} />
            <StatCard label="Today's revenue" value={`${currency}${summary.todayRevenue}`} />
            <StatCard label="Pending confirmation" value={summary.pendingOrders} />
            <StatCard label="Confirmed" value={summary.confirmedOrders} />
            <StatCard label="Cancelled today" value={summary.cancelledOrdersToday} />
            <StatCard label="Active customers (30d)" value={summary.activeCustomers} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="ticket p-5 pt-6">
              <h2 className="text-sm text-muted mb-3">Popular items</h2>
              <div className="space-y-2">
                {summary.popularItems.length === 0 && (
                  <div className="text-sm text-muted">No orders yet.</div>
                )}
                {summary.popularItems.map((item) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span className="text-cream">{item.name}</span>
                    <span className="font-mono text-muted">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {insights && (
              <div className="ticket p-5 pt-6">
                <h2 className="text-sm text-muted mb-3">AI insights</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Avg. order value</span>
                    <span className="font-mono text-cream">{currency}{insights.averageOrderValue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Repeat customers</span>
                    <span className="font-mono text-cream">{insights.repeatCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Peak hour</span>
                    <span className="font-mono text-cream">
                      {insights.peakOrderingHour !== null ? `${insights.peakOrderingHour}:00` : '—'}
                    </span>
                  </div>
                  {insights.insights.map((text, idx) => (
                    <p key={idx} className="text-muted pt-2 border-t border-char-700">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
