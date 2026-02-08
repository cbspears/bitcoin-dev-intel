/**
 * tRPC Context
 * Creates the context for tRPC procedures
 */

import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

/**
 * Creates the tRPC context for each request
 * This is where you would add things like:
 * - Database connections
 * - Authentication data
 * - Request metadata
 */
export function createContext(opts?: FetchCreateContextFnOptions) {
  return {
    // Add context properties here as needed
    // For example: user session, request headers, etc.
    headers: opts?.resHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
