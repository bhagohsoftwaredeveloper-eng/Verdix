'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'Point of Sale',
  products: 'Products',
  inventory: 'Inventory',
  history: 'Adjustment History',
  movement: 'Stock Movement',
  sales: 'Sales',
  details: 'POS Sales Detail',
  'by-product': 'Sales by Product/Service',
  'by-date': 'Sales by Date',
  orders: 'Sales Order',
  invoices: 'Sales Invoice/Delivery',
  returns: 'Returned Sales',
  voids: 'Voided Sales',
  'z-reading': 'POS Z-Reading',
  'x-reading': 'POS X-Reading',
  analysis: 'Sales Analysis',
  customer: 'Customer',
  payment: 'Customer Payment',
  balances: 'Customer Balances',
  loyalty: 'Customer Loyalty Points',
  purchases: 'Purchases',
  reports: 'Reports',
  restock: 'Restock AI',
  'user-management': 'User Management',
  settings: 'Settings',
};

function getBreadcrumbSegments(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}

export function AppBreadcrumbs() {
  const pathname = usePathname();

  // Don't show breadcrumbs on dashboard or if no path
  if (pathname === '/dashboard' || pathname === '/') {
    return null;
  }

  const segments = getBreadcrumbSegments(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => (
          <React.Fragment key={segment.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === segments.length - 1 ? (
                <BreadcrumbPage>{segment.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={segment.href}>{segment.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
