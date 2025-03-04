'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  LineChart,
  PieChart,
  ChevronRight,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { watchlist, strategies, portfolios, isLoading } = useUserData();

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-800 bg-gray-950 transition-all duration-300",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        {isExpanded ? (
          <h1 className="text-xl font-bold">FLApp</h1>
        ) : (
          <h1 className="text-xl font-bold">FL</h1>
        )}
      </div>

      <nav className="flex-1 space-y-2 py-4">
        {/* Assets Section */}
        <div className="px-3">
          <SidebarSection
            icon={<LineChart size={20} />}
            title="Assets"
            isExpanded={isExpanded}
            isActive={pathname.startsWith('/assets')}
            href="/assets"
          >
            {user ? (
              isLoading ? (
                <p className="px-4 py-2 text-sm text-gray-400">Loading...</p>
              ) : watchlist.length > 0 ? (
                watchlist.map((ticker) => (
                  <SidebarItem
                    key={ticker}
                    title={ticker}
                    href={`/assets/${ticker}`}
                    isExpanded={isExpanded}
                  />
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-gray-400">No saved assets</p>
              )
            ) : (
              <p className="px-4 py-2 text-sm text-gray-400">Log in to view your assets</p>
            )}
          </SidebarSection>
        </div>

        {/* Strategies Section */}
        <div className="px-3">
          <SidebarSection
            icon={<BarChart3 size={20} />}
            title="Strategies"
            isExpanded={isExpanded}
            isActive={pathname.startsWith('/strategy')}
            href="/strategy"
          >
            {user ? (
              isLoading ? (
                <p className="px-4 py-2 text-sm text-gray-400">Loading...</p>
              ) : strategies.length > 0 ? (
                strategies.map((strategy) => (
                  <SidebarItem
                    key={strategy}
                    title={strategy}
                    href={`/strategy/${strategy}`}
                    isExpanded={isExpanded}
                  />
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-gray-400">No saved strategies</p>
              )
            ) : (
              <p className="px-4 py-2 text-sm text-gray-400">Log in to view your strategies</p>
            )}
          </SidebarSection>
        </div>
        

        {/* Portfolios Section */}
        <div className="px-3">
          <SidebarSection
            icon={<PieChart size={20} />}
            title="Portfolios"
            isExpanded={isExpanded}
            isActive={pathname.startsWith('/portfolio')}
            href="/portfolio"
          >
            {user ? (
              isLoading ? (
                <p className="px-4 py-2 text-sm text-gray-400">Loading...</p>
              ) : portfolios.length > 0 ? (
                portfolios.map((portfolio) => (
                  <SidebarItem
                    key={portfolio}
                    title={portfolio}
                    href={`/portfolio/${portfolio}`}
                    isExpanded={isExpanded}
                  />
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-gray-400">No saved portfolios</p>
              )
            ) : (
              <p className="px-4 py-2 text-sm text-gray-400">Log in to view your portfolios</p>
            )}
          </SidebarSection>
        </div>
      </nav>

      {/* User section at the bottom */}
      <div className="border-t border-gray-800 p-3">
        {user ? (
          <div className="flex items-center gap-2">
            <User size={20} className="min-w-5" />
            {isExpanded && (
              <div className="flex flex-col">
                <span className="text-sm truncate max-w-[180px]">{user.email}</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-gray-400 justify-start"
                  onClick={() => signOut()}
                >
                  <LogOut size={14} className="mr-1" /> Sign out
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <LogIn size={20} className="min-w-5" />
              {isExpanded && <span className="ml-2">Sign in</span>}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function SidebarSection({
  icon,
  title,
  isExpanded,
  isActive,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  isExpanded: boolean;
  isActive: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible>
      <div className="flex">
        <Link 
          href={href}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white",
            isActive && "bg-gray-800 text-white"
          )}
        >
          <span>{icon}</span>
          {isExpanded && <span className="text-sm">{title}</span>}
        </Link>
        {isExpanded && (
          <CollapsibleTrigger className="px-1 flex items-center justify-center">
            <ChevronRight size={16} className="text-gray-400" />
          </CollapsibleTrigger>
        )}
      </div>
      {isExpanded && (
        <CollapsibleContent>
          <div className="mt-1">{children}</div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

function SidebarItem({
  title,
  href,
  isExpanded,
}: {
  title: string;
  href: string;
  isExpanded: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (!isExpanded) return null;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center py-2 px-8 rounded-md text-sm hover:bg-gray-800 hover:text-white",
        isActive ? "text-white" : "text-gray-400"
      )}
    >
      {title}
    </Link>
  );
}