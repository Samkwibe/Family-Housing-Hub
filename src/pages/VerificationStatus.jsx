import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Send } from 'lucide-react';

function StatusPill({ ok }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
      <CheckCircle2 className="h-3 w-3" />
      Enabled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
      <XCircle className="h-3 w-3" />
      Disabled
    </span>
  );
}

export default function VerificationStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');
  const [channel, setChannel] = useState('email');
  const [destination, setDestination] = useState('');
  const [adminToken, setAdminToken] = useState('');

  const backendUrl = useMemo(
    () =>
      (
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_BACKEND_URL ||
        'https://family-housing-hub-api.onrender.com'
      ).replace(/\/$/, ''),
    []
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [healthRes, verifyRes, metricsRes] = await Promise.all([
        fetch(`${backendUrl}/api/health`),
        fetch(`${backendUrl}/api/verification/status`),
        fetch(`${backendUrl}/api/verification/metrics`)
      ]);
      const health = await healthRes.json();
      const verification = await verifyRes.json();
      const metricsData = await metricsRes.json();
      setData({ health, verification });
      setMetrics(metricsData);
    } catch (err) {
      setError(err.message || 'Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendResult('');
    try {
      const res = await fetch(`${backendUrl}/api/verification/test-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'x-admin-token': adminToken } : {})
        },
        body: JSON.stringify({ channel, destination })
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Test send failed');
      }
      setSendResult(`Success: ${payload.channel}${payload.message_id ? ` (${payload.message_id})` : ''}`);
      await load();
    } catch (err) {
      setSendResult(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            Verification Status
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Diagnostics for email/SMS/WhatsApp verification and backend rate limits.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Email verification</p>
              <StatusPill ok={Boolean(data.verification?.channels?.email)} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-2">SMS verification</p>
              <StatusPill ok={Boolean(data.verification?.channels?.sms)} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-2">WhatsApp fallback</p>
              <StatusPill ok={Boolean(data.verification?.channels?.whatsapp_fallback)} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Rate limits</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Window</p>
                <p className="font-semibold">{data.verification?.rate_limits?.window_seconds ?? '-'}s</p>
              </div>
              <div>
                <p className="text-gray-500">Max per IP</p>
                <p className="font-semibold">{data.verification?.rate_limits?.max_per_ip ?? '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Max per target</p>
                <p className="font-semibold">{data.verification?.rate_limits?.max_per_target ?? '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Cooldown</p>
                <p className="font-semibold">{data.verification?.rate_limits?.cooldown_seconds ?? '-'}s</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Verification Operations (Admin)</h2>
            <form onSubmit={handleTestSend} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={channel === 'email' ? 'user@example.com' : '(555) 555-0100'}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                required
              />
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Admin token (if required)"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Test Send'}
              </button>
            </form>
            {sendResult && (
              <p className={`mt-3 text-sm ${sendResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {sendResult}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-900 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Rate-Limit Events</h2>
            <div className="space-y-2 max-h-72 overflow-auto">
              {(metrics?.recent_events || []).slice(0, 20).map((evt, idx) => (
                <div key={`${evt.ts}-${idx}`} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold uppercase tracking-wide">{evt.channel}</span>
                    <span className={`${evt.status === 'blocked' ? 'text-red-600' : evt.status === 'failed' ? 'text-orange-600' : 'text-green-600'}`}>
                      {evt.status}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {evt.target || 'n/a'} {evt.reason ? `• ${evt.reason}` : ''}
                  </p>
                  <p className="text-gray-500 mt-1">{evt.ts}</p>
                </div>
              ))}
              {(metrics?.recent_events || []).length === 0 && (
                <p className="text-sm text-gray-500">No recent events yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

