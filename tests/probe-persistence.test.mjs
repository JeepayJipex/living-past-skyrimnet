import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bytes } from '../ui/protocol.ts';
import { splitNarrative } from '../ui/narrative.ts';

// Exercise the replacement rules from the shipped readers and writer. This
// models the co-save delimiter, not the Skyrim VM or the SkyrimNet renderer.
const script = readFileSync(new URL('../Source/Scripts/LP_S0_PlayerAlias.psc', import.meta.url), 'utf8');
const prompt = readFileSync(new URL('../content/jeepayjipex.living-past/prompts/submodules/system_head/0651_living_past_probe.prompt', import.meta.url), 'utf8');
const pscArgument = /"[^"]*"|StringUtil\.AsChar\(\d+\)/.source;
const pscRules = new RegExp('ReplaceProbeText\\(value, (' + pscArgument + '), (' + pscArgument + ')\\)', 'g');
const parsePscArgument = arg => arg.startsWith('"') ? JSON.parse(arg) : String.fromCharCode(Number(arg.match(/\d+/)[0]));
function rulesFor(functionName) {
  const body = script.split('Function ' + functionName + '(')[1].split('EndFunction')[0];
  return Array.from(body.matchAll(pscRules), ([, from, to]) => [parsePscArgument(from), parsePscArgument(to)]);
}
const encode = rulesFor('EncodeProbeText');
const decodePapyrus = rulesFor('ReadProbeSlot');
const decodePrompt = Array.from(prompt.matchAll(/\{% set history = replace\((?:encoded|history), ("[^"]*"), ("[^"]*")\) %\}/g),
  ([, from, to]) => [JSON.parse(from), JSON.parse(to)]);
const replaceAll = (value, rules) => rules.reduce((text, [from, to]) => text.replaceAll(from, () => to), value);
const restoreToken = record => Buffer.from(record, 'utf8').toString('utf8').split(/[ \t\r\n\f\v]/, 1)[0];

test('both readers reverse the shipped co-save encoding after text-stream restoration', () => {
  const mixed = 'Été 😀\tC:\\path\\n %0A%0D%20%09%25\r\nLF\nCR\r trailing \n';
  const max = mixed + ' '.repeat(2048 - bytes(mixed));
  assert.equal(bytes(max), 2048);
  const minimal = 'LPTEST_FIRST_LINE\nLPTEST_SECOND_LINE';
  assert.equal(restoreToken(minimal), 'LPTEST_FIRST_LINE');
  assert.deepEqual(decodePapyrus, decodePrompt);
  for (const text of [minimal, mixed, max, 'x' + '\n'.repeat(2047)]) {
    assert.equal(splitNarrative(text).join(''), text);
    const stored = replaceAll(text, encode);
    assert.doesNotMatch(stored, /[ \t\r\n\f\v]/);
    for (const decoder of [decodePapyrus, decodePrompt]) {
      assert.equal(replaceAll(restoreToken(stored), decoder), text);
    }
  }
});
