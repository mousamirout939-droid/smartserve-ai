import React from 'react';

export default function Settings() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">Settings</h1>
        <p className="text-sm text-muted mt-1">Environment and integration status.</p>
      </div>

      <div className="ticket p-5 pt-6 space-y-4 max-w-xl">
        <div>
          <div className="text-xs text-muted mb-1">Backend API URL</div>
          <div className="font-mono text-sm text-cream">{apiUrl}</div>
          <p className="text-xs text-muted mt-1">
            Set <code className="font-mono">VITE_API_URL</code> in the frontend&apos;s <code className="font-mono">.env</code>{' '}
            to point at your deployed backend.
          </p>
        </div>

        <div className="border-t border-char-700 pt-4">
          <div className="text-xs text-muted mb-2">Credentials required on the backend</div>
          <ul className="text-sm text-cream space-y-1 list-disc list-inside">
            <li>WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN (Meta for Developers)</li>
            <li>OPENAI_API_KEY (platform.openai.com)</li>
            <li>MONGO_URI (MongoDB Atlas connection string)</li>
            <li>JWT_SECRET (any long random string)</li>
          </ul>
          <p className="text-xs text-muted mt-2">
            These live in <code className="font-mono">backend/.env</code> — see the README for exact setup steps.
          </p>
        </div>
      </div>
    </div>
  );
}
