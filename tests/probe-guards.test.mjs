import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('projection requires direct visible dialogue and reads only the speaking actor', () => {
  const prompt = readFileSync(new URL('../content/jeepayjipex.living-past/prompts/submodules/system_head/0651_living_past_probe.prompt', import.meta.url), 'utf8');
  for (const guard of ['render_mode == "full"', 'default(task_at_end, false)', 'not exists("stealthHiddenPlayer")', 'npc.UUID != 0', 'is_player(responseTarget.UUID)', 'papyrus_util("GetIntValue", npc.UUID', 'papyrus_util("GetStringValue", npc.UUID']) {
    assert.ok(prompt.includes(guard), guard);
  }
});
