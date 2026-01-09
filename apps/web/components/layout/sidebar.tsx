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
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
  { 
    label: 'Office', 
    icon: Layers,
    children: [
      { href: '/office/mail', label: 'Mail' },
      { href: '/office/chat', label: 'Chat' },
      { href: '/office/social-media', label: 'Social Media' },
      { href: '/office/notes', label: 'Notes' },
      { href: '/office/todo-list', label: 'Todo List' },
      { href: '/office/tasks', label: 'Tasks' },
      { href: '/office/calendar', label: 'Calendar' },
      { href: '/office/file-manager', label: 'File Manager' },
    ]
  },
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
      { href: '/pricebook/organization', label: 'Dashboard' },
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

const UNBUILT_FEATURES = [
  'Calls', 'Schedule', 'Dispatch', 'Contacts', 'Communication',
  'Accounting', 'Purchasing', 'Inventory', 'Follow Up', 'Reports',
  'Marketing', 'Fleet Pro', 'Projects'
];

interface SidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onNavigate, isMobile }: SidebarProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarCollapsed, hideUnbuiltFeatures, _hasHydrated } = useUIStore();
  
  const filteredNavItems = (_hasHydrated && hideUnbuiltFeatures)
    ? navItems.filter(item => !UNBUILT_FEATURES.includes(item.label))
    : navItems;
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Pricebook']));
  
  // On mobile, always show expanded sidebar (not collapsed)
  const isCollapsed = isMobile ? false : sidebarCollapsed;
  
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

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  // Desktop sidebar - uses .desktop-sidebar class which is hidden on mobile via CSS media query
  // The mobile sidebar is rendered inside Sheet in layout.tsx with isMobile=true
  if (!isMobile) {
    return (
      <aside
        className={cn(
          'desktop-sidebar flex flex-col fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 overflow-y-auto border-r border-sidebar-border',
          isCollapsed ? 'w-16' : 'w-56'
        )}
      >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2" onClick={handleNavigate}>
              <div className="h-7 w-7 rounded bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-xs">PC</span>
              </div>
              <span className="font-semibold text-sm">Perfect Catch</span>
            </Link>
          )}
          {isCollapsed && (
            <div className="h-7 w-7 rounded bg-sidebar-primary flex items-center justify-center mx-auto">
              <span className="text-sidebar-primary-foreground font-bold text-xs">PC</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2">
          {filteredNavItems.map((item) => {
            const isActive = isItemActive(item);
            const isExpanded = expandedItems.has(item.label);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.label}>
                {/* Main nav item */}
                {item.href && !hasChildren ? (
                  <Link
                    href={item.href}
                    onClick={handleNavigate}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 text-sm transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
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
                {!isCollapsed && hasChildren && isExpanded && (
                  <div className="bg-sidebar-accent/50">
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
                          onClick={handleNavigate}
                          className={cn(
                            'block pl-11 pr-4 py-2 text-sm transition-colors min-h-[44px] flex items-center',
                            childActive
                              ? 'text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
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
        <div className="border-t border-sidebar-border py-2">
          <div className={cn(
            'flex items-center gap-2 px-4 py-2',
            isCollapsed && 'justify-center px-2'
          )}>
            <ThemeToggle />
          </div>
          <Link
            href="/settings"
            onClick={handleNavigate}
            className={cn(
              'flex items-center gap-3 px-4 py-2 text-sm transition-colors min-h-[44px]',
              pathname === '/settings'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </div>
      </div>
    </aside>
    );
  }

  // Mobile sidebar (rendered inside Sheet)
  return (
    <aside className="w-full h-full bg-sidebar text-sidebar-foreground overflow-y-auto">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={handleNavigate}>
            <div className="h-7 w-7 rounded bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-xs">PC</span>
            </div>
            <span className="font-semibold text-sm">Perfect Catch</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2">
          {filteredNavItems.map((item) => {
            const isActive = isItemActive(item);
            const isExpanded = expandedItems.has(item.label);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.label}>
                {item.href && !hasChildren ? (
                  <Link
                    href={item.href}
                    onClick={handleNavigate}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 text-sm transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {hasChildren && (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </button>
                )}

                {hasChildren && isExpanded && (
                  <div className="bg-sidebar-accent/50">
                    {item.children!.map((child) => {
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
                          onClick={handleNavigate}
                          className={cn(
                            'block pl-11 pr-4 py-2 text-sm transition-colors min-h-[44px] flex items-center',
                            childActive
                              ? 'text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
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
        <div className="border-t border-sidebar-border py-2">
          <div className="flex items-center gap-2 px-4 py-2">
            <ThemeToggle />
          </div>
          <Link
            href="/settings"
            onClick={handleNavigate}
            className={cn(
              'flex items-center gap-3 px-4 py-2 text-sm transition-colors min-h-[44px]',
              pathname === '/settings'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
