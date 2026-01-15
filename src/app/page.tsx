
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check for a mock session first.
    const userSession = localStorage.getItem('mock-user-session');
    if (userSession) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
    
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}
