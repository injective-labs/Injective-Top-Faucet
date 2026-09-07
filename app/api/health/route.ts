import { NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';

export const runtime = 'nodejs';

export function GET() {
  const rawKey = process.env.FAUCET_PRIVATE_KEY;
  const walletAddress = process.env.FAUCET_WALLET_ADDRESS;
  if (!rawKey || !/^(0x)?[0-9a-fA-F]{64}$/.test(rawKey) || !walletAddress) {
    return NextResponse.json({ status: 'degraded', configured: false }, { status: 503 });
  }
  const key = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const matches = privateKeyToAccount(key).address.toLowerCase() === walletAddress.toLowerCase();
  return NextResponse.json({ status: matches ? 'ok' : 'degraded', configured: matches }, { status: matches ? 200 : 503 });
}
