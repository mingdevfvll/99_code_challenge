import { describe, expect, it } from 'vitest';
import { listTaskQuerySchema } from '../../src/modules/task/task.schema.js';

// The Phase 3 cursor is the last row's id (default sort) or a numeric offset
// (custom sort). There's no encode/decode step — see `docs/11-decisions.md`
// "Cursor pagination on default sort only". These tests lock the validation
// boundary and document the cursor's shape.

describe('cursor (validation surface)', () => {
  it('accepts a string cursor', () => {
    const parsed = listTaskQuerySchema.parse({ cursor: 'cmoy123' });
    expect(parsed.cursor).toBe('cmoy123');
  });

  it('rejects an empty cursor', () => {
    expect(() => listTaskQuerySchema.parse({ cursor: '' })).toThrow();
  });

  it('omits cursor when not provided', () => {
    const parsed = listTaskQuerySchema.parse({});
    expect(parsed.cursor).toBeUndefined();
  });

  it('treats unknown numeric strings the same way (offset path tolerates them)', () => {
    // The offset-sort branch parses the cursor with Number.parseInt and falls
    // back to 0 on NaN. So a non-numeric cursor on a custom sort isn't a 400 —
    // it just returns page 1. That's intentional (relaxed contract for now).
    const parsed = listTaskQuerySchema.parse({ cursor: 'abc', sort: 'title' });
    expect(parsed.cursor).toBe('abc');
  });
});
