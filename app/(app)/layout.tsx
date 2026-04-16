
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WindowControls } from '@/components/window-controls';
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
  ChartNoAxesCombined,
  ClipboardCheck,
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
import { Logo } from '@/components/logo';
import { ApprovalsDrawer } from '@/components/approvals/approvals-drawer';
import { WorkflowSettingsDrawer } from '@/components/approvals/workflow-settings-drawer';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'view_dashboard' },
  { href: '/products', icon: Package, label: 'Products', permission: 'manage_products' },
];

const inventoryNavItems = [
  { href: '/inventory', label: 'Stock Levels' },
  { href: '/inventory/transfer-board', label: 'Stock Transfer Board' },
  { href: '/inventory/shelf-board', label: 'Shelf Transfer Board' },
  { href: '/inventory/stock-counts', label: 'Stock Counts (Snapshots)' },
  { href: '/inventory/repackaging', label: 'Repackaging / Break Pack' },
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
  { href: '/sales/cash-transfer', label: 'POS Cash Transfer' },
  { href: '/sales/returns', label: 'Merchandise Credits' },
  { href: '/sales/voids', label: 'Post Void' },
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
  { href: '/approvals', icon: ClipboardCheck, label: 'Approvals Board', permission: 'view_approvals' },
  { href: '/approvals/settings', icon: Settings, label: 'Workflow Settings', permission: 'manage_approval_settings' },
  { href: '/reports', icon: BarChart3, label: 'Reports', permission: 'view_reports' },
  // Suppliers moved to own section
  { href: '/user-management', icon: Users, label: 'User Management', permission: 'manage_users' },
  { href: '/settings', icon: Settings, label: 'Settings', permission: 'manage_settings' },
];

