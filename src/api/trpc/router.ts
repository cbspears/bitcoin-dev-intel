/**
 * tRPC Router
 * Uses Supabase REST API for serverless compatibility
 */

import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = t.router({
  // BIPs
  bips: t.router({
    list: t.procedure
      .input(
        z.object({
          status: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        }).optional()
      )
      .query(async ({ input }) => {
        const { status, limit = 50, offset = 0 } = input || {};

        let query = supabase
          .from('bips')
          .select('*')
          .order('number', { ascending: false })
          .range(offset, offset + limit - 1);

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }),

    getByNumber: t.procedure.input(z.number()).query(async ({ input }) => {
      const { data, error } = await supabase
        .from('bips')
        .select('*')
        .eq('number', input)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }),

    stats: t.procedure.query(async () => {
      const { data, error } = await supabase.from('bips').select('status, type');
      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};

      for (const bip of data || []) {
        statusCounts[bip.status] = (statusCounts[bip.status] || 0) + 1;
        typeCounts[bip.type] = (typeCounts[bip.type] || 0) + 1;
      }

      return {
        total: data?.length || 0,
        byStatus: statusCounts,
        byType: typeCounts,
      };
    }),
  }),

  // Repositories
  repos: t.router({
    list: t.procedure.query(async () => {
      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .order('stargazers_count', { ascending: false });

      if (error) throw error;
      return data || [];
    }),

    getByName: t.procedure.input(z.string()).query(async ({ input }) => {
      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('full_name', input)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }),

    stats: t.procedure.query(async () => {
      const { data, error } = await supabase.from('repositories').select('*');
      if (error) throw error;

      const totalStars = data?.reduce((sum, r) => sum + (r.stargazers_count || 0), 0) || 0;
      const totalForks = data?.reduce((sum, r) => sum + (r.forks_count || 0), 0) || 0;

      return {
        totalRepos: data?.length || 0,
        totalStars,
        totalForks,
      };
    }),
  }),

  // Activity
  activity: t.router({
    recent: t.procedure
      .input(
        z.object({
          types: z.array(z.string()).optional(),
          limit: z.number().min(1).max(100).default(20),
        }).optional()
      )
      .query(async ({ input }) => {
        const { types, limit = 20 } = input || {};

        let query = supabase
          .from('activity_events')
          .select('*')
          .order('event_timestamp', { ascending: false })
          .limit(limit);

        if (types && types.length > 0) {
          query = query.in('event_type', types);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }),

    byType: t.procedure.input(z.string()).query(async ({ input }) => {
      const { data, error } = await supabase
        .from('activity_events')
        .select('*')
        .eq('event_type', input)
        .order('event_timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    }),

    stats: t.procedure.query(async () => {
      const { data, error } = await supabase.from('activity_events').select('event_type');
      if (error) throw error;

      const typeCounts: Record<string, number> = {};
      for (const event of data || []) {
        typeCounts[event.event_type] = (typeCounts[event.event_type] || 0) + 1;
      }

      return {
        total: data?.length || 0,
        byType: typeCounts,
      };
    }),
  }),

  // Sync status
  sync: t.router({
    status: t.procedure.query(async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    }),

    lastByType: t.procedure.input(z.string()).query(async ({ input }) => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('sync_type', input)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }),
  }),
});

export type AppRouter = typeof appRouter;
