'use client';

import Link from 'next/link';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Warehouse, ChartNoAxesCombined, User as UserIcon,
  ShoppingCart, Users, ChevronDown, LogOut,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { handleSignOut } from '../auth-actions';
import {
  inventoryNavItems, salesNavItems, customerNavItems,
  suppliersNavItems, purchasesNavItems,
} from './layout-nav-config';

type AppUser = { email: string; permissions?: string[]; userType?: string };

type Props = {
  user: AppUser;
  businessName: string;
  hasPermission: (permission?: string) => boolean;
  filteredNavItems: { href: string; icon: any; label: string; permission?: string }[];
  filteredOtherNavItems: { href: string; icon: any; label: string; permission?: string }[];
  pathname: string;
  getInitials: (email?: string | null) => string;
};

export function AppSidebar({
  user, businessName, hasPermission,
  filteredNavItems, filteredOtherNavItems,
  pathname, getInitials,
}: Props) {
  const isSalesPage = pathname.startsWith('/sales');
  const isInventoryPage = pathname.startsWith('/inventory');
  const isCustomerPage = pathname.startsWith('/customer');
  const isSuppliersPage = pathname.startsWith('/suppliers');
  const isPurchasesPage = pathname.startsWith('/purchases');

  const hasOperations = hasPermission('manage_inventory') || hasPermission('view_sales') ||
    hasPermission('manage_customers') || hasPermission('manage_purchases') || hasPermission('manage_suppliers');

  return (
    <Sidebar className="non-printable border-r" collapsible="icon">
      <SidebarHeader className="h-20 border-b border-sidebar-border sticky top-0 bg-gradient-to-b from-sidebar to-sidebar/95 backdrop-blur-xl z-10 px-6 group-data-[collapsible=icon]:px-0 justify-center shadow-sm">
        <div className="flex items-center gap-3 transition-all duration-300 group-data-[collapsible=icon]:justify-center">
          <Logo variant="icon" size={36} />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h1 className="text-xl font-extrabold font-headline tracking-tight text-sidebar-foreground">{businessName}</h1>
            <span className="text-[10px] uppercase font-bold text-primary tracking-[0.2em] mt-0.5 opacity-90">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6 gap-2 overflow-y-auto flex-1 group-data-[collapsible=icon]:px-0">
        {filteredNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Platform</SidebarGroupLabel>
            <SidebarMenu>
              {filteredNavItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href} tooltip={{ children: item.label }} className="gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm">
                      <item.icon />
                      <span className="text-[14px]">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {hasOperations && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Operations</SidebarGroupLabel>
            <SidebarMenu>
              {hasPermission('manage_inventory') && (
                <CollapsibleNavSection label="Inventory" icon={Warehouse} isActive={isInventoryPage} items={inventoryNavItems} pathname={pathname} />
              )}
              {hasPermission('view_sales') && (
                <CollapsibleNavSection label="Sales" icon={ChartNoAxesCombined} isActive={isSalesPage} items={salesNavItems} pathname={pathname} />
              )}
              {hasPermission('manage_customers') && (
                <CollapsibleNavSection label="Customers" icon={UserIcon} isActive={isCustomerPage} items={customerNavItems} pathname={pathname} />
              )}
              {hasPermission('manage_purchases') && (
                <CollapsibleNavSection label="Purchases" icon={ShoppingCart} isActive={isPurchasesPage} items={purchasesNavItems} pathname={pathname} />
              )}
              {hasPermission('manage_suppliers') && (
                <CollapsibleNavSection label="Suppliers" icon={Users} isActive={isSuppliersPage} items={suppliersNavItems} pathname={pathname} />
              )}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {filteredOtherNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 px-4 mb-3">Management</SidebarGroupLabel>
            <SidebarMenu>
              {filteredOtherNavItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href} tooltip={{ children: item.label }} className="gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm">
                      <item.icon />
                      <span className="text-[14px]">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
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
                <span className="text-sm font-semibold">{user.email || 'Anonymous'}</span>
                <span className="text-[11px] text-muted-foreground">View Profile</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">My Account</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" /><span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSignOut()}>
              <LogOut className="mr-2 h-4 w-4" /><span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

type SectionProps = {
  label: string;
  icon: any;
  isActive: boolean;
  items: { href: string; label: string }[];
  pathname: string;
};

function CollapsibleNavSection({ label, icon: Icon, isActive, items, pathname }: SectionProps) {
  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen={isActive} className="group/collapsible group-data-[collapsible=icon]:items-center">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive} tooltip={{ children: label }} className="justify-between gap-3 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <Icon />
              <span className="text-[14px]">{label}</span>
            </div>
            <ChevronDown className="size-4 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border/40 pl-3 my-2 space-y-1">
            {items.map(item => (
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
  );
}
