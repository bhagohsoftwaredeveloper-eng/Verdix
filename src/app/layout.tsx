
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';

// This is a workaround for a hydration error caused by the Toaster component.
// By rendering it only on the client, we avoid the server-client mismatch.
function ClientOnlyToaster() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <Toaster /> : null;
}


// The metadata object is not used in a client component, 
// but we'll keep it here for now.
// export const metadata: Metadata = {
//   title: 'StockPilot',
//   description: 'Point of Sales + Inventory Management',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>StockPilot</title>
        <meta name="description" content="Point of Sales + Inventory Management" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
       
        <ClientOnlyToaster />
      </body>
    </html>
  );
}
