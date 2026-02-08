/**
 * Supabase Client for Serverless Functions
 * Uses the Supabase JavaScript SDK which works in Vercel's Edge/Serverless runtime
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase environment variables not set');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    auth: {
      persistSession: false,
    },
  }
);

// Helper types for database operations
export type Tables = {
  repositories: {
    id: number;
    github_id: number;
    owner: string;
    name: string;
    full_name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    open_prs_count: number;
    commits_30d: number;
    topics: string[];
    last_synced_at: string | null;
    created_at: string;
    updated_at: string;
  };
  bips: {
    id: number;
    number: number;
    title: string;
    authors: { name: string; email?: string }[];
    status: string;
    type: string;
    layer: string | null;
    created: string | null;
    requires: number[] | null;
    replaces: number[] | null;
    replaced_by: number | null;
    content_hash: string | null;
    last_synced_at: string | null;
    created_at: string;
    updated_at: string;
  };
  activity_events: {
    id: number;
    event_type: string;
    title: string;
    description: string | null;
    repo_owner: string | null;
    repo_name: string | null;
    author: string | null;
    author_avatar_url: string | null;
    html_url: string | null;
    github_id: number | null;
    bip_number: number | null;
    metadata: Record<string, unknown> | null;
    event_timestamp: string;
    created_at: string;
  };
  sync_logs: {
    id: number;
    sync_type: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    items_processed: number;
    items_failed: number;
    error_message: string | null;
    metadata: Record<string, unknown> | null;
  };
};
