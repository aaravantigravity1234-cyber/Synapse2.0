const test = require('node:test');
const assert = require('node:assert');
const { formatRelativeTime } = require('./utils.js');

test('formatRelativeTime', async (t) => {
  // Mock Date.now() for deterministic testing
  const now = 1714363200000; // 2024-04-29T04:00:00.000Z
  const originalDateNow = Date.now;

  t.before(() => {
    Date.now = () => now;
  });

  t.after(() => {
    Date.now = originalDateNow;
  });

  await t.test('returns "Just now" for differences less than 1 minute', () => {
    assert.strictEqual(formatRelativeTime(now - 59000), 'Just now');
    assert.strictEqual(formatRelativeTime(now), 'Just now');
  });

  await t.test('returns "Xm ago" for differences less than 1 hour', () => {
    assert.strictEqual(formatRelativeTime(now - 60000), '1m ago');
    assert.strictEqual(formatRelativeTime(now - 3540000), '59m ago');
  });

  await t.test('returns "Xh ago" for differences less than 24 hours', () => {
    assert.strictEqual(formatRelativeTime(now - 3600000), '1h ago');
    assert.strictEqual(formatRelativeTime(now - 82800000), '23h ago');
  });

  await t.test('returns "Yesterday" for differences of exactly 1 day (24-48 hours)', () => {
    assert.strictEqual(formatRelativeTime(now - 86400000), 'Yesterday');
    assert.strictEqual(formatRelativeTime(now - 172799999), 'Yesterday');
  });

  await t.test('returns "Xd ago" for differences less than 7 days', () => {
    assert.strictEqual(formatRelativeTime(now - 172800000), '2d ago');
    assert.strictEqual(formatRelativeTime(now - 604799999), '6d ago');
  });

  await t.test('returns absolute date for differences of 7 days or more', () => {
    const sevenDaysAgo = now - 604800000;
    const formattedDate = new Date(sevenDaysAgo).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    assert.strictEqual(formatRelativeTime(sevenDaysAgo), formattedDate);

    const oneMonthAgo = now - 2592000000;
    const formattedMonthAgo = new Date(oneMonthAgo).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    assert.strictEqual(formatRelativeTime(oneMonthAgo), formattedMonthAgo);
  });
});
