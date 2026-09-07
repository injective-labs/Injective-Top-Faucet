# Injective.Top

A standalone multichain testnet faucet extracted from the INJ Pass frontend. It sends:

- `0.1 INJ` on Injective EVM Testnet with every successful claim.
- An optional `0.02 ETH` on one companion network: Ethereum Sepolia, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia, or Polygon zkEVM Cardona.

The page reads the faucet wallet inventory live and disables networks that are empty or unreachable. Claims are limited to one request per recipient address per UTC day while the server process is running.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and set:

```dotenv
FAUCET_PRIVATE_KEY=
FAUCET_WALLET_ADDRESS=
```

The private key is only read by server routes. Never prefix it with `NEXT_PUBLIC_`.

## Checks

```bash
npm test
npm run lint
npm run build
```

## Operational notes

- The current limiter is intentionally the recovered in-memory implementation. Use Redis or another durable store before horizontally scaling or exposing the faucet publicly.
- Requests on each chain are serialized to avoid signer nonce collisions.
- If one transaction is broadcast and a later companion-chain transaction fails, the recipient remains locked for the UTC day to prevent duplicate INJ payouts; the API returns the partial transaction information.
- USDC and USDT addresses exist in the original INJ Pass testnet token configuration, but the configured faucet signer currently has zero balance for both. They are therefore not advertised as claimable assets.
- Testnet assets have no monetary value.
