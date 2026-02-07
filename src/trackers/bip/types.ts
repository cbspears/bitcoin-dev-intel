/**
 * BIP (Bitcoin Improvement Proposal) Types
 *
 * Based on BIP-0001 and BIP-0002 specifications for proposal metadata.
 * @see https://github.com/bitcoin/bips
 */

/**
 * BIP status values as defined in BIP-0002
 */
export type BIPStatus =
  | 'Draft'
  | 'Proposed'
  | 'Final'
  | 'Active'
  | 'Replaced'
  | 'Withdrawn'
  | 'Deferred'
  | 'Rejected';

/**
 * BIP types as defined in BIP-0002
 */
export type BIPType =
  | 'Standards Track'
  | 'Informational'
  | 'Process';

/**
 * BIP layers for Standards Track BIPs
 */
export type BIPLayer =
  | 'Consensus (soft fork)'
  | 'Consensus (hard fork)'
  | 'Peer Services'
  | 'API/RPC'
  | 'Applications';

/**
 * Author information
 */
export interface BIPAuthor {
  name: string;
  email?: string;
}

/**
 * Core BIP metadata extracted from preamble
 */
export interface BIP {
  number: number;
  title: string;
  authors: BIPAuthor[];
  status: BIPStatus;
  type: BIPType;
  layer?: BIPLayer;
  created: string;
  requires?: number[];
  replaces?: number[];
  replacedBy?: number;
  discussionsTo?: string;
  postHistory?: string[];
  license?: string;
  commentsSummary?: string;
  commentsUri?: string;
}

export interface RawBIPFile {
  path: string;
  content: string;
  lastModified?: string;
}

export interface BIPParseResult {
  bip?: BIP;
  errors: string[];
  warnings: string[];
  success: boolean;
}

export type BIPChangeType =
  | 'created'
  | 'status_changed'
  | 'content_updated'
  | 'metadata_updated';

export interface BIPChange {
  bipNumber: number;
  changeType: BIPChangeType;
  previousValue?: string;
  newValue?: string;
  detectedAt: string;
  description?: string;
}

export interface BIPSnapshot {
  bips: Map<number, BIP>;
  timestamp: string;
  commitHash?: string;
}

export interface BIPDiff {
  added: BIP[];
  removed: BIP[];
  modified: { bip: BIP; changes: BIPChange[] }[];
  fromTimestamp: string;
  toTimestamp: string;
}
