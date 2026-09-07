import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseEther,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { INJECTIVE_NETWORK, buildExplorerUrl, getCompanionNetwork, type FaucetNetwork } from '@/src/faucet';
import { beginClaim, getClaim, releaseClaim, updateClaim, withChainLock } from '@/src/faucet-store';

export const runtime = 'nodejs';

function viemChain(network: FaucetNetwork) {
  return {
    id: network.chainId,
    name: network.name,
    nativeCurrency: { name: network.symbol, symbol: network.symbol, decimals: 18 },
    rpcUrls: { default: { http: [network.rpcUrl] } },
    blockExplorers: { default: { name: 'Explorer', url: network.explorerUrl.replace(/\/tx\/$/, '') } },
  } as const;
}

async function sendNative(privateKey: `0x${string}`, to: Address, network: FaucetNetwork) {
  return withChainLock(network.chainId, async () => {
    const account = privateKeyToAccount(privateKey);
    const chain = viemChain(network);
    const publicClient = createPublicClient({ chain, transport: http(network.rpcUrl, { timeout: 20_000 }) });
    const walletClient = createWalletClient({ account, chain, transport: http(network.rpcUrl, { timeout: 20_000 }) });
    const value = parseEther(network.amount);
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance <= value) throw new Error(`${network.shortName} inventory is temporarily unavailable.`);

    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
    return walletClient.sendTransaction({ account, chain, to, value, nonce });
  });
}

export async function POST(request: NextRequest) {
  let recipient: Address | null = null;
  let injTxHash: `0x${string}` | undefined;
  let companionTxHash: `0x${string}` | undefined;
  let selectedCompanion: FaucetNetwork | undefined;

  try {
    const body = await request.json() as { address?: unknown; companion?: unknown };
    if (typeof body.address !== 'string' || !isAddress(body.address, { strict: false })) {
      return NextResponse.json({ error: 'Enter a valid EVM wallet address.', code: 'invalid_address' }, { status: 400 });
    }
    recipient = body.address as Address;

    const companionId = body.companion == null || body.companion === '' ? null : body.companion;
    if (companionId !== null && typeof companionId !== 'string') {
      return NextResponse.json({ error: 'Invalid companion network.', code: 'invalid_companion' }, { status: 400 });
    }
    selectedCompanion = getCompanionNetwork(companionId);
    if (companionId && !selectedCompanion) {
      return NextResponse.json({ error: 'Unknown companion network.', code: 'invalid_companion' }, { status: 400 });
    }

    const rawKey = process.env.FAUCET_PRIVATE_KEY;
    if (!rawKey || !/^(0x)?[0-9a-fA-F]{64}$/.test(rawKey)) {
      return NextResponse.json({ error: 'Faucet signer is not configured.', code: 'not_configured' }, { status: 503 });
    }
    const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    const configuredAddress = process.env.FAUCET_WALLET_ADDRESS;
    if (configuredAddress && configuredAddress.toLowerCase() !== account.address.toLowerCase()) {
      return NextResponse.json({ error: 'Faucet signer does not match the configured wallet.', code: 'signer_mismatch' }, { status: 503 });
    }

    const existing = getClaim(recipient);
    if (existing) {
      return NextResponse.json({
        error: existing.status === 'pending' ? 'A request for this wallet is already processing.' : 'This wallet has already claimed today. Come back after 00:00 UTC.',
        code: existing.status === 'pending' ? 'claim_pending' : 'already_claimed',
        claim: existing,
      }, { status: 429 });
    }
    if (!beginClaim(recipient, selectedCompanion?.id ?? null)) {
      return NextResponse.json({ error: 'A request for this wallet is already processing.', code: 'claim_pending' }, { status: 429 });
    }

    injTxHash = await sendNative(privateKey, recipient, INJECTIVE_NETWORK);
    updateClaim(recipient, { injTxHash });

    if (selectedCompanion) {
      companionTxHash = await sendNative(privateKey, recipient, selectedCompanion);
      updateClaim(recipient, { companionTxHash });
    }

    updateClaim(recipient, { status: 'complete' });
    return NextResponse.json({
      success: true,
      transactions: [
        { networkId: INJECTIVE_NETWORK.id, symbol: INJECTIVE_NETWORK.symbol, amount: INJECTIVE_NETWORK.amount, hash: injTxHash, explorerUrl: buildExplorerUrl(INJECTIVE_NETWORK.id, injTxHash) },
        ...(selectedCompanion && companionTxHash ? [{ networkId: selectedCompanion.id, symbol: selectedCompanion.symbol, amount: selectedCompanion.amount, hash: companionTxHash, explorerUrl: buildExplorerUrl(selectedCompanion.id, companionTxHash) }] : []),
      ],
    });
  } catch (error) {
    if (recipient) {
      if (injTxHash || companionTxHash) updateClaim(recipient, { status: 'partial', injTxHash, companionTxHash });
      else releaseClaim(recipient);
    }
    const message = error instanceof Error ? error.message : 'Claim failed.';
    console.error('[Injective.Top]', message);
    return NextResponse.json({
      error: message,
      code: injTxHash || companionTxHash ? 'partial_claim' : 'claim_failed',
      transactions: [
        ...(injTxHash ? [{ networkId: INJECTIVE_NETWORK.id, hash: injTxHash, explorerUrl: buildExplorerUrl(INJECTIVE_NETWORK.id, injTxHash) }] : []),
        ...(companionTxHash && selectedCompanion ? [{ networkId: selectedCompanion.id, hash: companionTxHash, explorerUrl: buildExplorerUrl(selectedCompanion.id, companionTxHash) }] : []),
      ],
    }, { status: 502 });
  }
}
