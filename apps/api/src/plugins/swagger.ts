import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { env } from '../env';

export const swaggerPlugin = fp(
  async (app) => {
    await app.register(swagger, {
      openapi: { info: { title: 'Hackathon API', version: '0.0.0' } },
      transform: jsonSchemaTransform,
    });
    if (env.NODE_ENV === 'development') {
      await app.register(scalar, { routePrefix: '/api/docs' });
    }
  },
  { name: 'swagger' },
);
