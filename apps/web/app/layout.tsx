import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { QueryProvider } from '../components/query-provider';

export const metadata: Metadata = {
  title: 'Pulso',
  description: 'Life OS personal para recuperacion, nutricion y rendimiento',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Pulso', statusBarStyle: 'black-translucent' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

