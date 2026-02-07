/**
 * BIP Tracker - Status tracking and change detection
 */

import type {
  BIP,
  BIPChange,
  BIPDiff,
  BIPSnapshot,
} from './types';

export function createSnapshot(bips: BIP[], commitHash?: string): BIPSnapshot {
  const bipMap = new Map<number, BIP>();
  for (const bip of bips) {
    bipMap.set(bip.number, bip);
  }
  return {
    bips: bipMap,
    timestamp: new Date().toISOString(),
    commitHash,
  };
}

export function detectChanges(oldBip: BIP, newBip: BIP): BIPChange[] {
  const changes: BIPChange[] = [];
  const now = new Date().toISOString();

  if (oldBip.status !== newBip.status) {
    changes.push({
      bipNumber: newBip.number,
      changeType: 'status_changed',
      previousValue: oldBip.status,
      newValue: newBip.status,
      detectedAt: now,
      description: `Status changed from ${oldBip.status} to ${newBip.status}`,
    });
  }

  const metadataFields: (keyof BIP)[] = ['title', 'layer', 'license'];
  for (const field of metadataFields) {
    if (oldBip[field] !== newBip[field]) {
      changes.push({
        bipNumber: newBip.number,
        changeType: 'metadata_updated',
        previousValue: String(oldBip[field] ?? ''),
        newValue: String(newBip[field] ?? ''),
        detectedAt: now,
        description: `${field} updated`,
      });
    }
  }

  return changes;
}

export function diffSnapshots(
  oldSnapshot: BIPSnapshot,
  newSnapshot: BIPSnapshot
): BIPDiff {
  const added: BIP[] = [];
  const removed: BIP[] = [];
  const modified: { bip: BIP; changes: BIPChange[] }[] = [];

  // Find added and modified BIPs
  for (const [number, newBip] of newSnapshot.bips) {
    const oldBip = oldSnapshot.bips.get(number);
    if (!oldBip) {
      added.push(newBip);
    } else {
      const changes = detectChanges(oldBip, newBip);
      if (changes.length > 0) {
        modified.push({ bip: newBip, changes });
      }
    }
  }

  // Find removed BIPs
  for (const [number, oldBip] of oldSnapshot.bips) {
    if (!newSnapshot.bips.has(number)) {
      removed.push(oldBip);
    }
  }

  return {
    added,
    removed,
    modified,
    fromTimestamp: oldSnapshot.timestamp,
    toTimestamp: newSnapshot.timestamp,
  };
}

export class BIPTracker {
  private currentSnapshot: BIPSnapshot | null = null;
  private changeHistory: BIPChange[] = [];

  getSnapshot(): BIPSnapshot | null {
    return this.currentSnapshot;
  }

  getChangeHistory(): BIPChange[] {
    return [...this.changeHistory];
  }

  updateBIPs(bips: BIP[], commitHash?: string): BIPDiff | null {
    const newSnapshot = createSnapshot(bips, commitHash);

    if (!this.currentSnapshot) {
      this.currentSnapshot = newSnapshot;
      // Record all as created
      const now = new Date().toISOString();
      for (const bip of bips) {
        this.changeHistory.push({
          bipNumber: bip.number,
          changeType: 'created',
          newValue: bip.status,
          detectedAt: now,
          description: `BIP-${bip.number} added to tracker`,
        });
      }
      return null;
    }

    const diff = diffSnapshots(this.currentSnapshot, newSnapshot);

    // Record changes
    const now = new Date().toISOString();
    for (const bip of diff.added) {
      this.changeHistory.push({
        bipNumber: bip.number,
        changeType: 'created',
        newValue: bip.status,
        detectedAt: now,
        description: `BIP-${bip.number} added`,
      });
    }

    for (const { changes } of diff.modified) {
      this.changeHistory.push(...changes);
    }

    this.currentSnapshot = newSnapshot;
    return diff;
  }

  getBIP(number: number): BIP | undefined {
    return this.currentSnapshot?.bips.get(number);
  }

  getBIPsByStatus(status: string): BIP[] {
    if (!this.currentSnapshot) return [];
    return Array.from(this.currentSnapshot.bips.values())
      .filter(bip => bip.status === status);
  }

  getAllBIPs(): BIP[] {
    if (!this.currentSnapshot) return [];
    return Array.from(this.currentSnapshot.bips.values());
  }
}
