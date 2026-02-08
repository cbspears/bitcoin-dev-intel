/**
 * tRPC Router
 * API routes for the Bitcoin Dev Intel dashboard
 */

import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { db } from '../../lib/supabase';
import { bips, repositories, activityEvents, syncLogs } from '../../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

// =============================================================================
// tRPC Instance
// =============================================================================

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// =============================================================================
// Router Definition
// =============================================================================

export const appRouter = t.router({
  // ---------------------------------------------------------------------------
  // BIPs Router
  // ---------------------------------------------------------------------------
  bips: t.router({
    /**
     * List BIPs with optional filtering and pagination
     */
    list: t.procedure
      .input(
        z
          .object({
            status: z.string().optional(),
            type: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { status, type, limit = 50, offset = 0 } = input || {};

        let query = db.select().from(bips);

        if (status) {
          query = query.where(eq(bips.status, status)) as typeof query;
        }

        if (type) {
          query = query.where(eq(bips.type, type)) as typeof query;
        }

        return query.orderBy(desc(bips.number)).limit(limit).offset(offset);
      }),

    /**
     * Get a single BIP by its number
     */
    getByNumber: t.procedure.input(z.number()).query(async ({ input }) => {
      const result = await db
        .select()
        .from(bips)
        .where(eq(bips.number, input))
        .limit(1);

      return result[0] || null;
    }),

    /**
     * Get BIP statistics
     */
    stats: t.procedure.query(async () => {
      const allBips = await db.select().from(bips);

      const statusCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};

      for (const bip of allBips) {
        statusCounts[bip.status] = (statusCounts[bip.status] || 0) + 1;
        typeCounts[bip.type] = (typeCounts[bip.type] || 0) + 1;
      }

      return {
        total: allBips.length,
        byStatus: statusCounts,
        byType: typeCounts,
      };
    }),
  }),

  // ---------------------------------------------------------------------------
  // Repositories Router
  // ---------------------------------------------------------------------------
  repos: t.router({
    /**
     * List all tracked repositories
     */
    list: t.procedure.query(async () => {
      return db
        .select()
        .from(repositories)
        .orderBy(desc(repositories.stargazersCount));
    }),

    /**
     * Get a repository by owner and name
     */
    getByName: t.procedure
      .input(
        z.object({
          owner: z.string(),
          name: z.string(),
        })
      )
      .query(async ({ input }) => {
        const result = await db
          .select()
          .from(repositories)
          .where(eq(repositories.owner, input.owner))
          .limit(10);

        return result.find((r) => r.name === input.name) || null;
      }),

    /**
     * Get repository statistics summary
     */
    stats: t.procedure.query(async () => {
      const allRepos = await db.select().from(repositories);

      const totalStars = allRepos.reduce(
        (sum, r) => sum + (r.stargazersCount || 0),
        0
      );
      const totalForks = allRepos.reduce(
        (sum, r) => sum + (r.forksCount || 0),
        0
      );
      const totalOpenIssues = allRepos.reduce(
        (sum, r) => sum + (r.openIssuesCount || 0),
        0
      );
      const totalOpenPRs = allRepos.reduce(
        (sum, r) => sum + (r.openPRsCount || 0),
        0
      );
      const totalCommits30d = allRepos.reduce(
        (sum, r) => sum + (r.commits30d || 0),
        0
      );

      return {
        repositoryCount: allRepos.length,
        totalStars,
        totalForks,
        totalOpenIssues,
        totalOpenPRs,
        totalCommits30d,
      };
    }),
  }),

  // ---------------------------------------------------------------------------
  // Activity Router
  // ---------------------------------------------------------------------------
  activity: t.router({
    /**
     * Get recent activity events
     */
    recent: t.procedure
      .input(
        z
          .object({
            types: z.array(z.string()).optional(),
            repoOwner: z.string().optional(),
            repoName: z.string().optional(),
            limit: z.number().min(1).max(100).default(20),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { types, repoOwner, repoName, limit = 20, offset = 0 } = input || {};

        let query = db.select().from(activityEvents);

        if (types && types.length > 0) {
          query = query.where(inArray(activityEvents.eventType, types)) as typeof query;
        }

        if (repoOwner) {
          query = query.where(eq(activityEvents.repoOwner, repoOwner)) as typeof query;
        }

        if (repoName) {
          query = query.where(eq(activityEvents.repoName, repoName)) as typeof query;
        }

        return query
          .orderBy(desc(activityEvents.eventTimestamp))
          .limit(limit)
          .offset(offset);
      }),

    /**
     * Get activity by type
     */
    byType: t.procedure
      .input(
        z.object({
          type: z.string(),
          limit: z.number().min(1).max(100).default(20),
        })
      )
      .query(async ({ input }) => {
        return db
          .select()
          .from(activityEvents)
          .where(eq(activityEvents.eventType, input.type))
          .orderBy(desc(activityEvents.eventTimestamp))
          .limit(input.limit);
      }),

    /**
     * Get activity statistics
     */
    stats: t.procedure.query(async () => {
      const allEvents = await db.select().from(activityEvents);

      const typeCounts: Record<string, number> = {};
      const repoCounts: Record<string, number> = {};

      for (const event of allEvents) {
        typeCounts[event.eventType] = (typeCounts[event.eventType] || 0) + 1;

        if (event.repoOwner && event.repoName) {
          const repoKey = `${event.repoOwner}/${event.repoName}`;
          repoCounts[repoKey] = (repoCounts[repoKey] || 0) + 1;
        }
      }

      return {
        total: allEvents.length,
        byType: typeCounts,
        byRepository: repoCounts,
      };
    }),
  }),

  // ---------------------------------------------------------------------------
  // Sync Router
  // ---------------------------------------------------------------------------
  sync: t.router({
    /**
     * Get recent sync status logs
     */
    status: t.procedure.query(async () => {
      const logs = await db
        .select()
        .from(syncLogs)
        .orderBy(desc(syncLogs.startedAt))
        .limit(5);

      return logs;
    }),

    /**
     * Get the last sync for each type
     */
    lastByType: t.procedure.query(async () => {
      const allLogs = await db
        .select()
        .from(syncLogs)
        .orderBy(desc(syncLogs.startedAt));

      const lastByType: Record<string, typeof allLogs[0]> = {};

      for (const log of allLogs) {
        if (!lastByType[log.syncType]) {
          lastByType[log.syncType] = log;
        }
      }

      return lastByType;
    }),
  }),
});

// =============================================================================
// Type Exports
// =============================================================================

export type AppRouter = typeof appRouter;
