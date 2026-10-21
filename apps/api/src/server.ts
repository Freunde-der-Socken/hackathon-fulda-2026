import { buildApp } from './app';
import { env } from './env';

const app = await buildApp();

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, 'Shutting down');
    app.close().then(
      () => process.exit(0),
      (err: unknown) => {
        app.log.error({ err }, 'Error during shutdown');
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.error({ err }, 'Failed to start');
  process.exit(1);
}
