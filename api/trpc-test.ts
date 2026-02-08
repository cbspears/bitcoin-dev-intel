/**
 * Minimal tRPC test endpoint
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // Try importing tRPC
    const { initTRPC } = await import('@trpc/server');

    // Try importing the router
    const { appRouter } = await import('../src/api/trpc/router');

    // Try creating a caller
    const caller = appRouter.createCaller({});

    // Try calling a simple procedure
    const result = await caller.repos.list();

    res.status(200).json({
      success: true,
      trpcLoaded: !!initTRPC,
      routerLoaded: !!appRouter,
      repoCount: result?.length || 0,
    });
  } catch (error) {
    console.error('tRPC test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
