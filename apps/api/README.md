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

Without `MQTT_URL` the API starts, logs a warning, reports `mqtt: "disabled"` on `GET /api/health`, and `GET /api/events` doesn't exist. Otherwise `app.mqtt` gives typed, validated access to the broker (Mosquitto from `compose.yaml`).

```sh
pnpm mqtt:up         # broker
pnpm dev
pnpm mqtt:simulate   # fake readings every second
curl -N localhost:3000/api/events   # the live stream
```

Topics and payloads are defined only in `packages/contracts/src/mqtt/index.ts`:

```ts
export const topics = {
  sensorReading: { pattern: 'sensors/+/reading', schema: SensorReading },
} as const;
```

Convention: `<domain>/<id>/<event>`, lowercase, no leading slash. `+` is the only wildcard, and its values are the `params`.

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

### Messages in the browser: Server-Sent Events

`GET /api/events` streams every valid message as `event: <topicKey>` with `data: { topic, params, payload }`. The browser only talks to the API, it works through the Vite proxy, and the broker stays private (no WebSocket port or auth to expose). In the web app use the `useLiveTopic` composable (see `apps/web/README.md`).

To add a topic, add it to `topics` in the contracts. The plugin, the simulator and `/api/events` pick it up from there (the simulator only publishes `sensorReading`, so extend `apps/api/scripts/simulate.ts` too).