const purchasesNavItems = [
  { href: '/purchases', label: 'Purchase Orders' },
  { href: '/purchases/bad-orders', label: 'Bad Orders' },
];


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ email: string, permissions?: string[], userType?: string } | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isApprovalsDrawerOpen, setIsApprovalsDrawerOpen] = useState(false);
  const [isWorkflowSettingsDrawerOpen, setIsWorkflowSettingsDrawerOpen] = useState(false);

  const isPOSPage = pathname === '/pos';

  useEffect(() => {
    // Skip global auth enforcement if landing directly on the POS page.
    // The POS page completely handles its own auth via `PosLoginForm`.
    if (pathname === '/pos') {
      setIsUserLoading(false);
      return;
    }

    const userSession = localStorage.getItem('mock-user-session');
    if (userSession) {
      setUser(JSON.parse(userSession));
    } else {
      router.push('/login');
    }
    setIsUserLoading(false);
  }, [router, pathname]);

  // Force Cashiers to the POS page
  useEffect(() => {
    if (user?.userType === 'Cashier' && pathname !== '/pos') {
      router.push('/pos');
    }
  }, [user, pathname, router]);

  // If this is the POS page, immediately bypass the layout and global auth checks!
  if (isPOSPage) {
    return <>{children}</>;
  }

  // Enforce auth UI wrapper for normal pages
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

  const isSalesPage = pathname.startsWith('/sales');
  const isInventoryPage = pathname.startsWith('/inventory');
  const isCustomerPage = pathname.startsWith('/customer');
  const isSuppliersPage = pathname.startsWith('/suppliers');
  const isPurchasesPage = pathname.startsWith('/purchases');

  const getInitials = (email?: string | null) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  };

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));
  const filteredOtherNavItems = otherNavItems.filter(item => hasPermission(item.permission));

  return (
    <SidebarProvider>
      <Sidebar className="non-printable border-r" collapsible="icon">
        <SidebarHeader className="h-20 border-b border-sidebar-border sticky top-0 bg-gradient-to-b from-sidebar to-sidebar/95 backdrop-blur-xl z-10 px-6 group-data-[collapsible=icon]:px-0 justify-center shadow-sm">
          <div className="flex items-center gap-3 transition-all duration-300 group-data-[collapsible=icon]:justify-center">
            <Logo variant="icon" size={36} />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
               <h1 className="text-xl font-extrabold font-headline tracking-tight text-sidebar-foreground">Stockpilot</h1>
               <span className="text-[10px] uppercase font-bold text-primary tracking-[0.2em] mt-0.5 opacity-90">Enterprise</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-6 gap-2 overflow-y-auto flex-1 group-data-[collapsible=icon]:px-0">
          {filteredNavItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Platform</SidebarGroupLabel>
              <SidebarMenu>
                {filteredNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={{ children: item.label }}
                        className="gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                      >
                        <item.icon />
                        <span className="text-[14px]">{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}

          {(hasPermission('manage_inventory') || hasPermission('view_sales') || hasPermission('manage_customers') || hasPermission('manage_purchases') || hasPermission('manage_suppliers')) && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Operations</SidebarGroupLabel>

            <SidebarMenu>

              {hasPermission('manage_inventory') && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isInventoryPage} className="group/collapsible group-data-[collapsible=icon]:items-center">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isInventoryPage}
                        tooltip={{ children: "Inventory" }}
                        className="justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <Warehouse />
                          <span className="text-[14px]">Inventory</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                        {inventoryNavItems.map((item) => (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 transition-colors duration-200">
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
                        className="justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                      >
                         <div className="flex items-center gap-3">
                          <ChartNoAxesCombined />
                          <span className="text-[14px]">Sales</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                        {salesNavItems.map((item) => (
                          <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 transition-colors duration-200">
                              <Link href={item.href}>{item.label}</Link>
                             </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

               {hasPermission('manage_customers') && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isCustomerPage} className="group/collapsible">
                     <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isCustomerPage}
                        tooltip={{ children: "Customers" }}
                        className="justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <UserIcon />
                          <span className="text-[14px]">Customers</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                     <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                        {customerNavItems.map((item) => (
                           <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 transition-colors duration-200">
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
                  <Collapsible defaultOpen={isPurchasesPage} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isPurchasesPage}
                        tooltip={{ children: "Purchases" }}
                         className="justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                      >
                         <div className="flex items-center gap-3">
                          <ShoppingCart />
                          <span className="text-[14px]">Purchases</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                         {purchasesNavItems.map((item) => (
                          <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 transition-colors duration-200">
                              <Link href={item.href}>{item.label}</Link>
                             </SidebarMenuSubButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

               {hasPermission('manage_suppliers') && (
                <SidebarMenuItem>
                  <Collapsible defaultOpen={isSuppliersPage} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isSuppliersPage}
                        tooltip={{ children: "Suppliers" }}
                         className="justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                      >
                         <div className="flex items-center gap-3">
                          <Users />
                          <span className="text-[14px]">Suppliers</span>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
                         {suppliersNavItems.map((item) => (
                          <SidebarMenuItem key={item.href}>
                             <SidebarMenuSubButton asChild isActive={pathname === item.href} className="text-[13px] h-9 rounded-md hover:bg-sidebar-accent/50 transition-colors duration-200">
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
          )}

          {filteredOtherNavItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Management</SidebarGroupLabel>
              <SidebarMenu>
                {filteredOtherNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.href === '/approvals' ? (
                      <SidebarMenuButton
                        onClick={() => setIsApprovalsDrawerOpen(true)}
                        isActive={isApprovalsDrawerOpen}
                        tooltip={{ children: item.label }}
                        className="gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                      >
                        <item.icon />
                        <span className="text-[14px]">{item.label}</span>
                      </SidebarMenuButton>
                    ) : item.href === '/approvals/settings' ? (
                      <SidebarMenuButton
                        onClick={() => setIsWorkflowSettingsDrawerOpen(true)}
                        isActive={isWorkflowSettingsDrawerOpen}
                        tooltip={{ children: item.label }}
                        className="gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                      >
                        <item.icon />
                        <span className="text-[14px]">{item.label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <Link href={item.href}>
                        <SidebarMenuButton
                          isActive={pathname === item.href}
                          tooltip={{ children: item.label }}
                          className="gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                        >
                          <item.icon />
                          <span className="text-[14px]">{item.label}</span>
                        </SidebarMenuButton>
                      </Link>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="sticky bottom-0 bg-gradient-to-t from-sidebar to-sidebar/95 backdrop-blur-xl border-t border-sidebar-border mt-auto shadow-lg">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 overflow-hidden rounded-lg p-3 text-left text-sm text-sidebar-foreground outline-none ring-sidebar-ring transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground focus-visible:ring-2 hover:shadow-sm">
                <Avatar className="size-9 ring-2 ring-sidebar-border shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold border border-primary/20">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-semibold">
                    {user.email || 'Anonymous'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">View Profile</span>
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

        <header className="sticky top-0 z-30 flex items-center h-16 gap-4 px-4 border-b bg-background/80 backdrop-blur-sm sm:px-6 non-printable window-drag">
          <div className="flex items-center gap-4 window-no-drag">
            <SidebarTrigger />
            <AppBreadcrumbs />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <WindowControls />
          </div>
        </header>
        <main className="flex-1 p-4 overflow-auto sm:p-6">
          {children}
        </main>
        <ApprovalsDrawer 
          open={isApprovalsDrawerOpen} 
          onOpenChange={setIsApprovalsDrawerOpen} 
        />
        <WorkflowSettingsDrawer
          open={isWorkflowSettingsDrawerOpen}
          onOpenChange={setIsWorkflowSettingsDrawerOpen}
          onBack={() => {
            setIsWorkflowSettingsDrawerOpen(false);
            setIsApprovalsDrawerOpen(true);
          }}
        />
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
    let interval: NodeJS.Timeout;

    const checkStock = async () => {
        try {
            // First check if notifications are enabled
            const settingsResponse = await fetch('/api/pos-settings');
            const settingsResult = await settingsResponse.json();
            
            if (!settingsResult.success || !settingsResult.data.enablePushNotifications) {
                setNotifications([]);
                return;
            }

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
    interval = setInterval(checkStock, 30000);
    
    return () => {
      if (interval) clearInterval(interval);
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
