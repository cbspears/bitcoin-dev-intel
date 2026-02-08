/**
 * tRPC API Handler for Vercel
 * Handles all tRPC requests via the fetch adapter
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appRouter } from '../../src/api/trpc/router';
import { createContext } from '../../src/api/trpc/context';

/**
 * Vercel Edge/Serverless handler for tRPC
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Convert Vercel request to standard Request
  const url = new URL(req.url || '', `http://${req.headers.host}`);

  const request = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  // Handle the request with tRPC
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`tRPC error on path '${path}':`, error);
    },
  });

  // Convert Response to Vercel response
  const body = await response.text();

  // Set headers
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  res.status(response.status).send(body);
}
