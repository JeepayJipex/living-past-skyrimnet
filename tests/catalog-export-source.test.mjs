import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../tools/catalog/LivingPastExport.pas', import.meta.url), 'utf8');

test('the NPC unique mask accepts both sexes and rejects generic actors', () => {
  const maskMatch = /NPC_FLAG_UNIQUE\s*=\s*\$([0-9a-f]+)/i.exec(script);
  assert.ok(maskMatch);
  const mask = Number.parseInt(maskMatch[1], 16);
  assert.equal(mask, 0x20);
  assert.match(script, /GetElementNativeValues\(base, 'ACBS\\Flags'\) and NPC_FLAG_UNIQUE/);
  for (const [flags, expected] of [[0xb0, true], [0x10200031, true], [0, false], [1, false]]) {
    assert.equal((flags & mask) !== 0, expected);
  }
});

test('placement metadata follows the xEdit reference group hierarchy', () => {
  assert.match(script, /GetContainer\(ref\)/);
  assert.match(script, /ElementType\(cell\) <> etGroupRecord/);
  assert.match(script, /ChildrenOf\(cell\)/);
  assert.doesNotMatch(script, /ElementBySignature\(ref, 'CELL'\)/);
});
