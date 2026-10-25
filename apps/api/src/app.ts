import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './env';
import { co2EstimatePlugin } from './plugins/co2-estimate';
import { corsPlugin } from './plugins/cors';
import { dbPlugin } from './plugins/db';
import { errorHandlerPlugin } from './plugins/error-handler';
import { swaggerPlugin } from './plugins/swagger';
import { wateringCanPlugin } from './plugins/watering-can';
import { routes } from './routes';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);
  await app.register(corsPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(dbPlugin);
  await app.register(wateringCanPlugin);
  await app.register(co2EstimatePlugin);
  // Registered before the routes so it sees them all
  await app.register(swaggerPlugin);
  await app.register(routes, { prefix: '/api' });

  return app;
}
