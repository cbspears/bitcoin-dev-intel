/**
 * Cron Sync Endpoint
 * Vercel serverless function for scheduled sync operations
 * Uses Supabase REST API (works in serverless)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Tracked repos
const TRACKED_REPOS = [
  { owner: 'bitcoin', name: 'bitcoin' },
  { owner: 'bitcoin', name: 'bips' },
  { owner: 'lightning', name: 'bolts' },
];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  console.log('Starting sync...');
  const results = { repos: 0, activity: 0, errors: [] as string[] };

  try {
    // Sync repositories
    for (const repo of TRACKED_REPOS) {
      try {
        const { data } = await octokit.repos.get({ owner: repo.owner, repo: repo.name });

        await supabase.from('repositories').upsert({
          github_id: data.id,
          owner: repo.owner,
          name: repo.name,
          full_name: data.full_name,
          description: data.description,
          stargazers_count: data.stargazers_count,
          forks_count: data.forks_count,
          open_issues_count: data.open_issues_count,
          topics: data.topics || [],
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'github_id' });

        results.repos++;
      } catch (e) {
        results.errors.push(`${repo.owner}/${repo.name}: ${e}`);
      }
    }

    // Sync recent activity (PRs from bitcoin/bitcoin)
    try {
      const { data: prs } = await octokit.pulls.list({
        owner: 'bitcoin',
        repo: 'bitcoin',
        state: 'all',
        per_page: 10,
        sort: 'updated',
      });

      for (const pr of prs) {
        await supabase.from('activity_events').upsert({
          github_id: pr.id,
          event_type: 'pr',
          title: pr.title,
          repo_owner: 'bitcoin',
          repo_name: 'bitcoin',
          author: pr.user?.login,
          author_avatar_url: pr.user?.avatar_url,
          html_url: pr.html_url,
          event_timestamp: pr.updated_at,
          metadata: { number: pr.number, state: pr.state },
        }, { onConflict: 'github_id' });
        results.activity++;
      }
    } catch (e) {
      results.errors.push(`Activity sync: ${e}`);
    }

    // Log sync
    await supabase.from('sync_logs').insert({
      sync_type: 'cron',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      items_processed: results.repos + results.activity,
      items_failed: results.errors.length,
      metadata: results,
    });

    res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}
