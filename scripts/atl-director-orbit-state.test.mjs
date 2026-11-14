import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyOrbitPriorities } from './atl-director-orbit-state.mjs';

const checkedAt = '2026-11-14T02:00:00.000Z';
test('a successful empty ORBIT list is observed_empty, not a verified priority sync', () => {
  const result = classifyOrbitPriorities([], checkedAt);
  assert.equal(result.status, 'observed_empty');
  assert.equal(result.count, 0);
  assert.equal(result.freshness, 'unknown');
  assert.equal(result.updated_at, null);
  assert.match(result.warning, /navigateur/);
});
test('an available nonempty list preserves priorities without claiming a date', () => {
  const items = [{id:'locksability',objective:'recrutement'}];
  const result = classifyOrbitPriorities(items, checkedAt);
  assert.equal(result.status, 'observed');
  assert.deepEqual(result.priorities, items);
  assert.equal(result.freshness, 'unknown');
});
test('a dated ORBIT envelope distinguishes stale and recent records', () => {
  assert.equal(classifyOrbitPriorities({priorities:[{id:1}], updated_at:'2026-10-13T12:00:00Z'}, checkedAt).freshness, 'stale');
  assert.equal(classifyOrbitPriorities({priorities:[{id:1}], updated_at:'2026-11-13T12:00:00Z'}, checkedAt).freshness, 'recent');
});
test('invalid future timestamps are not treated as fresh', () => {
  assert.equal(classifyOrbitPriorities({priorities:[1],updated_at:'2099-01-01T00:00:00Z'},checkedAt).freshness, 'unknown');
});
test('unknown payloads cannot masquerade as populated priorities', () => {
  const result = classifyOrbitPriorities({random:'text'}, checkedAt);
  assert.equal(result.status, 'unrecognized_format');
  assert.equal(result.count, null);
  assert.deepEqual(result.priorities, []);
});
