/**
 * tRPC API Handler for Vercel
 * Uses standalone adapter for serverless compatibility
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appRouter } from '../../src/api/trpc/router';

/**
 * Vercel Serverless handler for tRPC
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Extract procedure path from URL
    // URL: /api/trpc/repos.list -> path: repos.list
    const urlPath = req.url || '';
    const procedurePath = urlPath.replace(/^\/api\/trpc\/?/, '').split('?')[0];

    if (!procedurePath) {
      res.status(400).json({ error: 'Missing procedure path' });
      return;
    }

    // Parse input from query string (for GET) or body (for POST)
    let input: unknown = undefined;
    if (req.method === 'GET' && req.query.input) {
      try {
        input = JSON.parse(req.query.input as string);
      } catch {
        // No input or invalid JSON
      }
    } else if (req.method === 'POST' && req.body) {
      input = req.body;
    }

    // Create a minimal caller
    const caller = appRouter.createCaller({});

    // Navigate to the procedure
    const pathParts = procedurePath.split('.');
    let procedure: unknown = caller;

    for (const part of pathParts) {
      if (procedure && typeof procedure === 'object' && part in procedure) {
        procedure = (procedure as Record<string, unknown>)[part];
      } else {
        res.status(404).json({ error: `Procedure not found: ${procedurePath}` });
        return;
      }
    }

    // Call the procedure
    if (typeof procedure === 'function') {
      const result = await procedure(input);
      res.status(200).json({ result: { data: result } });
    } else {
      res.status(404).json({ error: `Procedure not callable: ${procedurePath}` });
    }
  } catch (error) {
    console.error('tRPC error:', error);
    res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
      },
    });
  }
}
