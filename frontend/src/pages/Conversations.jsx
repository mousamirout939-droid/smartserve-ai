import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

export default function Conversations() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/conversations')
      .then((res) => setList(res.data.data))
      .catch(() => setError('Could not load conversations.'));
  }, []);

  async function openConversation(phone) {
    setSelected(phone);
    try {
      const res = await client.get(`/conversations/${phone}`);
      setDetail(res.data.data);
    } catch (err) {
      setError('Could not load conversation detail.');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-cream">Conversations</h1>
        <p className="text-sm text-muted mt-1">Memory the AI agent is using per customer.</p>
      </div>

      {error && <div className="text-sauce text-sm mb-4">{error}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="ticket p-3 pt-4 md:col-span-1 max-h-[600px] overflow-y-auto scrollbar-thin">
          {list.map((c) => (
            <button
              key={c.phone}
              onClick={() => openConversation(c.phone)}
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${
                selected === c.phone ? 'bg-char-700 text-gold-400' : 'text-cream hover:bg-char-800'
              }`}
            >
              <div className="font-mono">{c.phone}</div>
              <div className="text-xs text-muted truncate">
                {c.lastMessage ? c.lastMessage.content : 'No messages'}
              </div>
            </button>
          ))}
          {list.length === 0 && <div className="text-muted text-sm px-3 py-2">No conversations yet.</div>}
        </div>

        <div className="ticket p-4 pt-5 md:col-span-2 max-h-[600px] overflow-y-auto scrollbar-thin">
          {!detail && <div className="text-muted text-sm">Select a conversation to view its history.</div>}
          {detail && (
            <div className="space-y-3">
              {detail.messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                      m.role === 'user' ? 'bg-char-800 text-cream' : 'bg-gold-500/10 text-gold-400 border border-gold-600/40'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {detail.messages.length === 0 && <div className="text-muted text-sm">No messages recorded.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
