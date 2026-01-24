
'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

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
  Settings,
  Package2,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { handleSignOut } from '../auth-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { getProducts, getLowStockAlerts } from './products/actions';
import { Product } from '@/lib/types';
import { AppBreadcrumbs } from '@/components/app-breadcrumbs';


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
  { href: '/customer', label: 'Customer List' },
  { href: '/customer/payment', label: 'Customer Payment' },
  { href: '/customer/balances', label: 'Customer Balances' },
  { href: '/customer/loyalty', label: 'Customer Loyalty Points' },
];

const suppliersNavItems = [
  { href: '/suppliers/list', label: 'Supplier List' },
  { href: '/suppliers/balance', label: 'Balance to Supplier' },
  { href: '/suppliers/payment', label: 'Payment Suppliers' },
];

const otherNavItems = [
  { href: '/purchases', icon: ShoppingCart, label: 'Purchases', permission: 'manage_purchases' },
  { href: '/reports', icon: BarChart3, label: 'Reports', permission: 'view_reports' },
  { href: '/restock', icon: Lightbulb, label: 'Restock AI', permission: 'use_ai_features' },
  // Suppliers moved to own section
  { href: '/user-management', icon: Users, label: 'User Management', permission: 'manage_users' },
  { href: '/settings', icon: Settings, label: 'Settings', permission: 'manage_settings' },
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
      <Sidebar className="non-printable border-r-0" collapsible="icon">
        <SidebarHeader className="h-16 border-b border-sidebar-border/50 sticky top-0 bg-sidebar/95 backdrop-blur z-10 px-6 justify-center">
          <div className="flex items-center gap-3 transition-all duration-200 group-data-[collapsible=icon]:justify-center">
            <div className="p-1.5 bg-primary/10 rounded-lg group-data-[collapsible=icon]:p-1">
              <Package2 className="size-6 text-primary" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
               <h1 className="text-lg font-bold font-headline tracking-tight text-sidebar-foreground">StockPilot</h1>
               <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Enterprise</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-4 gap-4 overflow-y-auto flex-1">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-4 mb-2">Platform</SidebarGroupLabel>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={{ children: item.label }}
                      className="gap-3 px-4 font-medium"
                    >
                      <item.icon className="bg-transparent" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-4 mb-2">Operations</SidebarGroupLabel>
            <SidebarMenu>
              {hasPermission('manage_inventory') && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isInventoryPage} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isInventoryPage}
                        tooltip={{ children: "Inventory" }}
                        className="justify-between gap-3 px-4 font-medium"
                      >
                        <div className="flex items-center gap-3">
                          <Warehouse className="size-4" />
                          <span>Inventory</span>
                        </div>
                        <ChevronDown className="size-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-4 border-l border-sidebar-border/50 pl-2 my-1 space-y-0.5">
                        {inventoryNavItems.map((item) => (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-8">
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
                  <Collapsible defaultOpen={isSalesPage} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isSalesPage}
                        tooltip={{ children: "Sales" }}
                        className="justify-between gap-3 px-4 font-medium"
                      >
                         <div className="flex items-center gap-3">
                          <Receipt className="size-4" />
                          <span>Sales</span>
                        </div>
                        <ChevronDown className="size-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-4 border-l border-sidebar-border/50 pl-2 my-1 space-y-0.5">
                        {salesNavItems.map((item) => (
                          <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-8">
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
                  <Collapsible defaultOpen={isCustomerPage} className="group/collapsible">
                     <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isCustomerPage}
                        tooltip={{ children: "Customers" }}
                        className="justify-between gap-3 px-4 font-medium"
                      >
                        <div className="flex items-center gap-3">
                          <UserIcon className="size-4" />
                          <span>Customers</span>
                        </div>
                        <ChevronDown className="size-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                     <CollapsibleContent>
                      <SidebarMenuSub className="ml-4 border-l border-sidebar-border/50 pl-2 my-1 space-y-0.5">
                        {customerNavItems.map((item) => (
                           <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-8">
                              <Link href={item.href}>{item.label}</Link>
                             </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

               {hasPermission('manage_purchases') && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={true} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={{ children: "Suppliers" }}
                         className="justify-between gap-3 px-4 font-medium"
                      >
                         <div className="flex items-center gap-3">
                          <Users className="size-4" />
                          <span>Suppliers</span>
                        </div>
                        <ChevronDown className="size-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-4 border-l border-sidebar-border/50 pl-2 my-1 space-y-0.5">
                         {suppliersNavItems.map((item) => (
                          <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-8">
                              <Link href={item.href}>{item.label}</Link>
                             </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

           <SidebarGroup className="mt-auto">
             <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-4 mb-2">Management</SidebarGroupLabel>
            <SidebarMenu>
              {filteredOtherNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={{ children: item.label }}
                       className="gap-3 px-4 font-medium"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="sticky bottom-0 bg-sidebar/95 backdrop-blur border-t border-sidebar-border/50 mt-auto">
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
          <SidebarTrigger />
          <AppBreadcrumbs />
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

function NotificationsBell() {
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; type: 'warning' | 'info'; link: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Poll for low stock notifications
  // Poll for low stock notifications and listen for updates
  useEffect(() => {
    const checkStock = async () => {
        try {
            const lowStock = await getLowStockAlerts();
            
            const newNotifications = lowStock.map((p: any) => ({
                id: `low-stock-${p.id}`,
                title: 'Low Stock Alert',
                message: `${p.name} is below reorder point (${p.stock}/${p.reorderPoint})`,
                type: 'warning' as const,
                link: `/products?filter=low-stock`
            }));
            
            setNotifications(newNotifications);
        } catch (e) {
            console.error("Failed to fetch notifications", e);
        }
    };
    
    checkStock();
    
    // Listen for stock updates
    const handleStockUpdate = () => {
      checkStock();
    };
    
    window.addEventListener('stock-updated', handleStockUpdate);
    
    // Poll every 30 seconds as a fallback
    const interval = setInterval(checkStock, 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('stock-updated', handleStockUpdate);
    };
  }, []);

  const unreadCount = notifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-600 border-2 border-background animate-pulse" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 font-medium border-b">Notifications</div>
        <div className="max-h-[300px] overflow-y-auto">
             {notifications.length === 0 ? (
                 <div className="p-4 text-center text-sm text-muted-foreground">
                     No new notifications
                 </div>
             ) : (
                 <div className="grid">
                     {notifications.map((notification) => (
                        <div 
                            key={notification.id} 
                            className="p-4 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors"
                            onClick={() => {
                                setIsOpen(false);
                                router.push(notification.link);
                            }}
                        >
                            <div className="flex gap-3">
                                <div className="mt-1">
                                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium leading-none">{notification.title}</p>
                                    <p className="text-sm text-muted-foreground mt-1 text-xs">
                                        {notification.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                     ))}
                 </div>
             )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
