import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'RuangDana | Manajemen Keuangan',
  description:
    'Catat pemasukan dan pengeluaran, kelola kategori, serta pantau ringkasan keuangan.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="id" className="min-h-dvh antialiased">
      <body className="flex min-h-dvh flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
