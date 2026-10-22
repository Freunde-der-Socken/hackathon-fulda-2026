# @repo/api

Fastify 5 + Zod type provider. Routes live under `/api`, docs at `/api/docs` in development.

## Database (Drizzle + Postgres)

The database is optional: without `DATABASE_URL` the API starts, logs a warning, reports `db: "disabled"` on `GET /api/health`, and routes that need the database should only be registered when `app.hasDecorator('db')`.

```sh
pnpm db:up        # Postgres from compose.yaml
pnpm db:migrate   # apply the SQL files in apps/api/drizzle/ (fails until the first table is generated)
pnpm --filter @repo/api db:seed   # fill src/db/seed.ts first
pnpm dev
```

`DATABASE_URL` comes from `apps/api/.env` (see `.env.example`). Inside the devcontainer it is preset.

### Add a table

1. Create or edit a file in `src/db/schema/` and export it from `src/db/schema/index.ts`. Columns are written in camelCase and stored in snake_case.
2. `pnpm --filter @repo/api db:generate` creates a SQL migration in `drizzle/`. Commit it.
3. `pnpm db:migrate` applies it.
4. Write the Zod schemas for the route in `@repo/contracts`. They are hand-written on purpose, so the API shape isn't tied to the table layout.

For quick experiments `pnpm --filter @repo/api db:push` syncs the schema without a migration file. Don't use it for anything you want to keep, and run `db:generate` before you commit. `db:studio` opens Drizzle Studio.

## MQTT (optional)

Without `MQTT_URL` the API starts, logs a warning and reports `mqtt: "disabled"` on `GET /api/health`. Otherwise `app.mqtt` gives typed, validated access to the broker (Mosquitto from `compose.yaml`, start it with `pnpm mqtt:up`).

Topics and payloads are defined only in `packages/contracts/src/mqtt/index.ts`:

```ts
export const topics = {
  sensorReading: { pattern: 'sensors/+/reading', schema: SensorReading },
} as const;
```

Convention: `<domain>/<id>/<event>`, lowercase, no leading slash. `+` is the only wildcard, and its values are the `params`. `SensorReading` is an example: replace it with the project's own topics.

```ts
// Throws (ZodError) before anything reaches the broker if the payload is invalid
await app.mqtt.publish('sensorReading', ['sensor-1'], {
  deviceId: 'sensor-1',
  value: 21.5,
  unit: '°C',
  ts,
});

// Invalid incoming payloads are logged and dropped, so the handler only sees valid ones
const unsubscribe = await app.mqtt.subscribe('sensorReading', ({ payload, params }) => {
  app.log.info({ payload, params }, 'reading');
});
```

Messages reach the browser through `GET /api/events` ([`routes/events.ts`](src/routes/events.ts)), a Server-Sent Events stream that is only registered when `MQTT_URL` is set. It subscribes to every key in `topics` and sends each valid message as `event: <topicKey>` with `data: { topic, params, payload }`, plus a heartbeat comment every 15 s. The broker stays private. Open streams are ended in a `preClose` hook, otherwise `app.close()` would wait for them forever, and the CORS headers are copied into `writeHead` by hand because a hijacked reply skips Fastify's header handling. On the web side use `useLiveTopic(topicKey)`.
