import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const originalKey = process.env.FAUCET_PRIVATE_KEY;
const originalAddress = process.env.FAUCET_WALLET_ADDRESS;

afterEach(() => {
  process.env.FAUCET_PRIVATE_KEY = originalKey;
  process.env.FAUCET_WALLET_ADDRESS = originalAddress;
});

function request(body: unknown) {
  return new NextRequest('http://localhost/api/faucet/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('claim API validation', () => {
  it('rejects invalid recipient addresses before reading signer configuration', async () => {
    const response = await POST(request({ address: 'not-an-address', companion: null }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'invalid_address' });
  });

  it('rejects companion networks outside the recovered allowlist', async () => {
    const response = await POST(request({
      address: '0x1111111111111111111111111111111111111111',
      companion: 'mainnet',
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'invalid_companion' });
  });

  it('fails closed when signer and configured faucet address do not match', async () => {
    process.env.FAUCET_PRIVATE_KEY = '11'.repeat(32);
    process.env.FAUCET_WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';
    const response = await POST(request({
      address: '0x1111111111111111111111111111111111111111',
      companion: null,
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'signer_mismatch' });
  });
});
