import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

export default function AIStatusIndicator() {
  const [status, setStatus] = useState('checking'); // checking | online | offline

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        await client.get('/menu');
        if (mounted) setStatus('online');
      } catch (err) {
        if (mounted) setStatus('offline');
      }
    }
    check();
    const interval = setInterval(check, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const config = {
    checking: { color: 'bg-muted', text: 'Checking backend…' },
    online: { color: 'bg-herb', text: 'Agent connected' },
    offline: { color: 'bg-sauce', text: 'Backend unreachable' },
  }[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      {config.text}
    </div>
  );
}
