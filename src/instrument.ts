import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  const env = process.env.APP_ENV || "development";
  const fullEnvName = process.env.SENTRY_FAUCET_NAME
    ? process.env.SENTRY_FAUCET_NAME + "-" + env
    : env;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: fullEnvName,
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions

    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });
}
