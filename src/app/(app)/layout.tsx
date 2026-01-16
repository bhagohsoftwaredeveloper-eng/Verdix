
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Lightbulb,
  Search,
  Bell,
  Warehouse,
  Receipt,
  Monitor,
  LogOut,
  User as UserIcon,
  History,
  ArrowRightLeft,
  Users,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { handleSignOut } from '@/app/auth-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsBell } from '@/components/notifications-bell';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'view_dashboard' },
  { href: '/pos', icon: Monitor, label: 'Point of Sale', permission: 'access_pos' },
  { href: '/products', icon: Package, label: 'Products', permission: 'manage_products' },
];

const inventoryNavItems = [
  { href: '/inventory', label: 'Stock Levels' },
  { href: '/inventory/history', label: 'Adjustment History' },
  { href: '/inventory/movement', label: 'Stock Movement' },
]

const salesNavItems = [
  { href: '/sales', label: 'POS Sales Transaction' },
  { href: '/sales/details', label: 'POS Sales Detail' },
  { href: '/sales/by-product', label: 'Sales by Product/Service' },
  { href: '/sales/by-date', label: 'Sales by Date' },
  { href: '/sales/orders', label: 'Sales Order' },
  { href: '/sales/invoices', label: 'Sales Invoice/Delivery' },
  { href: '/sales/returns', label: 'Returned Sales' },
  { href: '/sales/voids', label: 'Voided Sales' },
  { href: '/sales/z-reading', label: 'POS Z-Reading' },
  { href: '/sales/x-reading', label: 'POS X-Reading' },
  { href: '/sales/analysis', label: 'Sales Analysis' },
];

const customerNavItems = [
  { href: '/customer/payment', label: 'Customer Payment' },
  { href: '/customer/balances', label: 'Customer Balances' },
  { href: '/customer/loyalty', label: 'Customer Loyalty Points' },
];

const otherNavItems = [
  { href: '/purchases', icon: ShoppingCart, label: 'Purchases', permission: 'manage_purchases' },
  { href: '/reports', icon: BarChart3, label: 'Reports', permission: 'view_reports' },
  { href: '/restock', icon: Lightbulb, label: 'Restock AI', permission: 'use_ai_features' },
  { href: '/user-management', icon: Users, label: 'User Management', permission: 'manage_users' },
];


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ email: string, permissions?: string[], userType?: string } | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const userSession = localStorage.getItem('mock-user-session');
    if (userSession) {
      setUser(JSON.parse(userSession));
    } else {
      router.push('/login');
    }
    setIsUserLoading(false);
  }, [router]);

  // Force Cashiers to the POS page
  useEffect(() => {
    if (user?.userType === 'Cashier' && pathname !== '/pos') {
      router.push('/pos');
    }
  }, [user, pathname, router]);


  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasPermission = (permission?: string) => {
    if (!user) return false;

    // Super admin bypass
    if (user.permissions?.includes('super_admin')) return true;

    // Cashier restriction: ONLY access_pos is allowed
    if (user.userType === 'Cashier') {
      return permission === 'access_pos';
    }

    // General permission check
    if (permission && !user.permissions?.includes(permission)) {
      return false;
    }

    return true;
  };

  const isPOSPage = pathname === '/pos';

  if (isPOSPage) {
    if (!hasPermission('access_pos')) {
      router.push('/dashboard'); // Or a dedicated "access denied" page
      return null;
    }
    return <>{children}</>;
  }

  const isSalesPage = pathname.startsWith('/sales');
  const isInventoryPage = pathname.startsWith('/inventory');
  const isCustomerPage = pathname.startsWith('/customer');

  const getInitials = (email?: string | null) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  };

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));
  const filteredOtherNavItems = otherNavItems.filter(item => hasPermission(item.permission));

  return (
    <SidebarProvider>
      <Sidebar className="non-printable">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-7 text-primary" />
            <h1 className="text-xl font-semibold font-headline text-sidebar-foreground">StockPilot</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {filteredNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}

            {hasPermission('manage_inventory') && (
              <SidebarMenuItem>
                <Collapsible defaultOpen={isInventoryPage}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isInventoryPage}
                      tooltip={{ children: "Inventory" }}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Warehouse />
                        <span>Inventory</span>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {inventoryNavItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                            <Link href={item.href}>{item.label}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )}

            {hasPermission('view_sales') && (
              <SidebarMenuItem>
                <Collapsible defaultOpen={isSalesPage}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isSalesPage}
                      tooltip={{ children: "Sales" }}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Receipt />
                        <span>Sales</span>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {salesNavItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                            <Link href={item.href}>{item.label}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )}

            {hasPermission('view_sales') && (
              <SidebarMenuItem>
                <Collapsible defaultOpen={isCustomerPage}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isCustomerPage}
                      tooltip={{ children: "Customer" }}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <UserIcon />
                        <span>Customer</span>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {customerNavItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                            <Link href={item.href}>{item.label}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )}

            {filteredOtherNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-sidebar-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-medium">
                    {user.email || 'Anonymous'}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">My Account</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSignOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex items-center h-16 gap-4 px-4 border-b bg-background/80 backdrop-blur-sm sm:px-6 non-printable">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1" />
          <NotificationsBell />
        </header>
        <main className="flex-1 p-4 overflow-auto sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
