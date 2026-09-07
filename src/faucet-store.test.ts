import { beforeEach, describe, expect, it } from 'vitest';
import { beginClaim, getClaim, releaseClaim, resetFaucetStoreForTests, updateClaim, withChainLock } from './faucet-store';

const ADDRESS = '0x1111111111111111111111111111111111111111';

describe('daily claim store', () => {
  beforeEach(() => resetFaucetStoreForTests());

  it('allows one claim per wallet per UTC day and records transaction progress', () => {
    const firstDay = new Date('2026-08-25T23:59:59.000Z');
    const nextDay = new Date('2026-08-26T00:00:01.000Z');
    expect(beginClaim(ADDRESS, 'base', firstDay)).toBe(true);
    expect(beginClaim(ADDRESS.toUpperCase(), 'base', firstDay)).toBe(false);
    updateClaim(ADDRESS, { status: 'complete', injTxHash: '0xabc' }, firstDay);
    expect(getClaim(ADDRESS, firstDay)).toMatchObject({ status: 'complete', companion: 'base', injTxHash: '0xabc' });
    expect(beginClaim(ADDRESS, null, nextDay)).toBe(true);
  });

  it('releases claims that failed before broadcasting a transaction', () => {
    expect(beginClaim(ADDRESS, null)).toBe(true);
    releaseClaim(ADDRESS);
    expect(getClaim(ADDRESS)).toBeUndefined();
    expect(beginClaim(ADDRESS, null)).toBe(true);
  });

  it('serializes nonce-sensitive work on the same chain', async () => {
    const order: string[] = [];
    const first = withChainLock(1439, async () => {
      order.push('first:start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('first:end');
    });
    const second = withChainLock(1439, async () => {
      order.push('second:start');
      order.push('second:end');
    });
    await Promise.all([first, second]);
    expect(order).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });
});
