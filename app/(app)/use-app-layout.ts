'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api-config';
import { navItems, otherNavItems } from './layout-nav-config';

type AppUser = { email: string; permissions?: string[]; userType?: string };

export function useAppLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [businessName, setBusinessName] = useState('verdix');

  const isPOSPage = pathname === '/pos' || pathname === '/pos/customer-display';

  // Auth check
  useEffect(() => {
    if (isPOSPage) { setIsUserLoading(false); return; }
    const session = localStorage.getItem('mock-user-session');
    if (session) setUser(JSON.parse(session));
    else router.push('/login');
    setIsUserLoading(false);
  }, [router, pathname]);

  // Business name
  useEffect(() => {
    fetch(getApiUrl('/pos-settings'))
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(result => {
        if (result.success && result.data?.businessName) setBusinessName(result.data.businessName);
      })
      .catch(() => {});
  }, []);

  // Document title
  useEffect(() => { document.title = businessName; }, [businessName]);

  // Force Cashiers to POS
  useEffect(() => {
    if (user?.userType === 'Cashier' && pathname !== '/pos') router.push('/pos');
  }, [user, pathname, router]);

  const hasPermission = (permission?: string) => {
    if (!user) return false;
    if (user.permissions?.includes('super_admin')) return true;
    if (user.userType === 'Cashier') return permission === 'access_pos';
    if (permission && !user.permissions?.includes(permission)) return false;
    return true;
  };

  const getInitials = (email?: string | null) =>
    email ? email.substring(0, 2).toUpperCase() : '..';

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));
  const filteredOtherNavItems = otherNavItems.filter(item => hasPermission(item.permission));

  return {
    user, isUserLoading, isPOSPage,
    businessName,
    hasPermission, getInitials,
    filteredNavItems, filteredOtherNavItems,
    pathname,
  };
}
