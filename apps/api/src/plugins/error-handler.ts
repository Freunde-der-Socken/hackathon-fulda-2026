import type { ErrorResponse } from '@repo/contracts';
import type { FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { STATUS_CODES } from 'node:http';

const body = (statusCode: number, message: string): ErrorResponse => ({
  statusCode,
  error: STATUS_CODES[statusCode] ?? 'Error',
  message,
});

export const errorHandlerPlugin = fp(
  async (app) => {
    app.setErrorHandler((error: FastifyError, request, reply) => {
      if (hasZodFastifySchemaValidationErrors(error)) {
        const issues = error.validation.map((issue) => ({
          path: issue.instancePath.split('/').filter(Boolean),
          message: issue.message ?? 'Invalid value',
        }));
        const response: ErrorResponse = { ...body(400, 'Request validation failed'), issues };
        return reply.status(400).send(response);
      }

      const statusCode = error.statusCode ?? 500;
      if (statusCode >= 500) {
        // Log the full error, but never send internals to the client
        request.log.error({ err: error }, 'Unhandled error');
        return reply.status(500).send(body(500, 'Internal Server Error'));
      }
      return reply.status(statusCode).send(body(statusCode, error.message));
    });

    app.setNotFoundHandler((request, reply) =>
      reply.status(404).send(body(404, `Route ${request.method}:${request.url} not found`)),
    );
  },
  { name: 'error-handler' },
);
