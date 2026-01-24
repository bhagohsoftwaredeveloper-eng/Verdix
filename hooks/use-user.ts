import { useState, useEffect } from 'react';

export interface User {
  email: string;
  permissions?: string[];
  userType?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userSession = localStorage.getItem('mock-user-session');
    if (userSession) {
      try {
        const parsedUser = JSON.parse(userSession);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user session', error);
      }
    }
    setLoading(false);
  }, []);

  return { user, loading };
}
