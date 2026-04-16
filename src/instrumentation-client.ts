if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("@sentry/nextjs").then((Sentry) => {
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
            tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
            environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
        });
    });
}
