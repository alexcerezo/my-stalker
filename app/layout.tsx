import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instagram',
  description: 'Instagram UI Clone built with Next.js',
  icons: {
    icon: '/assets/favicon.svg',
  },
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
