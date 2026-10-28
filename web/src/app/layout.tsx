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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message && (e.message.indexOf('Loading chunk') !== -1 || e.message.indexOf('ChunkLoadError') !== -1)) {
                  if (!sessionStorage.getItem('chunk_reloaded')) {
                    sessionStorage.setItem('chunk_reloaded', '1');
                    window.location.reload();
                  }
                }
              });
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && (e.reason.name === 'ChunkLoadError' || (e.reason.message && e.reason.message.indexOf('Loading chunk') !== -1))) {
                  if (!sessionStorage.getItem('chunk_reloaded')) {
                    sessionStorage.setItem('chunk_reloaded', '1');
                    window.location.reload();
                  }
                }
              });
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
