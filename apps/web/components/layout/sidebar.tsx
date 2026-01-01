'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import {
  LayoutDashboard,
  Phone,
  Calendar,
  Truck,
  Calculator,
  ShoppingCart,
  UserCheck,
  FileText,
  Megaphone,
  Car,
  BookOpen,
  FolderTree,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Settings,
  Users,
  Kanban,
  Inbox,
  MessageSquare,
  Zap,
  Mail,
  Package,
  Code,
  Layers,
} from 'lucide-react';

interface NavItem {
  href?: string;
  label: string;
  icon: any;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { 
    label: 'Calls', 
    icon: Phone,
    children: [
      { href: '/calls/inbound', label: 'Inbound' },
      { href: '/calls/outbound', label: 'Outbound' },
    ]
  },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/dispatch', label: 'Dispatch', icon: Truck },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { 
    label: 'Communication', 
    icon: MessageSquare,
    children: [
      { href: '/inbox', label: 'Inbox' },
      { href: '/communication/email', label: 'Email' },
      { href: '/communication/sms', label: 'SMS' },
      { href: '/communication/calls', label: 'Call Log' },
    ]
  },
  {
    label: 'Accounting',
    icon: Calculator,
    children: [
      { href: '/accounting/transactions', label: 'Bank Transactions' },
      { href: '/accounting/invoices', label: 'Invoices' },
      { href: '/accounting/payments', label: 'Payments' },
      { href: '/accounting/reports', label: 'Reports' },
    ]
  },
  { 
    label: 'Purchasing', 
    icon: ShoppingCart,
    children: [
      { href: '/purchasing/orders', label: 'Purchase Orders' },
      { href: '/purchasing/vendors', label: 'Vendors' },
    ]
  },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/follow-up', label: 'Follow Up', icon: UserCheck },
  { href: '/reports', label: 'Reports', icon: FileText },
  { 
    label: 'Marketing', 
    icon: Megaphone,
    children: [
      { href: '/marketing/campaigns', label: 'Campaigns' },
      { href: '/marketing/leads', label: 'Leads' },
    ]
  },
  { href: '/automations', label: 'Automations', icon: Zap },
  { href: '/workflows', label: 'Workflows', icon: Zap },
  { href: '/fleet-pro', label: 'Fleet Pro', icon: Car },
  { 
    label: 'Pricebook', 
    icon: BookOpen,
    children: [
      { href: '/pricebook?section=kits', label: 'Material Kits' },
      { href: '/pricebook?section=services', label: 'Services' },
      { href: '/pricebook?section=materials', label: 'Materials' },
      { href: '/pricebook?section=equipment', label: 'Equipment' },
      { href: '/pricebook?section=other', label: 'Other Direct Costs' },
      { href: '/pricebook?section=discounts', label: 'Discounts & Fees' },
      { href: '/pricebook?section=categories', label: 'Categories' },
      { href: '/pricebook?section=price-setup', label: 'Price Setup' },
      { href: '/pricebook?section=history', label: 'History' },
      { href: '/pricebook?section=pricing-builder', label: 'Pricing Builder' },
      { href: '/pricebook?section=templates', label: 'Templates' },
      { href: '/pricebook?section=import-export', label: 'Import/Export' },
    ]
  },
  { href: '/projects', label: 'Projects', icon: FolderTree },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/developer', label: 'Developer', icon: Code },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarCollapsed } = useUIStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Pricebook']));
  
  // Memoize current section for pricebook
  const currentSection = useMemo(() => searchParams.get('section'), [searchParams]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isItemActive = (item: NavItem) => {
    if (item.href) {
      return pathname === item.href || pathname.startsWith(`${item.href.split('?')[0]}/`);
    }
    if (item.children) {
      return item.children.some(child => 
        pathname === child.href.split('?')[0] || pathname.startsWith(`${child.href.split('?')[0]}/`)
      );
    }
    return false;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[#1e2a3a] text-white transition-all duration-300 overflow-y-auto',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center px-4 border-b border-gray-700">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">PC</span>
              </div>
              <span className="font-semibold text-sm">Perfect Catch</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <div className="h-7 w-7 rounded bg-blue-500 flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-xs">PC</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2">
          {navItems.map((item) => {
            const isActive = isItemActive(item);
            const isExpanded = expandedItems.has(item.label);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.label}>
                {/* Main nav item */}
                {item.href && !hasChildren ? (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      sidebarCollapsed && 'justify-center px-2'
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-blue-600/50 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      sidebarCollapsed && 'justify-center px-2'
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {hasChildren && (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        )}
                      </>
                    )}
                  </button>
                )}

                {/* Children */}
                {!sidebarCollapsed && hasChildren && isExpanded && (
                  <div className="bg-[#162230]">
                    {item.children!.map((child) => {
                      // Check if this child link is active
                      const childHrefBase = child.href.split('?')[0];
                      const childSection = child.href.includes('section=') 
                        ? child.href.split('section=')[1]?.split('&')[0] 
                        : null;
                      const childActive = pathname.includes(childHrefBase) && 
                        (!childSection || childSection === currentSection);
                      
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block pl-11 pr-4 py-1.5 text-sm transition-colors',
                            childActive
                              ? 'text-blue-400'
                              : 'text-gray-400 hover:text-white'
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="border-t border-gray-700 py-2">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
              pathname === '/settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
              sidebarCollapsed && 'justify-center px-2'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
        </div>
      </div>
    </aside>
  );
}
