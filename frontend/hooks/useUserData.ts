// hooks/useUserData.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface UserData {
  watchlist: string[];
  strategies: string[];
  portfolios: string[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

export function useUserData(): UserData {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [portfolios, setPortfolios] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      setStrategies([]);
      setPortfolios([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch watchlist
      const { data: watchlistData } = await supabase
        .from('watchlist')
        .select('ticker')
        .eq('user_id', user.id);

      // Fetch strategies
      const { data: strategiesData } = await supabase
        .from('strategies')
        .select('name, id')
        .eq('user_id', user.id);

      // Fetch portfolios
      const { data: portfoliosData } = await supabase
        .from('portfolios')
        .select('name, id')
        .eq('user_id', user.id);

      setWatchlist(watchlistData?.map(item => item.ticker) || []);
      setStrategies(strategiesData?.map(item => item.name) || []);
      setPortfolios(portfoliosData?.map(item => item.name) || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [user, refreshData]);

  return {
    watchlist,
    strategies,
    portfolios,
    isLoading,
    refreshData
  };
}