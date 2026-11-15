import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('experimental projection retains direct-dialogue and recipient guards', () => {
  const prompt = readFileSync(new URL('../content/jeepayjipex.living-past/prompts/submodules/system_head/0651_living_past_probe.prompt', import.meta.url), 'utf8');
  for (const guard of ['render_mode == "full"', 'default(task_at_end, false)', 'not exists("stealthHiddenPlayer")', 'npc.UUID == ysolda', 'is_player(responseTarget.UUID)']) {
    assert.ok(prompt.includes(guard), guard);
  }
  assert.equal((prompt.match(/\{\{ replace\(/g) || []).length, 1);
});
