/**
 * tRPC Client Configuration
 * Sets up the tRPC client for use in React components
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpLink, loggerLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '../api/trpc/router';

// =============================================================================
// tRPC React Hooks
// =============================================================================

/**
 * tRPC React hooks for type-safe API calls
 * Usage: trpc.bips.list.useQuery(), trpc.repos.list.useQuery(), etc.
 */
export const trpc = createTRPCReact<AppRouter>();

// =============================================================================
// Client Factory
// =============================================================================

/**
 * Get the base URL for API calls
 * Handles both client-side and server-side rendering
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return '';
  }

  // SSR should use vercel url or localhost
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Development fallback
  return `http://localhost:${process.env.PORT ?? 5173}`;
}

/**
 * Create the tRPC client with configured links
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      // Log queries in development
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error),
      }),
      // HTTP requests (no batching - our simple handler doesn't support it)
      httpLink({
        url: `${getBaseUrl()}/api/trpc`,
      }),
    ],
  });
}

// =============================================================================
// Query Client
// =============================================================================

/**
 * Create a React Query client with default options
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: 1 minute
        staleTime: 60 * 1000,
        // Cache time: 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry failed requests up to 3 times
        retry: 3,
        // Don't refetch on window focus in development
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  });
}

// =============================================================================
// Type Exports
// =============================================================================

export type { AppRouter };
