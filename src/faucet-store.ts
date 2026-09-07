interface ClaimRecord {
  address: string;
  companion: string | null;
  status: 'pending' | 'complete' | 'partial';
  claimedAt: string;
  injTxHash?: string;
  companionTxHash?: string;
}

const state = globalThis as unknown as {
  __testnetFountainClaims?: Map<string, ClaimRecord>;
  __testnetFountainLocks?: Map<number, Promise<void>>;
};

state.__testnetFountainClaims ??= new Map<string, ClaimRecord>();
state.__testnetFountainLocks ??= new Map<number, Promise<void>>();

function dateKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function claimKey(address: string, now = new Date()) {
  return `${address.toLowerCase()}::${dateKey(now)}`;
}

export function getClaim(address: string, now = new Date()) {
  return state.__testnetFountainClaims!.get(claimKey(address, now));
}

export function beginClaim(address: string, companion: string | null, now = new Date()) {
  const key = claimKey(address, now);
  if (state.__testnetFountainClaims!.has(key)) return false;
  state.__testnetFountainClaims!.set(key, {
    address: address.toLowerCase(),
    companion,
    status: 'pending',
    claimedAt: now.toISOString(),
  });
  return true;
}

export function updateClaim(
  address: string,
  patch: Partial<Pick<ClaimRecord, 'status' | 'injTxHash' | 'companionTxHash'>>,
  now = new Date(),
) {
  const key = claimKey(address, now);
  const current = state.__testnetFountainClaims!.get(key);
  if (current) state.__testnetFountainClaims!.set(key, { ...current, ...patch });
}

export function releaseClaim(address: string, now = new Date()) {
  state.__testnetFountainClaims!.delete(claimKey(address, now));
}

export async function withChainLock<T>(chainId: number, operation: () => Promise<T>): Promise<T> {
  const previous = state.__testnetFountainLocks!.get(chainId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  state.__testnetFountainLocks!.set(chainId, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (state.__testnetFountainLocks!.get(chainId) === queued) {
      state.__testnetFountainLocks!.delete(chainId);
    }
  }
}

export function resetFaucetStoreForTests() {
  state.__testnetFountainClaims!.clear();
  state.__testnetFountainLocks!.clear();
}
