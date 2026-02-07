/**
 * BIP Tracker Module
 *
 * Tracks Bitcoin Improvement Proposals (BIPs) and detects changes.
 */

// Types
export type {
  BIP,
  BIPAuthor,
  BIPChange,
  BIPChangeType,
  BIPDiff,
  BIPLayer,
  BIPParseResult,
  BIPSnapshot,
  BIPStatus,
  BIPType,
  RawBIPFile,
} from './types';

// Parser
export {
  extractPreamble,
  parseAuthor,
  parseAuthors,
  parseBIP,
  parseBIPFromContent,
  parseBIPNumbers,
} from './parser';

// Tracker
export {
  BIPTracker,
  createSnapshot,
  detectChanges,
  diffSnapshots,
} from './tracker';
