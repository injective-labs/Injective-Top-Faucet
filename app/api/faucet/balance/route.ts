import { NextResponse } from 'next/server';
import { createPublicClient, formatEther, http, parseEther } from 'viem';
import { FAUCET_NETWORKS } from '@/src/faucet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BalanceRow {
  id: string;
  balance: string;
  available: boolean;
  reachable: boolean;
}

const cache = globalThis as unknown as {
  __testnetFountainBalanceCache?: { expiresAt: number; rows: BalanceRow[] };
};

export async function GET() {
  const walletAddress = process.env.FAUCET_WALLET_ADDRESS;
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return NextResponse.json({ configured: false, error: 'Faucet wallet is not configured.' }, { status: 503 });
  }

  if (cache.__testnetFountainBalanceCache?.expiresAt && cache.__testnetFountainBalanceCache.expiresAt > Date.now()) {
    return NextResponse.json({ configured: true, address: walletAddress, balances: cache.__testnetFountainBalanceCache.rows });
  }

  const results = await Promise.allSettled(FAUCET_NETWORKS.map(async (network): Promise<BalanceRow> => {
    const client = createPublicClient({ transport: http(network.rpcUrl, { timeout: 8_000 }) });
    const raw = await client.getBalance({ address: walletAddress as `0x${string}` });
    const reserve = parseEther(network.isBase ? '0.002' : '0.0005');
    return {
      id: network.id,
      balance: formatEther(raw),
      available: raw >= parseEther(network.amount) + reserve,
      reachable: true,
    };
  }));

  const rows = results.map((result, index): BalanceRow => result.status === 'fulfilled'
    ? result.value
    : { id: FAUCET_NETWORKS[index].id, balance: '0', available: false, reachable: false });

  cache.__testnetFountainBalanceCache = { expiresAt: Date.now() + 30_000, rows };
  return NextResponse.json({ configured: true, address: walletAddress, balances: rows });
}
