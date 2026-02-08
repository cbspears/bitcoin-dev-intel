import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// =============================================================================
// REPOSITORIES - GitHub repo stats cache
// =============================================================================

export const repositories = pgTable('repositories', {
  id: serial('id').primaryKey(),
  githubId: integer('github_id').unique().notNull(),
  owner: varchar('owner', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 512 }).notNull(),
  description: text('description'),
  stargazersCount: integer('stargazers_count').default(0),
  forksCount: integer('forks_count').default(0),
  openIssuesCount: integer('open_issues_count').default(0),
  openPRsCount: integer('open_prs_count').default(0),
  commits30d: integer('commits_30d').default(0),
  topics: jsonb('topics').$type<string[]>().default([]),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const insertRepositorySchema = createInsertSchema(repositories);
export const selectRepositorySchema = createSelectSchema(repositories);
export type Repository = z.infer<typeof selectRepositorySchema>;
export type NewRepository = z.infer<typeof insertRepositorySchema>;

// =============================================================================
// BIPS - Bitcoin Improvement Proposals
// =============================================================================

export const bipStatusEnum = z.enum([
  'Draft',
  'Proposed',
  'Final',
  'Active',
  'Replaced',
  'Withdrawn',
  'Deferred',
  'Rejected',
]);

export const bipTypeEnum = z.enum([
  'Standards Track',
  'Informational',
  'Process',
]);

export const bipAuthorSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
});

export const bips = pgTable('bips', {
  id: serial('id').primaryKey(),
  number: integer('number').unique().notNull(),
  title: text('title').notNull(),
  authors: jsonb('authors').$type<z.infer<typeof bipAuthorSchema>[]>().default([]),
  status: varchar('status', { length: 50 }).notNull(), // Draft, Proposed, Final, Active, Replaced, Withdrawn, Deferred, Rejected
  type: varchar('type', { length: 50 }).notNull(), // Standards Track, Informational, Process
  layer: varchar('layer', { length: 100 }), // Optional: Consensus, Peer Services, API/RPC, Applications
  created: varchar('created', { length: 50 }), // Date string from BIP header
  requires: jsonb('requires').$type<number[]>().default([]),
  replaces: jsonb('replaces').$type<number[]>().default([]),
  replacedBy: integer('replaced_by'),
  contentHash: varchar('content_hash', { length: 64 }), // SHA-256 for change detection
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const insertBipSchema = createInsertSchema(bips);
export const selectBipSchema = createSelectSchema(bips);
export type Bip = z.infer<typeof selectBipSchema>;
export type NewBip = z.infer<typeof insertBipSchema>;

// =============================================================================
// ACTIVITY EVENTS - Unified activity feed
// =============================================================================

export const eventTypeEnum = z.enum([
  'pr',
  'issue',
  'commit',
  'review',
  'bip_change',
]);

export const activityEvents = pgTable(
  'activity_events',
  {
    id: serial('id').primaryKey(),
    eventType: varchar('event_type', { length: 50 }).notNull(), // pr, issue, commit, review, bip_change
    title: text('title').notNull(),
    description: text('description'),
    repoOwner: varchar('repo_owner', { length: 255 }),
    repoName: varchar('repo_name', { length: 255 }),
    author: varchar('author', { length: 255 }),
    authorAvatarUrl: text('author_avatar_url'),
    htmlUrl: text('html_url'),
    githubId: integer('github_id'),
    bipNumber: integer('bip_number'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('activity_events_event_type_idx').on(table.eventType),
    index('activity_events_event_timestamp_idx').on(table.eventTimestamp),
    index('activity_events_repo_idx').on(table.repoOwner, table.repoName),
  ]
);

export const insertActivityEventSchema = createInsertSchema(activityEvents);
export const selectActivityEventSchema = createSelectSchema(activityEvents);
export type ActivityEvent = z.infer<typeof selectActivityEventSchema>;
export type NewActivityEvent = z.infer<typeof insertActivityEventSchema>;

// =============================================================================
// SYNC LOGS - Track sync runs
// =============================================================================

export const syncTypeEnum = z.enum(['full', 'repos', 'bips', 'activity']);
export const syncStatusEnum = z.enum(['started', 'completed', 'failed']);

export const syncLogs = pgTable('sync_logs', {
  id: serial('id').primaryKey(),
  syncType: varchar('sync_type', { length: 50 }).notNull(), // full, repos, bips, activity
  status: varchar('status', { length: 50 }).notNull(), // started, completed, failed
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  itemsProcessed: integer('items_processed').default(0),
  itemsFailed: integer('items_failed').default(0),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
});

export const insertSyncLogSchema = createInsertSchema(syncLogs);
export const selectSyncLogSchema = createSelectSchema(syncLogs);
export type SyncLog = z.infer<typeof selectSyncLogSchema>;
export type NewSyncLog = z.infer<typeof insertSyncLogSchema>;
