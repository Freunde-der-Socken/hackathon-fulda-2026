import { describe, expect, it } from 'vitest';
import { buildTopic, matchTopic } from './index';

describe('topics', () => {
  it('builds a topic that matches its pattern again', () => {
    const topic = buildTopic('sensors/+/reading', ['a1']);
    expect(topic).toBe('sensors/a1/reading');
    expect(matchTopic('sensors/+/reading', topic)).toEqual(['a1']);
  });

  it('does not match a different topic', () => {
    expect(matchTopic('sensors/+/reading', 'sensors/a1/status')).toBeNull();
  });
});
