'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FAUCET_NETWORKS, INJECTIVE_NETWORK, type FaucetNetwork } from '@/src/faucet';

interface NetworkBalance {
  id: string;
  balance: string;
  available: boolean;
  reachable: boolean;
}

interface ClaimTransaction {
  networkId: string;
  symbol: string;
  amount: string;
  hash: string;
  explorerUrl: string | null;
}

type ClaimState = 'idle' | 'claiming' | 'success' | 'error';

function isWalletAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

function compactHash(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null);
  const [balances, setBalances] = useState<NetworkBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<ClaimTransaction[]>([]);

  const refreshBalances = useCallback(async () => {
    try {
      const response = await fetch('/api/faucet/balance', { cache: 'no-store' });
      const payload = await response.json() as { configured?: boolean; balances?: NetworkBalance[] };
      setConfigured(Boolean(response.ok && payload.configured));
      setBalances(payload.balances ?? []);
    } catch {
      setConfigured(false);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshBalances(), 0);
    const interval = window.setInterval(() => void refreshBalances(), 45_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refreshBalances]);

  const balanceById = useMemo(() => new Map(balances.map((item) => [item.id, item])), [balances]);
  const selectedNetwork = FAUCET_NETWORKS.find((network) => network.id === selectedCompanion);
  const addressValid = isWalletAddress(address);
  const injAvailable = balanceById.get(INJECTIVE_NETWORK.id)?.available ?? false;
  const companionAvailable = !selectedNetwork || (balanceById.get(selectedNetwork.id)?.available ?? false);
  const canClaim = addressValid && configured === true && injAvailable && companionAvailable && claimState !== 'claiming' && claimState !== 'success';

  const claim = async () => {
    if (!canClaim) return;
    setClaimState('claiming');
    setError('');
    setTransactions([]);
    try {
      const response = await fetch('/api/faucet/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), companion: selectedCompanion }),
      });
      const payload = await response.json() as { error?: string; transactions?: ClaimTransaction[] };
      if (!response.ok) throw new Error(payload.error || 'The faucet could not complete this request.');
      setTransactions(payload.transactions ?? []);
      setClaimState('success');
      window.setTimeout(() => void refreshBalances(), 3_000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The faucet could not complete this request.');
      setClaimState('error');
    }
  };

  const claimButtonLabel = claimState === 'claiming'
    ? 'Sending testnet assets…'
    : claimState === 'success'
      ? 'Drop complete'
      : !addressValid
        ? 'Enter a wallet address'
        : configured === false
          ? 'Faucet unavailable'
          : !injAvailable
            ? 'INJ inventory unavailable'
            : 'Claim testnet assets';

  const mobileClaimButtonLabel = claimState === 'claiming'
    ? 'Claiming…'
    : claimState === 'success'
      ? 'Claim complete'
      : 'Claim';

  return (
    <main className="site-shell">
      <header id="top" className="topbar">
        <a className="brand" href="#top" aria-label="Injective.Top home">
          <Image className="brand-mark" src="/top-logo.png" alt="Injective.Top" width={50} height={34} priority />
          <span className="brand-copy"><strong>Injective<span>.Top</span></strong><small>Test Injective <em>With Zero Friction.</em></small></span>
        </a>
        <a className="explore-button" href="https://injpass.com" target="_blank" rel="noreferrer">
          <span><span className="explore-label">Explore </span>INJ Pass</span>
          <span className="explore-arrow" aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="faucet-layout">
        <div className="claim-panel">
          <div className="mobile-address-section">
            <h2>Type Address</h2>
            <div className={`address-field mobile-address-field ${address && !addressValid ? 'invalid' : ''} ${addressValid ? 'valid' : ''}`}>
              <input
                aria-label="Wallet address"
                autoComplete="off"
                spellCheck={false}
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  if (claimState !== 'claiming') {
                    setClaimState('idle');
                    setError('');
                    setTransactions([]);
                  }
                }}
                placeholder="0x Wallet Address"
              />
            </div>
            {address && !addressValid && <p className="field-hint mobile-address-hint error-text">Use a complete 42-character EVM address.</p>}
          </div>

          <div className="section-heading asset-heading">
            <div><h2>Select assets</h2><p>INJ is included. Choose up to one additional network.</p></div>
          </div>

          <div className="network-list">
            {FAUCET_NETWORKS.map((network: FaucetNetwork) => {
              const balance = balanceById.get(network.id);
              const selected = network.isBase || selectedCompanion === network.id;
              const unavailable = !balancesLoading && (!balance?.reachable || !balance?.available);
              return (
                <button
                  key={network.id}
                  type="button"
                  disabled={network.isBase || unavailable || claimState === 'claiming' || claimState === 'success'}
                  onClick={() => setSelectedCompanion(selectedCompanion === network.id ? null : network.id)}
                  className={`network-row ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}
                  aria-pressed={selected}
                >
                  <span className="network-logo">
                    <Image src={network.logo} alt={`${network.shortName} logo`} width={40} height={40} />
                  </span>
                  <span className="network-copy">
                    <strong>{network.shortName}</strong>
                    <small>{network.name}</small>
                  </span>
                  <span className="network-amount"><b>{network.amount} {network.symbol}</b><small>{network.isBase ? 'Included' : 'Optional'}</small></span>
                  <span className="inventory">
                    {balancesLoading ? <i className="inventory-loader" /> : <><b>{unavailable ? 'Empty' : Number(balance?.balance ?? 0).toFixed(network.isBase ? 3 : 2)}</b><small>{network.symbol} stock</small></>}
                  </span>
                  <span className="choice-mark">{selected ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>

          <div className="mobile-claim-action" aria-live="polite">
            {claimState === 'error' && <div className="claim-error mobile-claim-error"><span>!</span><p>{error}</p></div>}
            <button className="claim-button mobile-claim-button" type="button" disabled={!canClaim} onClick={() => void claim()}>
              {claimState === 'claiming' && <i className="button-spinner" />}
              <span>{mobileClaimButtonLabel}</span>
            </button>
          </div>
        </div>

        <aside className={`summary-panel ${claimState}`} aria-live="polite">
          <div className="summary-topline">
            <span>{claimState === 'success' ? 'Complete' : claimState === 'claiming' ? 'Processing' : 'Your claim'}</span>
            <code>INJ.TOP / 01</code>
          </div>
          <div className="summary-destination">
            <span>Destination</span>
            <div className={`address-field summary-address ${address && !addressValid ? 'invalid' : ''} ${addressValid ? 'valid' : ''}`}>
              <input
                aria-label="Wallet address"
                autoComplete="off"
                spellCheck={false}
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  if (claimState !== 'claiming') {
                    setClaimState('idle');
                    setError('');
                    setTransactions([]);
                  }
                }}
                placeholder="0x Wallet Address"
              />
            </div>
            {address && !addressValid && <p className="field-hint summary-address-hint error-text">Use a complete 42-character EVM address.</p>}
          </div>
          <div className="summary-assets">
            <div className="summary-asset">
              <Image src="/inj-logo.png" alt="Injective" width={48} height={48} />
              <div><h2>0.1 <span>INJ</span></h2><p>Injective EVM Testnet</p></div>
            </div>
            {selectedNetwork && (
              <div className="summary-companion">
                <Image src={selectedNetwork.logo} alt={`${selectedNetwork.shortName} logo`} width={26} height={26} />
                <span><b>+ 0.02 ETH</b><small>{selectedNetwork.name}</small></span>
              </div>
            )}
          </div>

          {claimState === 'claiming' ? (
            <div className="claim-progress">
              <div className="progress-track"><i /></div>
              <ol><li className="done">Validating request</li><li className="active">Signing transactions</li><li>Broadcasting onchain</li></ol>
            </div>
          ) : claimState === 'success' ? (
            <div className="transaction-list">
              {transactions.map((transaction) => (
                <a key={transaction.hash} href={transaction.explorerUrl ?? '#'} target="_blank" rel="noreferrer">
                  <span><b>{transaction.amount} {transaction.symbol}</b><small>{transaction.networkId}</small></span>
                  <code>{compactHash(transaction.hash)}</code>
                </a>
              ))}
            </div>
          ) : (
            <>
              <div className="summary-rule" />
              <dl>
                <div><dt>Daily limit</dt><dd>01 request</dd></div>
                <div><dt>Cost</dt><dd>Free</dd></div>
                <div><dt>Delivery</dt><dd>~ 10 sec</dd></div>
              </dl>
            </>
          )}

          {claimState === 'error' && <div className="claim-error"><span>!</span><p>{error}</p></div>}
          <button className="claim-button" type="button" disabled={!canClaim} onClick={() => void claim()}>
            {claimState === 'claiming' && <i className="button-spinner" />}
            <span>{claimButtonLabel}</span><b>{claimState === 'success' ? '✓' : '↗'}</b>
          </button>
          <small className="fine-print">Testnet assets have no monetary value.<br />Limit resets at 00:00 UTC.</small>
        </aside>
      </section>

      <footer><strong>Injective.Top</strong><span>by <a href="https://x.com/INJ_Pass" target="_blank" rel="noreferrer">INJ Pass</a></span><span>Built for builders</span></footer>
    </main>
  );
}
