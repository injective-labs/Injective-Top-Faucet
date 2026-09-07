import { describe, expect, it } from 'vitest';
import { buildExplorerUrl, COMPANION_NETWORKS, FAUCET_NETWORKS, getCompanionNetwork, INJECTIVE_NETWORK } from './faucet';

describe('faucet network configuration', () => {
  it('always includes Injective and exposes the five recovered companion networks', () => {
    expect(INJECTIVE_NETWORK.id).toBe('injective');
    expect(INJECTIVE_NETWORK.amount).toBe('0.1');
    expect(COMPANION_NETWORKS).toHaveLength(5);
    expect(COMPANION_NETWORKS.every((network) => network.amount === '0.02')).toBe(true);
    expect(FAUCET_NETWORKS.map((network) => network.chainId)).toEqual([
      1439, 11155111, 421614, 11155420, 84532, 2442,
    ]);
  });

  it('resolves only allowlisted companion IDs and creates explorer links', () => {
    expect(getCompanionNetwork('base')?.chainId).toBe(84532);
    expect(getCompanionNetwork('injective')).toBeUndefined();
    expect(getCompanionNetwork('unknown')).toBeUndefined();
    expect(buildExplorerUrl('injective', '0xabc')).toBe('https://testnet.blockscout.injective.network/tx/0xabc');
  });
});
