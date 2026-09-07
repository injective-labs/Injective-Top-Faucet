export interface FaucetNetwork {
  id: string;
  name: string;
  shortName: string;
  rpcUrl: string;
  chainId: number;
  amount: string;
  symbol: 'INJ' | 'ETH';
  color: string;
  logo: string;
  isBase: boolean;
  explorerUrl: string;
}

export const FAUCET_NETWORKS: FaucetNetwork[] = [
  {
    id: 'injective',
    name: 'Injective EVM Testnet',
    shortName: 'Injective',
    rpcUrl: 'https://k8s.testnet.json-rpc.injective.network/',
    chainId: 1439,
    amount: '0.1',
    symbol: 'INJ',
    color: '#7c5cff',
    logo: '/inj-logo.png',
    isBase: true,
    explorerUrl: 'https://testnet.blockscout.injective.network/tx/',
  },
  {
    id: 'sepolia',
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    chainId: 11155111,
    amount: '0.02',
    symbol: 'ETH',
    color: '#7995ff',
    logo: '/eth-logo.png',
    isBase: false,
    explorerUrl: 'https://sepolia.etherscan.io/tx/',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum Sepolia',
    shortName: 'Arbitrum',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614,
    amount: '0.02',
    symbol: 'ETH',
    color: '#28a0f0',
    logo: '/arb-logo.png',
    isBase: false,
    explorerUrl: 'https://sepolia.arbiscan.io/tx/',
  },
  {
    id: 'optimism',
    name: 'Optimism Sepolia',
    shortName: 'Optimism',
    rpcUrl: 'https://sepolia.optimism.io',
    chainId: 11155420,
    amount: '0.02',
    symbol: 'ETH',
    color: '#ff4057',
    logo: '/op-logo.png',
    isBase: false,
    explorerUrl: 'https://sepolia-optimism.etherscan.io/tx/',
  },
  {
    id: 'base',
    name: 'Base Sepolia',
    shortName: 'Base',
    rpcUrl: 'https://sepolia.base.org',
    chainId: 84532,
    amount: '0.02',
    symbol: 'ETH',
    color: '#4d7cff',
    logo: '/base-logo.png',
    isBase: false,
    explorerUrl: 'https://sepolia.basescan.org/tx/',
  },
  {
    id: 'polygonzkevm',
    name: 'Polygon zkEVM Cardona',
    shortName: 'Polygon zkEVM',
    rpcUrl: 'https://rpc.cardona.zkevm-rpc.com',
    chainId: 2442,
    amount: '0.02',
    symbol: 'ETH',
    color: '#a676ff',
    logo: '/polygon-logo.png',
    isBase: false,
    explorerUrl: 'https://cardona-zkevm.polygonscan.com/tx/',
  },
];

export const INJECTIVE_NETWORK = FAUCET_NETWORKS.find((network) => network.isBase)!;
export const COMPANION_NETWORKS = FAUCET_NETWORKS.filter((network) => !network.isBase);

export function getCompanionNetwork(id: string | null | undefined) {
  return id ? COMPANION_NETWORKS.find((network) => network.id === id) : undefined;
}

export function buildExplorerUrl(networkId: string, hash: string) {
  const network = FAUCET_NETWORKS.find((item) => item.id === networkId);
  return network ? `${network.explorerUrl}${hash}` : null;
}
