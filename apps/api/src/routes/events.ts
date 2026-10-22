import { topics, type TopicKey } from '@repo/contracts';
import type { OutgoingHttpHeaders, ServerResponse } from 'node:http';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const HEARTBEAT_MS = 15_000;

/**
 * Server-Sent Events: GET /api/events streams every valid MQTT message as
 * `event: <topicKey>` with `data: { topic, params, payload }`. The browser only talks to the
 * API, so the broker stays private.
 */
export const eventRoutes: FastifyPluginAsyncZod = async (app) => {
  const streams = new Set<ServerResponse>();

  // Open SSE connections are never idle, so without this app.close() would wait for them forever
  app.addHook('preClose', async () => {
    for (const stream of streams) stream.end();
  });

  app.get('/events', async (request, reply) => {
    reply.hijack();
    const raw = reply.raw;
    streams.add(raw);

    const unsubscribers: Array<() => void> = [];
    let closed = false;
    const heartbeat = setInterval(() => raw.write(': ping\n\n'), HEARTBEAT_MS);
    const cleanup = () => {
      closed = true;
      clearInterval(heartbeat);
      for (const off of unsubscribers) off();
      streams.delete(raw);
    };
    request.raw.on('close', cleanup);

    // A hijacked reply skips Fastify's own header handling, so keep the CORS headers by hand
    raw.writeHead(200, {
      ...(reply.getHeaders() as OutgoingHttpHeaders),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    raw.write(': connected\n\n');

    await Promise.all(
      (Object.keys(topics) as TopicKey[]).map(async (key) => {
        const off = await app.mqtt.subscribe(key, ({ topic, params, payload }) => {
          raw.write(`event: ${key}\ndata: ${JSON.stringify({ topic, params, payload })}\n\n`);
        });
        // The client may have left while we were subscribing
        if (closed) off();
        else unsubscribers.push(off);
      }),
    );
  });
};
