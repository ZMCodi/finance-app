'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { DefaultService } from '@/src/api/services/DefaultService';
import { PortfolioSave_Input } from '@/src/api/models/PortfolioSave_Input';
import { supabase } from '@/lib/supabaseClient';

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { watchlist, portfolios, isLoading: dataIsLoading } = useUserData();

  const handlePortfolioClick = async (portfolioId: string) => {
    try {
      setIsLoading(portfolioId);
      
      // First, fetch the portfolio data from Supabase
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('state, id')
        .eq('name', portfolioId)
        .eq('user_id', user?.id)
        .single();
      
      if (portfolioError) {
        throw new Error(`Error fetching portfolio: ${portfolioError.message}`);
      }
      
      if (!portfolioData) {
        throw new Error(`Portfolio not found: ${portfolioId}`);
      }
      
      // Then, fetch the transactions for this portfolio
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioData.id);
      
      if (transactionsError) {
        throw new Error(`Error fetching transactions: ${transactionsError.message}`);
      }
      
      // Prepare the data in the format expected by the API
      const payload: PortfolioSave_Input = {
        state: portfolioData.state,
        transactions: transactionsData.map(transaction => ({
          type: transaction.type,
          asset: transaction.asset,
          shares: transaction.shares,
          value: transaction.value,
          profit: transaction.profit,
          date: transaction.date,
          id: parseInt(transaction.id)
        }))
      };
      
      // Load the portfolio data into the backend
      await DefaultService.loadPortfolioApiPortfolioPortfolioIdLoadPost(
        payload,
        portfolioId
      );
      
      // After successful loading, navigate to the portfolio page
      router.push(`/portfolio/${portfolioId}`);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      // You might want to show an error notification here
    } finally {
      setIsLoading(null);
    }
  };

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
              dataIsLoading ? (
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

        {/* Strategies Link (without dropdown) */}
        <div className="px-3">
          <Link 
            href="/strategy"
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white",
              pathname.startsWith('/strategy') && "bg-gray-800 text-white"
            )}
          >
            <BarChart3 size={20} />
            {isExpanded && <span className="text-sm">Strategies</span>}
          </Link>
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
              dataIsLoading ? (
                <p className="px-4 py-2 text-sm text-gray-400">Loading...</p>
              ) : portfolios.length > 0 ? (
                portfolios.map((portfolio) => (
                  <PortfolioItem
                    key={portfolio}
                    title={portfolio}
                    isExpanded={isExpanded}
                    isLoading={isLoading === portfolio}
                    onClick={() => handlePortfolioClick(portfolio)}
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

function PortfolioItem({
  title,
  isExpanded,
  isLoading,
  onClick,
}: {
  title: string;
  isExpanded: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === `/portfolio/${title}`;

  if (!isExpanded) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full justify-start py-2 px-8 rounded-md text-sm hover:bg-gray-800 hover:text-white",
        isActive ? "text-white" : "text-gray-400"
      )}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? "Loading..." : title}
    </Button>
  );
}