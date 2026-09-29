import React from 'react';

const styles = {
  PENDING_CONFIRMATION: 'text-gold-400 border-gold-600',
  CONFIRMED: 'text-herb border-herb',
  PREPARING: 'text-gold-400 border-gold-600',
  READY: 'text-herb border-herb',
  OUT_FOR_DELIVERY: 'text-cream border-muted',
  DELIVERED: 'text-herb border-herb',
  CANCELLED: 'text-sauce border-sauce',
};

export default function StatusBadge({ status }) {
  const cls = styles[status] || 'text-muted border-muted';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-mono border rounded ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
