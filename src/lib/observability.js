let booted = false;

export async function initObservability() {
  if (booted) return;
  booted = true;

  // Sentry (optional)
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    try {
      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
      });
      // eslint-disable-next-line no-console
      console.log('Sentry initialized');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Sentry init failed:', err);
    }
  }

  // PostHog (optional)
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
  if (posthogKey) {
    try {
      const mod = await import('posthog-js');
      const posthog = mod.default;
      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: true,
        capture_pageleave: true,
      });
      // eslint-disable-next-line no-console
      console.log('PostHog initialized');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('PostHog init failed:', err);
    }
  }
}

