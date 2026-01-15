import React from 'react';
import './globals.css';
import ClientLayout from '../components/client-layout';

export const metadata = {
  title: 'StockPilot',
  description: 'Point of Sales + Inventory Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
