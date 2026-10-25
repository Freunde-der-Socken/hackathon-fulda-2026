import type { z } from 'zod';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T extends z.ZodType>(
  method: Method,
  path: string,
  response: T,
  body?: unknown,
): Promise<z.infer<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    // No Content-Type without a body: fetch would send `undefined` as text, which Fastify rejects
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    // Error bodies follow ErrorResponse from @repo/contracts, but don't depend on it being valid
    const detail = await res.json().then(
      (json: { message?: unknown }) => (typeof json.message === 'string' ? json.message : ''),
      () => '',
    );
    throw new ApiError(res.status, `${method} ${path} failed: ${res.status} ${detail}`.trim());
  }
  // A malformed response throws a ZodError here instead of failing silently later
  return response.parse(await res.json());
}

export const apiGet = <R extends z.ZodType>(path: string, response: R) =>
  request('GET', path, response);

export const apiDelete = <R extends z.ZodType>(path: string, response: R) =>
  request('DELETE', path, response);

/** Validates `body` against `bodySchema` before it is sent, and the response against `response`. */
const withBody =
  (method: 'POST' | 'PUT' | 'PATCH') =>
  <B extends z.ZodType, R extends z.ZodType>(
    path: string,
    bodySchema: B,
    body: z.input<B>,
    response: R,
  ) =>
    request(method, path, response, bodySchema.parse(body));

export const apiPost = withBody('POST');
export const apiPut = withBody('PUT');
export const apiPatch = withBody('PATCH');
