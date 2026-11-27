function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '127.0.0.1',
  databaseUrl: req('DATABASE_URL', 'postgres://duplimancy:duplimancy@localhost:5432/duplimancy'),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  gcInactiveDays: Number(process.env.GC_INACTIVE_DAYS ?? 270),
  spaces: process.env.SPACES_BUCKET
    ? {
        endpoint: req('SPACES_ENDPOINT'),
        region: req('SPACES_REGION'),
        bucket: req('SPACES_BUCKET'),
        key: req('SPACES_KEY'),
        secret: req('SPACES_SECRET'),
        publicUrl: req('SPACES_PUBLIC_URL').replace(/\/$/, ''),
      }
    : null,
};
