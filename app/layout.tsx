import type { Metadata } from 'next';
import './globals.css';

const siteTitle = 'Injective.Top — Testnet Faucet for INJ and ETH';
const siteDescription = 'Claim Injective and companion-chain testnet assets from one focused faucet.';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  icons: {
    icon: [{ url: '/top-favicon.png', type: 'image/png', sizes: '256x256' }],
    shortcut: '/top-favicon.png',
    apple: '/top-favicon.png',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: 'website',
    url: '/',
    images: [{
      url: '/og.png',
      width: 1672,
      height: 941,
      alt: 'Injective.Top — Test assets. Zero friction.',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
