import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import { env } from '../env';

export const corsPlugin = fp(
  async (app) => {
    await app.register(cors, {
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    });
  },
  { name: 'cors' },
);
