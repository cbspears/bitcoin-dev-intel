/**
 * BIP Parser - Extracts metadata from BIP markdown/mediawiki files
 */

import type {
  BIP,
  BIPAuthor,
  BIPLayer,
  BIPParseResult,
  BIPStatus,
  BIPType,
  RawBIPFile,
} from './types';

const VALID_STATUSES: BIPStatus[] = [
  'Draft', 'Proposed', 'Final', 'Active',
  'Replaced', 'Withdrawn', 'Deferred', 'Rejected'
];

const VALID_TYPES: BIPType[] = ['Standards Track', 'Informational', 'Process'];

const VALID_LAYERS: BIPLayer[] = [
  'Consensus (soft fork)', 'Consensus (hard fork)',
  'Peer Services', 'API/RPC', 'Applications'
];

export function parseAuthor(authorString: string): BIPAuthor {
  const emailMatch = authorString.match(/<([^>]+)>/);
  const name = authorString.replace(/<[^>]+>/, '').trim();
  return { name, email: emailMatch?.[1] };
}

export function parseAuthors(authorsString: string): BIPAuthor[] {
  return authorsString
    .split(/,(?![^<]*>)/)
    .map(a => a.trim())
    .filter(Boolean)
    .map(parseAuthor);
}

export function parseBIPNumbers(numbersString: string): number[] {
  return numbersString
    .split(/[,\s]+/)
    .map(n => n.replace(/^BIP[-\s]*/, ''))
    .map(n => parseInt(n, 10))
    .filter(n => !isNaN(n));
}

export function extractPreamble(content: string): Map<string, string> {
  const preamble = new Map<string, string>();
  const preambleMatch = content.match(/<pre>\s*([\s\S]*?)\s*<\/pre>/i)
    || content.match(/^---\s*([\s\S]*?)\s*---/m);

  if (!preambleMatch) return preamble;

  const lines = preambleMatch[1].split('\n');
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    const keyMatch = line.match(/^\s*([A-Za-z-]+)\s*:\s*(.*)$/);
    if (keyMatch) {
      if (currentKey) preamble.set(currentKey.toLowerCase(), currentValue.trim());
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey && line.trim()) {
      currentValue += ' ' + line.trim();
    }
  }
  if (currentKey) preamble.set(currentKey.toLowerCase(), currentValue.trim());

  return preamble;
}

export function parseBIP(rawFile: RawBIPFile): BIPParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const preamble = extractPreamble(rawFile.content);

  // Required fields
  const bipNumStr = preamble.get('bip');
  const title = preamble.get('title');
  const authorStr = preamble.get('author') || preamble.get('authors');
  const statusStr = preamble.get('status');
  const typeStr = preamble.get('type');
  const created = preamble.get('created');

  if (!bipNumStr) errors.push('Missing BIP number');
  if (!title) errors.push('Missing title');
  if (!authorStr) errors.push('Missing author(s)');
  if (!statusStr) errors.push('Missing status');
  if (!typeStr) errors.push('Missing type');
  if (!created) errors.push('Missing created date');

  const number = bipNumStr ? parseInt(bipNumStr, 10) : NaN;
  if (bipNumStr && isNaN(number)) errors.push(`Invalid BIP number: ${bipNumStr}`);

  const status = statusStr as BIPStatus;
  if (statusStr && !VALID_STATUSES.includes(status)) {
    errors.push(`Invalid status: ${statusStr}`);
  }

  const type = typeStr as BIPType;
  if (typeStr && !VALID_TYPES.includes(type)) {
    errors.push(`Invalid type: ${typeStr}`);
  }

  const layerStr = preamble.get('layer');
  let layer: BIPLayer | undefined;
  if (layerStr) {
    layer = layerStr as BIPLayer;
    if (!VALID_LAYERS.includes(layer)) {
      warnings.push(`Unknown layer: ${layerStr}`);
      layer = undefined;
    }
  }

  if (errors.length > 0) {
    return { errors, warnings, success: false };
  }

  const bip: BIP = {
    number,
    title: title!,
    authors: parseAuthors(authorStr!),
    status,
    type,
    layer,
    created: created!,
  };

  const requires = preamble.get('requires');
  if (requires) bip.requires = parseBIPNumbers(requires);

  const replaces = preamble.get('replaces');
  if (replaces) bip.replaces = parseBIPNumbers(replaces);

  const replacedBy = preamble.get('replaced-by') || preamble.get('superseded-by');
  if (replacedBy) bip.replacedBy = parseInt(replacedBy, 10) || undefined;

  const discussionsTo = preamble.get('discussions-to');
  if (discussionsTo) bip.discussionsTo = discussionsTo;

  const postHistory = preamble.get('post-history');
  if (postHistory) bip.postHistory = postHistory.split(/[,\s]+/).filter(Boolean);

  const license = preamble.get('license');
  if (license) bip.license = license;

  return { bip, errors, warnings, success: true };
}

export function parseBIPFromContent(content: string, path = 'unknown'): BIPParseResult {
  return parseBIP({ path, content });
}
