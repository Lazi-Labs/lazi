'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Kanban,
  Inbox,
  Users,
  CheckSquare,
  Zap,
  Settings,
  BookOpen,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
  BarChart3,
  Calendar,
  FileText,
  Target,
  Mail,
  MessageSquare,
  UserPlus,
  Building,
  Wrench,
  Package,
  Truck,
  FolderTree,
  Workflow,
  Bot,
  Webhook,
  UserCog,
  Shield,
  Palette,
  Database,
} from 'lucide-react';

const navConfig = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, description: 'Main dashboard view' },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, description: 'Performance metrics' },
      { label: 'Calendar', href: '/dashboard/calendar', icon: Calendar, description: 'Schedule and events' },
      { label: 'Reports', href: '/dashboard/reports', icon: FileText, description: 'Generate reports' },
    ],
  },
  {
    label: 'Pipeline',
    href: '/pipeline',
    icon: Kanban,
    items: [
      { label: 'Board View', href: '/pipeline', icon: Kanban, description: 'Kanban board' },
      { label: 'List View', href: '/pipeline/list', icon: FileText, description: 'Pipeline as list' },
      { label: 'Goals', href: '/pipeline/goals', icon: Target, description: 'Sales goals' },
    ],
  },
  {
    label: 'Inbox',
    href: '/inbox',
    icon: Inbox,
    items: [
      { label: 'All Messages', href: '/inbox', icon: Inbox, description: 'All communications' },
      { label: 'Email', href: '/inbox/email', icon: Mail, description: 'Email inbox' },
      { label: 'SMS', href: '/inbox/sms', icon: MessageSquare, description: 'Text messages' },
    ],
  },
  {
    label: 'Contacts',
    href: '/contacts',
    icon: Users,
    items: [
      { label: 'All Contacts', href: '/contacts', icon: Users, description: 'Contact list' },
      { label: 'Add Contact', href: '/contacts/new', icon: UserPlus, description: 'Create new contact' },
      { label: 'Companies', href: '/contacts/companies', icon: Building, description: 'Company accounts' },
    ],
  },
  {
    label: 'Pricebook',
    href: '/pricebook',
    icon: BookOpen,
    items: [
      { label: 'Services', href: '/pricebook?section=services', icon: Wrench, description: 'Service items' },
      { label: 'Materials', href: '/pricebook?section=materials', icon: Package, description: 'Material items' },
      { label: 'Equipment', href: '/pricebook?section=equipment', icon: Truck, description: 'Equipment items' },
      { label: 'Categories', href: '/pricebook?section=categories', icon: FolderTree, description: 'Manage categories' },
      { label: 'Vendors', href: '/pricebook?section=vendors', icon: Users, description: 'Vendor list' },
    ],
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
    items: [
      { label: 'All Tasks', href: '/tasks', icon: CheckSquare, description: 'Task list' },
      { label: 'My Tasks', href: '/tasks/mine', icon: User, description: 'Assigned to me' },
      { label: 'Calendar', href: '/tasks/calendar', icon: Calendar, description: 'Task calendar' },
    ],
  },
  {
    label: 'Automations',
    href: '/automations',
    icon: Zap,
    items: [
      { label: 'Workflows', href: '/automations', icon: Workflow, description: 'Automation workflows' },
      { label: 'AI Agents', href: '/automations/agents', icon: Bot, description: 'AI-powered agents' },
      { label: 'Webhooks', href: '/automations/webhooks', icon: Webhook, description: 'Webhook integrations' },
    ],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    items: [
      { label: 'General', href: '/settings', icon: Settings, description: 'General settings' },
      { label: 'Profile', href: '/settings/profile', icon: UserCog, description: 'Your profile' },
      { label: 'Team', href: '/settings/team', icon: Users, description: 'Team members' },
      { label: 'Security', href: '/settings/security', icon: Shield, description: 'Security settings' },
      { label: 'Appearance', href: '/settings/appearance', icon: Palette, description: 'Theme & display' },
      { label: 'Integrations', href: '/settings/integrations', icon: Database, description: 'Connected apps' },
    ],
  },
];

export function TopNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || user.email[0]}`.toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-6">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">PC</span>
          </div>
          <span className="font-semibold text-lg hidden sm:inline-block">Perfect Catch</span>
        </Link>

        {/* Main Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navConfig.map((nav) => {
              const isActive = pathname === nav.href || pathname.startsWith(`${nav.href}/`);
              
              return (
                <NavigationMenuItem key={nav.href}>
                  <NavigationMenuTrigger 
                    className={cn(
                      "h-9 px-3",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                  >
                    <nav.icon className="h-4 w-4 mr-2" />
                    {nav.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-1 p-2 md:w-[500px] md:grid-cols-2">
                      {nav.items.map((item) => (
                        <li key={item.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                pathname === item.href && "bg-accent"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 text-muted-foreground" />
                                <div className="text-sm font-medium leading-none">{item.label}</div>
                              </div>
                              <p className="line-clamp-1 text-xs leading-snug text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Navigation */}
        <div className="flex md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Menu
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {navConfig.map((nav) => (
                <DropdownMenuItem key={nav.href} asChild>
                  <Link href={nav.href} className="flex items-center">
                    <nav.icon className="h-4 w-4 mr-2" />
                    {nav.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
