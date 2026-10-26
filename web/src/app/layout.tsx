import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ApnaGhar - Real Estate Marketplace',
  description: 'Find your dream property with ApnaGhar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
