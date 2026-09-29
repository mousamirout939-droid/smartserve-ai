import React from 'react';

export default function StatCard({ label, value, sublabel }) {
  return (
    <div className="ticket p-5 pt-6">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-display text-3xl text-cream mt-1">{value}</div>
      {sublabel && <div className="text-xs text-muted mt-1">{sublabel}</div>}
    </div>
  );
}
