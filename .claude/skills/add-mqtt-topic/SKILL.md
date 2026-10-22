---
name: add-mqtt-topic
description: Add an MQTT topic with a typed payload and regenerate the JSON Schema for firmware
---

# Add an MQTT topic

Follow "Publish or subscribe to an MQTT topic" and "Show live MQTT data in a view" in the root `README.md`.

1. Add the topic to `topics` in `packages/contracts/src/mqtt/index.ts` (`<domain>/<id>/<event>`, lowercase, `+` for one wildcard level) with its payload schema. Topics and payloads are defined only there. Payloads are JSON with ISO 8601 timestamps.
2. Run `pnpm --filter @repo/contracts schemas` and commit the changed files in `packages/contracts/schemas/`. CI fails if they are stale.
3. Subscribe or publish through `app.mqtt` (`subscribe` / `publish`), guarded by `app.hasDecorator('mqtt')`. Add a test for the payload schema to `packages/contracts/src/mqtt/index.test.ts`.
4. For live data in a view use `useLiveTopic('<topicKey>')` from `@/composables/useLiveTopic`.
5. Try it with `pnpm infra:up` and the publish command in the README section "Send test messages without hardware". Then run the `verify` skill.
