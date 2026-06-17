import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { QueryProvider } from '../components/query-provider';

export const metadata: Metadata = {
  title: 'RecoveryOS',
  description: 'Life OS personal para recuperacion, nutricion y rendimiento',
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

